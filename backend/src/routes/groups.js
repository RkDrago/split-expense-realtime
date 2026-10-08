const express = require("express");
const crypto = require("crypto");
const Group = require("../models/Group");

const router = express.Router();

// POST /api/groups/create - name, type, members -> Group
router.post("/create", async (req, res) => {
  try {
    const { name, type, members = [], createdBy = "" } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "Name is required" });

    const cleaned = [
      ...new Set(
        members
          .map((m) => String(m).trim().toLowerCase())
          .filter(Boolean)
          .concat(createdBy ? [createdBy.toLowerCase()] : [])
      ),
    ];

    const inviteCode = crypto.randomBytes(4).toString("hex");
    const group = await Group.create({
      name: name.trim(),
      type: type === "flat" ? "flat" : "trip",
      members: cleaned,
      createdBy: createdBy || cleaned[0] || "",
      inviteCode,
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/list?userId=
router.get("/list", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId
      ? { members: String(userId).toLowerCase() }
      : {};
    const groups = await Group.find(filter).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id
router.get("/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/join - inviteCode, userId -> adds member
router.post("/join", async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;
    if (!inviteCode || !userId)
      return res
        .status(400)
        .json({ error: "inviteCode and userId are required" });
    const group = await Group.findOne({ inviteCode: String(inviteCode) });
    if (!group) return res.status(404).json({ error: "Invalid invite code" });
    const email = String(userId).toLowerCase();
    if (!group.members.includes(email)) {
      group.members.push(email);
      await group.save();
    }
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
