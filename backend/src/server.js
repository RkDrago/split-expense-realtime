require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Group = require("./models/Group");

const groupsRouter = require("./routes/groups");
const expensesRouter = require("./routes/expenses");
const settleRouter = require("./routes/settle");
const { router: balancesRouter } = require("./routes/balances");

const app = express();
const server = http.createServer(app);
const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : ["http://localhost:3000"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin is not allowed"));
  },
  methods: ["GET", "POST", "OPTIONS"],
};

const io = new Server(server, {
  cors: corsOptions,
});
app.set("io", io);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, database: mongoose.connection.readyState === 1 })
);
app.get("/api/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready });
});
app.use("/api/groups", groupsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/settle", settleRouter);
app.use("/api/balances", balancesRouter);

// Socket: join groupId room, broadcast new expense to group
io.on("connection", (socket) => {
  socket.on("join", async (groupId, acknowledge) => {
    try {
      if (!mongoose.isValidObjectId(groupId)) {
        if (typeof acknowledge === "function") acknowledge({ ok: false });
        return;
      }
      const group = await Group.exists({ _id: groupId });
      if (!group) {
        if (typeof acknowledge === "function") acknowledge({ ok: false });
        return;
      }
      socket.join(`group:${groupId}`);
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    } catch (err) {
      console.error("Socket room join failed:", err.message);
      if (typeof acknowledge === "function") acknowledge({ ok: false });
    }
  });
  socket.on("leave", (groupId) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  if (err.message === "Origin is not allowed") {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error("Unhandled request error:", err);
  return res.status(500).json({ error: "Internal server error" });
});

async function start() {
  const rawPort = Number(process.env.PORT);
  const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 3001;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI must be configured");

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  });
  server.listen(port, () => {
    console.log(`API + socket.io listening on port ${port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
  console.error("Server startup failed:", err.message);
  process.exit(1);
});

module.exports = { app, server, io };
