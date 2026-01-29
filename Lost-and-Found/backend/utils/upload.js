const multer = require("multer");
const path = require("path");
const fs = require("fs");

const publicUploadDir = path.join(__dirname, "../../frontend/public/uploads");

if (!fs.existsSync(publicUploadDir)) {
  fs.mkdirSync(publicUploadDir, { recursive: true });
  console.log(`Created directory: ${publicUploadDir}`);
} else {
  console.log(`Directory already exists: ${publicUploadDir}`);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, publicUploadDir); 
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Check file type (Allow only images)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif) are allowed!"), false); // Reject the file
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
