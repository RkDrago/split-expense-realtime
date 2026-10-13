require("dotenv").config();
const mongoose = require("mongoose");
const Group = require("./models/Group");
const Expense = require("./models/Expense");

const demoOwner = "demo@example.com";
const memberPool = [
  demoOwner,
  "alice@example.com",
  "bob@example.com",
  "carol@example.com",
  "david@example.com",
  "eve@example.com",
];

function equalSplits(members, amount) {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / members.length);
  const remainder = cents % members.length;
  return members.map((userId, index) => ({
    userId,
    amount: (base + (index < remainder ? 1 : 0)) / 100,
  }));
}

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured");
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Group.find({ name: /^Demo Group [1-5]$/ }).select("_id");
  if (existing.length) {
    await Expense.deleteMany({ groupId: { $in: existing.map((group) => group._id) } });
    await Group.deleteMany({ _id: { $in: existing.map((group) => group._id) } });
  }

  const groups = await Group.create(
    Array.from({ length: 5 }, (_, index) => ({
      name: `Demo Group ${index + 1}`,
      type: index % 2 === 0 ? "trip" : "flat",
      members: memberPool.slice(0, index % 2 === 0 ? 5 : 6),
      createdBy: demoOwner,
      inviteCode: `demo${index + 1}`,
    }))
  );

  await Expense.create(
    groups.flatMap((group, index) => {
      const members = group.members;
      const amount = 100 + index * 50;
      return [
        {
          groupId: group._id,
          paidBy: members[(index + 1) % members.length],
          amount,
          category: "food",
          description: `Demo expense ${index + 1}`,
          splitType: "equal",
          splits: equalSplits(members, amount),
        },
        {
          groupId: group._id,
          paidBy: members[(index + 2) % members.length],
          amount: amount + 25,
          category: "travel",
          description: `Demo travel expense ${index + 1}`,
          splitType: "equal",
          splits: equalSplits(members, amount + 25),
        },
      ];
    })
  );

  console.log("Created 5 demo groups with 5-6 members and 10 demo expenses.");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Demo seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
