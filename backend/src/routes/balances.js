const express = require("express");
const Settlement = require("../models/Settlement");
const Expense = require("../models/Expense");
const Group = require("../models/Group");

const router = express.Router();

const round2 = (n) => Math.round(n * 100) / 100;

// Net balance per member: + means is owed money, - means owes
async function calcBalances(groupId) {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  const members = group.members.map((m) => m.toLowerCase());
  const net = Object.fromEntries(members.map((m) => [m, 0]));

  const expenses = await Expense.find({ groupId });
  for (const e of expenses) {
    if (net[e.paidBy] !== undefined) net[e.paidBy] += e.amount;
    for (const s of e.splits) {
      if (net[s.userId] !== undefined) net[s.userId] -= s.amount;
    }
  }

  const settlements = await Settlement.find({ groupId });
  for (const s of settlements) {
    // from pays to -> from's debt shrinks, to's credit shrinks
    if (net[s.from] !== undefined) net[s.from] += s.amount;
    if (net[s.to] !== undefined) net[s.to] -= s.amount;
  }

  for (const m of members) net[m] = round2(net[m]);
  return { group, net };
}

// Simplify: greedy match largest debtor to largest creditor
function simplify(net) {
  const debtors = [];
  const creditors = [];
  for (const [user, bal] of Object.entries(net)) {
    if (bal < -0.009) debtors.push({ user, amt: round2(-bal) });
    else if (bal > 0.009) creditors.push({ user, amt: round2(bal) });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = round2(Math.min(debtors[i].amt, creditors[j].amt));
    if (pay > 0.009) {
      transfers.push({
        from: debtors[i].user,
        to: creditors[j].user,
        amount: pay,
      });
    }
    debtors[i].amt = round2(debtors[i].amt - pay);
    creditors[j].amt = round2(creditors[j].amt - pay);
    if (debtors[i].amt <= 0.009) i++;
    if (creditors[j].amt <= 0.009) j++;
  }
  return transfers;
}

// GET /api/balances/:groupId -> simplified debts who owes whom
router.get("/:groupId", async (req, res) => {
  try {
    const { group, net } = await calcBalances(req.params.groupId);
    res.json({ group, balances: net, transfers: simplify(net) });
  } catch (err) {
    const code = err.message === "Group not found" ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

module.exports = { router, calcBalances };
