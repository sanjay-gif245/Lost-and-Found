const mongoose = require("mongoose");

const verificationQuestionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
    unique: true,
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
        minlength: 5,
      },
      answer: {
        type: String,
        required: true,
        minlength: 1,
      },
    },
  ],
});

module.exports =
  mongoose.models.VerificationQuestion ||
  mongoose.model("VerificationQuestion", verificationQuestionSchema);
