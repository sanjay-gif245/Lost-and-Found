require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();

const connectDB = require("./config/db");

connectDB();

const publicUploadDir = path.join(__dirname, "../frontend/public/uploads");
if (!fs.existsSync(publicUploadDir)) {
  fs.mkdirSync(publicUploadDir, { recursive: true });
  console.log(`[App.js] Created directory: ${publicUploadDir}`);
}

const privateUploadsDir = path.join(__dirname, "private/uploads");
if (!fs.existsSync(privateUploadsDir)) {
  fs.mkdirSync(privateUploadsDir, { recursive: true });
  console.log(`[App.js] Created directory: ${privateUploadsDir}`);
}

app.use(cors());
app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../frontend/public/uploads"))
);

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const claimRoutes = require("./routes/claims");

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

app.get("/secure-image/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const token = req.query.token;

    if (!token) {
      console.log(`Secure Image: No token provided for ${filename}`);
      return res
        .status(401)
        .sendFile(
          path.join(__dirname, "../frontend/public/images/placeholder.jpg"),
          (err) => {
            if (err) {
              console.error("Error sending placeholder:", err);
              res.status(404).send("Placeholder not found");
            }
          }
        );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      console.log(
        `Secure Image: Invalid token for ${filename}`,
        verifyError.message
      );
      return res
        .status(403)
        .sendFile(
          path.join(__dirname, "../frontend/public/images/placeholder.jpg"),
          (err) => {
            if (err) res.status(404).send("Placeholder not found");
          }
        );
    }

    const itemIdMatch = filename.match(/^([a-f\d]{24})/i);
    const itemId = itemIdMatch ? itemIdMatch[1] : null;

    if (!itemId) {
      console.log(`Secure Image: Could not extract itemId from ${filename}`);
      return res
        .status(400)
        .sendFile(
          path.join(__dirname, "../frontend/public/images/placeholder.jpg"),
          (err) => {
            if (err) res.status(404).send("Placeholder not found");
          }
        );
    }

    const { hasImageAccess } = require("./controllers/claimController");
    const hasAccess = await hasImageAccess(decoded.id, itemId);

    const imagePath = path.join(privateUploadsDir, filename);

    if (hasAccess && fs.existsSync(imagePath)) {
      console.log(
        `Secure Image: Access granted for ${filename} to user ${decoded.id}`
      );
      return res.sendFile(imagePath);
    } else {
      if (!hasAccess)
        console.log(
          `Secure Image: Access denied for ${filename} to user ${decoded.id}`
        );
      if (!fs.existsSync(imagePath))
        console.log(`Secure Image: File not found at ${imagePath}`);

      return res
        .status(403)
        .sendFile(
          path.join(__dirname, "../frontend/public/images/placeholder.jpg"),
          (err) => {
            if (err) res.status(404).send("Placeholder not found");
          }
        );
    }
  } catch (error) {
    console.error("Secure Image Endpoint Error:", error);
    return res
      .status(500)
      .sendFile(
        path.join(__dirname, "../frontend/public/images/placeholder.jpg"),
        (err) => {
          if (err) res.status(500).send("Server error retrieving image");
        }
      );
  }
});

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*", (req, res) => {
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "../frontend/home.html"));
  } else {
    res.status(404).json({ success: false, message: "API endpoint not found" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled Error Reached Final Handler:", err);

  if (req.originalUrl.startsWith("/api")) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  } else {
    res.status(err.status || 500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
