// routes/items.js
const express = require("express");
const router = express.Router();
const {
  getItems,
  createItem,
  getUserItems,
  deleteItem,
  getItemResponses,
  getClaimedItems,
  getClaimedItemDetails,
  getItemDetails, 
} = require("../controllers/itemController");
const { protect } = require("../middleware/auth");
const upload = require("../utils/upload"); 

router.get("/", getItems);

router.post("/", protect, upload.single("image"), createItem);

router.get("/user", protect, getUserItems);

router.get("/claimed", protect, getClaimedItems);

router.get("/claimed/:itemId", protect, getClaimedItemDetails);

router.get("/details/:itemId", protect, getItemDetails);

router.get("/:itemId/responses", protect, getItemResponses);

router.delete("/:itemId", protect, deleteItem);

module.exports = router;
