const express = require("express");
const Settlement = require("../models/Settlement");
const Group = require("../models/Group");
const { isObjectId, normalizeEmail, round2 } = require("../lib/validation");

const router = express.Router();

// POST /api/settle/create - groupId, from, to, amount -> Settlement
router.post("/create", async (req, res) => {
  try {
    const { groupId, from, to, amount } = req.body;
    if (!groupId || !from || !to)
      return res
        .status(400)
        .json({ error: "groupId, from and to are required" });
    if (!isObjectId(groupId))
      return res.status(400).json({ error: "Invalid group id" });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 100000000)
      return res.status(400).json({ error: "Amount must be positive" });
    if (String(from).toLowerCase() === String(to).toLowerCase())
      return res.status(400).json({ error: "from and to must differ" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const payer = normalizeEmail(from);
    const payee = normalizeEmail(to);
    if (!payer || !payee)
      return res
        .status(400)
        .json({ error: "Settlement parties must be valid emails" });
    if (!group.members.includes(payer) || !group.members.includes(payee))
      return res
        .status(400)
        .json({ error: "Settlement parties must be group members" });

    const settlement = await Settlement.create({
      groupId,
      from: payer,
      to: payee,
      amount: round2(amt),
      status: "completed",
    });

    const io = req.app.get("io");
    if (io)
      io.to(`group:${groupId}`).emit(`group:${groupId}:settlement`, settlement);
    if (io) io.to(`group:${groupId}`).emit(`group:${groupId}:updated`);

    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settle/list?groupId=
router.get("/list", async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" });
    if (!isObjectId(groupId))
      return res.status(400).json({ error: "Invalid group id" });
    const settlements = await Settlement.find({ groupId }).sort({
      createdAt: -1,
    });
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
