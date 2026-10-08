require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const groupsRouter = require("./routes/groups");
const expensesRouter = require("./routes/expenses");
const settleRouter = require("./routes/settle");
const { router: balancesRouter } = require("./routes/balances");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.set("io", io);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/groups", groupsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/settle", settleRouter);
app.use("/api/balances", balancesRouter);

// Socket: join groupId room, broadcast new expense to group
io.on("connection", (socket) => {
  socket.on("join", (groupId) => {
    if (groupId) socket.join(`group:${groupId}`);
  });
  socket.on("leave", (groupId) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });
});

const rawPort = Number(process.env.PORT);
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 3001;
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/splitwise";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`API + socket.io listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
