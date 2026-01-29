const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    category: {
      type: String,
      enum: [
        "electronics",
        "personal_belongings",
        "documents",
        "clothing",
        "accessories",
        "keys",
        "bags",
        "jewelry",
        "eyewear",
        "umbrellas",
        "chargers",
        "headphones",
        "water_bottles",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    date: {
      type: Date,
      required: true,
      max: Date.now,
    },
    time: {
      type: String,
      required: true,
      match: [/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"],
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    image: String,
    status: {
      type: String,
      enum: ["open", "pending_claim", "claimed"],
      default: "open",
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
