const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

settlementSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model("Settlement", settlementSchema);
