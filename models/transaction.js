const mongoose = require("mongoose");
const { RESOURCE } = require("../constants/index");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Please enter a user"],
    ref: "User",
  },
  cameras: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please enter a camera"],
      ref: "Camera",
    },
  ],
  status: {
    type: String,
    default: "pending",
    enum: {
      values: ["pending", "paid", "not paid", "cancelled"],
    },
  },
  date: {
    type: Date,
    required: [true, "Please enter a date"],
  },
});

module.exports = mongoose.model(RESOURCE.TRANSACTION, transactionSchema);
