const express = require("express");
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { isObjectId, normalizeEmail, round2 } = require("../lib/validation");

const router = express.Router();

// Build splits from splitType + request payload
function buildSplits(group, { amount, splitType, splits = [], participants }) {
  const members = (
    participants && participants.length ? participants : group.members
  )
    .map((m) => String(m).toLowerCase())
    .filter(Boolean);
  if (!members.length) throw new Error("No members to split with");
  if (new Set(members).size !== members.length)
    throw new Error("Participants must be unique");
  if (members.some((member) => !group.members.includes(member)))
    throw new Error("Participants must use group members");

  if (splitType === "unequal" || splitType === "percent") {
    const given = Array.isArray(splits) ? splits.filter((s) => s && s.userId) : [];
    if (!given.length) throw new Error("Splits are required");
    if (given.some((s) => !members.includes(String(s.userId).toLowerCase())))
      throw new Error("Splits must use group members");
    if (
      new Set(given.map((s) => String(s.userId).toLowerCase())).size !==
      given.length
    )
      throw new Error("Splits must be unique");
    if (splitType === "percent") {
      if (given.some((s) => !Number.isFinite(Number(s.percent)) || Number(s.percent) < 0))
        throw new Error("Percents must be non-negative numbers");
      const totalPct = round2(
        given.reduce((a, s) => a + (Number(s.percent) || 0), 0)
      );
      if (Math.abs(totalPct - 100) > 0.01)
        throw new Error("Percents must add up to 100");
      return given.map((s) => ({
        userId: String(s.userId).toLowerCase(),
        percent: round2(Number(s.percent)),
        amount: round2((amount * Number(s.percent)) / 100),
      }));
    }
    if (given.some((s) => !Number.isFinite(Number(s.amount)) || Number(s.amount) < 0))
      throw new Error("Split amounts must be non-negative numbers");
    const total = round2(
      given.reduce((a, s) => a + (Number(s.amount) || 0), 0)
    );
    if (Math.abs(total - amount) > 0.01)
      throw new Error(`Splits must add up to ${amount}`);
    return given.map((s) => ({
      userId: String(s.userId).toLowerCase(),
      amount: round2(Number(s.amount)),
    }));
  }

  // equal split across members, remainder pennies to the first payer included
  const base = Math.floor((amount / members.length) * 100) / 100;
  let remainder = round2(amount - base * members.length);
  return members.map((m, i) => ({
    userId: m,
    amount: i === 0 ? round2(base + remainder) : base,
  }));
}

// POST /api/expenses/create
router.post("/create", async (req, res) => {
  try {
    const {
      groupId,
      paidBy,
      amount,
      category,
      splitType,
      splits,
      participants,
      description,
    } = req.body;
    if (!groupId || !paidBy)
      return res.status(400).json({ error: "groupId and paidBy are required" });
    if (!isObjectId(groupId))
      return res.status(400).json({ error: "Invalid group id" });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 100000000)
      return res.status(400).json({ error: "Amount must be positive" });
    const payer = normalizeEmail(paidBy);
    if (!payer)
      return res.status(400).json({ error: "paidBy must be a valid email" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(payer))
      return res.status(403).json({ error: "paidBy must be a group member" });

    const finalSplitType = ["equal", "unequal", "percent"].includes(splitType)
      ? splitType
      : "equal";
    const built = buildSplits(group, {
      amount: amt,
      splitType: finalSplitType,
      splits,
      participants,
    });

    const expense = await Expense.create({
      groupId,
      paidBy: payer,
      amount: amt,
      category: category || "general",
      description: description || "",
      splitType: finalSplitType,
      splits: built,
    });

    const io = req.app.get("io");
    if (io) io.to(`group:${groupId}`).emit(`group:${groupId}:expense`, expense);
    if (io) io.to(`group:${groupId}`).emit(`group:${groupId}:updated`);

    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/expenses/list?groupId=
router.get("/list", async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId)
      return res.status(400).json({ error: "groupId is required" });
    if (!isObjectId(groupId))
      return res.status(400).json({ error: "Invalid group id" });
    const expenses = await Expense.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/history?userId=&groupId=&category= (activity feed)
router.get("/history", async (req, res) => {
  try {
    const { userId, groupId, category } = req.query;
    const filter = {};
    if (groupId) {
      if (!isObjectId(groupId))
        return res.status(400).json({ error: "Invalid group id" });
      filter.groupId = groupId;
    }
    if (category) filter.category = category;
    if (userId) {
      const groups = await Group.find({ members: String(userId).toLowerCase() });
      filter.groupId = groupId
        ? groupId
        : { $in: groups.map((g) => g._id) };
    }
    const expenses = await Expense.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
