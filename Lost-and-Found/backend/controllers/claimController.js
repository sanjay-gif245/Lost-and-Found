const Claim = require("../models/Claim");
const VerificationQuestion = require("../models/VerificationQuestion");
const Item = require("../models/Item");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

exports.getVerificationQuestions = async (req, res) => {
  try {
    const itemId = req.params.itemId;

    const item = await Item.findById(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    const verificationData = await VerificationQuestion.findOne({ itemId });
    if (!verificationData) {
      return res.status(404).json({
        success: false,
        message: "No verification questions found for this item",
      });
    }

    const questionsWithoutAnswers = verificationData.questions.map((q) => ({
      id: q._id,
      question: q.question,
    }));

    res.status(200).json({ success: true, questions: questionsWithoutAnswers });
  } catch (error) {
    console.error("Error fetching verification questions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitClaim = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { responses: userResponses } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    if (item.user.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot claim an item that you posted.",
      });
    }
    const verificationData = await VerificationQuestion.findOne({ itemId });
    if (!verificationData) {
      return res.status(404).json({
        success: false,
        message: "Verification questions for this item could not be found.",
      });
    }
    const questionTextMap = verificationData.questions.reduce((map, q) => {
      map[q._id.toString()] = q.question;
      return map;
    }, {});

    const existingClaim = await Claim.findOne({
      itemId,
      claimantId: req.user.id,
      status: { $in: ["pending", "approved"] },
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a claim for this item",
      });
    }

    const formattedResponses = userResponses
      .map((userResponse) => {
        const questionText = questionTextMap[userResponse.questionId];

        if (!questionText) {
          console.warn(
            `Question text not found for ID: ${userResponse.questionId} during claim submission for item ${itemId}`
          );
        }

        return {
          questionId: userResponse.questionId,
          question: questionText || "Question not found",
          answer: userResponse.response,
        };
      })
      .filter((response) => response.question !== "Question not found");

    if (formattedResponses.length !== userResponses.length) {
      console.warn(
        `Some responses were discarded for item ${itemId} claim due to missing original questions.`
      );
    }
    if (formattedResponses.length === 0 && userResponses.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Could not match any of your answers to the item's verification questions. Please try again or contact support.",
      });
    }
    const newClaim = new Claim({
      itemId,
      claimantId: req.user.id,
      responses: formattedResponses,
    });

    await newClaim.save();

    const itemOwner = await User.findById(item.user);
    if (itemOwner) {
      console.log(
        `Notification would be sent to ${itemOwner.email} regarding claim for item ${item.name}`
      );
    } else {
      console.warn(
        `Item owner not found for item ${itemId} during claim submission.`
      );
    }

    res.status(201).json({
      success: true,
      message:
        "Claim submitted successfully. The item owner will review your answers.",
    });
  } catch (error) {
    console.error("Error submitting claim:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while submitting the claim.",
    });
  }
};

exports.getMySubmittedClaims = async (req, res) => {
  try {
    const submittedClaims = await Claim.find({ claimantId: req.user.id })
      .populate(
        "itemId",
        "name category description date time location image type"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: submittedClaims.length,
      data: submittedClaims,
    });
  } catch (error) {
    console.error("Error fetching user's submitted claims:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch submitted claims" });
  }
};

exports.getMyItemClaims = async (req, res) => {
  try {
    const myItems = await Item.find({ user: req.user.id }).select("_id");
    const myItemIds = myItems.map((item) => item._id);

    const pendingClaims = await Claim.find({
      itemId: { $in: myItemIds },
      status: "pending",
    })
      .populate("claimantId", "name email phone")
      .populate("itemId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingClaims.length,
      data: pendingClaims,
    });
  } catch (error) {
    console.error("Error in getMyItemClaims controller:", error);
    res.status(500).json({
      success: false,
      message: `Failed to get item claims: ${error.message}`,
    });
  }
};

exports.verifyClaim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status provided" });
    }

    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res
        .status(404)
        .json({ success: false, message: "Claim not found" });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This claim has already been ${claim.status}.`,
      });
    }

    const item = await Item.findById(claim.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Associated item not found",
      });
    }
    if (item.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to verify this claim",
      });
    }

    claim.status = status;
    await claim.save();

    if (status === "approved") {
      await Item.findByIdAndUpdate(claim.itemId, {
        status: "claimed",
        claimedBy: claim.claimantId,
      });
    }

    res.status(200).json({
      success: true,
      message: `Claim ${status} successfully`,
      updatedClaim: claim,
    });
  } catch (error) {
    console.error("Error verifying claim:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClaimedItemsDetails = async (req, res) => {
  try {
    const approvedClaims = await Claim.find({
      claimantId: req.user.id,
      status: "approved",
    }).populate({
      path: "itemId",
      populate: {
        path: "user",
        select: "name email phone",
      },
    });

    const claimedItems = approvedClaims
      .map((claim) => claim.itemId)
      .filter((item) => item != null);

    res.status(200).json({
      success: true,
      count: claimedItems.length,
      data: claimedItems,
    });
  } catch (error) {
    console.error("Error fetching user's claimed items details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.hasImageAccess = async (userId, itemId) => {
  try {
    const item = await Item.findById(itemId);

    if (!item) return false;

    if (item.user.toString() === userId) {
      return true;
    }

    const approvedClaim = await Claim.findOne({
      itemId: itemId,
      claimantId: userId,
      status: "approved",
    });

    return !!approvedClaim;
  } catch (error) {
    console.error("Error checking image access:", error);
    return false;
  }
};
