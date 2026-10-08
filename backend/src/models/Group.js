const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["trip", "flat"], default: "trip" },
    members: [{ type: String, trim: true }], // member emails (userId)
    createdBy: { type: String, trim: true },
    inviteCode: { type: String, unique: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
