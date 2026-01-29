const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");
const { protect } = require("../middleware/auth");

router.get(
  "/items/:itemId/questions",
  protect,
  claimController.getVerificationQuestions
);

router.get("/my-claims", protect, claimController.getMySubmittedClaims);

router.post("/items/:itemId/claim", protect, claimController.submitClaim);

router.get("/my-items-claims", protect, claimController.getMyItemClaims);

router.put("/claims/:claimId/verify", protect, claimController.verifyClaim);

router.get("/claimed-items", protect, claimController.getClaimedItemsDetails);

module.exports = router;
