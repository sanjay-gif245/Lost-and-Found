const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, `item-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpe?g|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) return cb(null, true);
  cb(new Error("Only images (JPEG/PNG) are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5000000 }, // 5MB limit
});

exports.uploadItemImage = upload.single("image");
