const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
    index: true,
  },
  paidBy: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, default: "general" },
  description: { type: String, default: "" },
  splitType: {
    type: String,
    enum: ["equal", "unequal", "percent"],
    default: "equal",
  },
  splits: [{ userId: String, amount: Number, percent: Number }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Expense", expenseSchema);
