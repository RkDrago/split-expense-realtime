const express = require("express");
const Settlement = require("../models/Settlement");
const { calcBalances } = require("./balances");

const router = express.Router();

// POST /api/settle/create - groupId, from, to, amount -> Settlement
router.post("/create", async (req, res) => {
  try {
    const { groupId, from, to, amount } = req.body;
    if (!groupId || !from || !to)
      return res
        .status(400)
        .json({ error: "groupId, from and to are required" });
    const amt = Number(amount);
    if (!amt || amt <= 0 || Number.isNaN(amt))
      return res.status(400).json({ error: "Amount must be positive" });
    if (String(from).toLowerCase() === String(to).toLowerCase())
      return res.status(400).json({ error: "from and to must differ" });

    const settlement = await Settlement.create({
      groupId,
      from: String(from).toLowerCase(),
      to: String(to).toLowerCase(),
      amount: amt,
      status: "completed",
    });

    const io = req.app.get("io");
    if (io)
      io.to(`group:${groupId}`).emit(`group:${groupId}:settlement`, settlement);

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
    const settlements = await Settlement.find({ groupId }).sort({
      createdAt: -1,
    });
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
