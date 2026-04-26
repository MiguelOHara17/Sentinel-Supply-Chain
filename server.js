require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { initFirebase } = require("./config/firebase");
const { initWebSocket, pushEvent } = require("./services/wsSimulator");
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const shipmentsRouter = require("./routes/shipments");
const disruptionsRouter = require("./routes/disruptions");
const alertsRouter = require("./routes/alerts");
const routesRouter = require("./routes/routes");
const { scoreAll } = require("./services/riskEngine");
const shipmentData = require("./data/shipments.json");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/shipments", shipmentsRouter);
app.use("/api/disruptions", disruptionsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/routes", routesRouter);

// ── Health ────────────────────────────────────────────────────────
const healthResponse = (req, res) => res.json({
  status: "ok",
  service: "Sentinel API",
  version: "2.0.0",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});
app.get("/health", healthResponse);
app.get("/api/health", healthResponse);

// ── Root ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ name: "Sentinel API", version: "2.0.0", status: "ok" });
});

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Init ──────────────────────────────────────────────────────────
initFirebase();
initWebSocket(server);

// ── CRON ──────────────────────────────────────────────────────────
cron.schedule("*/5 * * * *", () => {
  const scored = scoreAll(shipmentData);
  const highRisk = scored.filter(s => s.riskScore.level === "high");
  if (highRisk.length) {
    pushEvent("RISK_RESCORE", {
      message: highRisk.length + " shipments at high risk",
      shipments: highRisk.map(s => ({ id: s.id, score: s.riskScore.score })),
    });
  }
  console.log(`[CRON] Rescored ${scored.length}. High risk: ${highRisk.length}`);
});

// ── Start ─────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`✦ SENTINEL running on port ${PORT}`);
  console.log(`  → Health: http://localhost:${PORT}/health`);
  console.log(`  → WS: ws://localhost:${PORT}`);
});