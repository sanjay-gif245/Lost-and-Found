const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
      });
    }

    next();
  } catch (error) {
    let message = "Token is not valid";
    if (error.name === "JsonWebTokenError") {
      message = "Invalid token signature.";
    } else if (error.name === "TokenExpiredError") {
      message = "Token has expired, please log in again.";
    } else {
      message = "Authorization failed due to token error.";
    }

    return res.status(401).json({
      success: false,
      message: message,
    });
  }
};
