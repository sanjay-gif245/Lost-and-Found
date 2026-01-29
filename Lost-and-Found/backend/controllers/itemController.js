const Item = require("../models/Item");
const User = require("../models/User");
const Claim = require("../models/Claim");
const VerificationQuestion = require("../models/VerificationQuestion");

exports.createItem = async (req, res) => {
  try {
    const { name, category, description, date, time, location, type } =
      req.body;

    const newItemData = {
      name,
      category,
      description,
      date: new Date(date),
      time,
      location,
      type,
      user: req.user.id,
      image: req.file ? req.file.filename : null,
    };

    const newItem = new Item(newItemData);
    const savedItem = await newItem.save();

    if (type === "found") {
      if (!req.body.questions) {
        return res.status(400).json({
          success: false,
          message: "Verification questions are required for found items.",
        });
      }

      let questions;
      try {
        questions = JSON.parse(req.body.questions);
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Invalid or empty questions array.");
        }
        if (questions.some((q) => !q.question || !q.answer)) {
          throw new Error(
            "Each question must have a 'question' and 'answer' field."
          );
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: `Invalid questions format: ${e.message}`,
        });
      }

      const verificationQuestions = new VerificationQuestion({
        itemId: savedItem._id,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
        })),
      });
      await verificationQuestions.save();
    }

    await User.findByIdAndUpdate(req.user.id, {
      $push: { itemsReported: savedItem._id },
    });

    res.status(201).json({
      success: true,
      item: savedItem,
    });
  } catch (error) {
    console.error("Item creation error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to create item: ${error.message}`,
    });
  }
};

exports.getItems = async (req, res) => {
  try {
    const { search, category, type } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (category && category !== "All Categories") {
      query.category = category;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    const items = await Item.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to get items: ${error.message}`,
    });
  }
};
exports.getUserItems = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { user: req.user.id };

    if (type) {
      query.type = type;
    }

    const items = await Item.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get user items error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to get user items: ${error.message}`,
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (item.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this item.",
      });
    }

    await Claim.deleteMany({ itemId: itemId });
    await VerificationQuestion.deleteOne({ itemId: itemId });

    await Item.findByIdAndDelete(itemId);

    await User.findByIdAndUpdate(userId, { $pull: { itemsReported: itemId } });

    res.status(200).json({
      success: true,
      message: "Item and associated data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete item error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item ID format" });
    }
    res.status(500).json({
      success: false,
      message: `Failed to delete item: ${error.message}`,
    });
  }
};

exports.getItemResponses = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user.id;

    const item = await Item.findById(itemId);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    if (item.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view responses for this item.",
      });
    }
    const claims = await Claim.find({ itemId: itemId })
      .populate("claimantId", "name email phone")
      .select("claimantId responses status createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: claims,
    });
  } catch (error) {
    console.error("Get item responses error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item ID format" });
    }
    res.status(500).json({
      success: false,
      message: `Failed to get item responses: ${error.message}`,
    });
  }
};

exports.getClaimedItems = async (req, res) => {
  try {
    const claimedItems = await Item.find({
      claimedBy: req.user.id,
      status: "claimed",
    })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: claimedItems.length,
      data: claimedItems,
    });
  } catch (error) {
    console.error("Get claimed items error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to get claimed items: ${error.message}`,
    });
  }
};

exports.getClaimedItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const item = await Item.findById(itemId).populate(
      "user",
      "name email phone"
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    if (item.status !== "claimed" || item.claimedBy?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view these claimed item details.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: item._id,
        name: item.name,
        category: item.category,
        description: item.description,
        date: item.date,
        time: item.time,
        location: item.location,
        status: item.status,
        image: item.image,
        postedBy: {
          name: item.user.name,
          email: item.user.email,
          phone: item.user.phone,
        },
      },
    });
  } catch (error) {
    console.error("Get claimed item details error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item ID format" });
    }
    res.status(500).json({
      success: false,
      message: `Failed to get claimed item details: ${error.message}`,
    });
  }
};

exports.getItemDetails = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId).populate(
      "user",
      "name email phone"
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Get item details error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item ID format" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server error fetching item details" });
  }
};
