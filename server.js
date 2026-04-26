require("dotenv").config();
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
const PORT = process.env.PORT || 3001;

// ── CORS — allow all origins ──────────────────────────────────────
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

// ── Health check — available at BOTH /health and /api/health ─────
const healthResponse = (req, res) => res.json({
  status: "ok",
  service: "Sentinel API",
  version: "2.0.0",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});
app.get("/health", healthResponse);
app.get("/api/health", healthResponse);

// ── Root ─────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Sentinel API",
    version: "2.0.0",
    status: "ok",
    endpoints: {
      "GET /health": "Health check",
      "GET /api/health": "Health check (alias)",
      "GET /api/shipments": "All shipments with risk scores",
      "GET /api/shipments/:id": "Single shipment",
      "PATCH /api/shipments/:id/status": "Update shipment status",
      "GET /api/disruptions": "All disruptions",
      "POST /api/disruptions": "Create disruption",
      "PATCH /api/disruptions/:id/resolve": "Resolve disruption",
      "GET /api/alerts": "Smart risk alerts",
      "GET /api/routes/optimize/:id": "Route recommendation",
      "POST /api/routes/analyze": "Gemini AI analysis",
      "GET /api/routes/optimize-all": "All at-risk recommendations",
      "WS ws://localhost:3002": "Live event stream",
    },
  });
});

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Init Firebase + WebSocket ─────────────────────────────────────
initFirebase();
initWebSocket(process.env.WS_PORT || 3002);

// ── CRON: Rescore every 5 min ─────────────────────────────────────
cron.schedule("*/5 * * * *", () => {
  const scored = scoreAll(shipmentData);
  const highRisk = scored.filter(s => s.riskScore.level === "high");
  if (highRisk.length) {
    pushEvent("RISK_RESCORE", {
      message: highRisk.length + " shipments at high risk",
      shipments: highRisk.map(s => ({ id: s.id, score: s.riskScore.score })),
    });
  }
  console.log(`[CRON] Rescored ${scored.length} shipments. High risk: ${highRisk.length}`);
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("  ✦ SENTINEL BACKEND RUNNING");
  console.log(`  → REST API : http://localhost:${PORT}`);
  console.log(`  → Health   : http://localhost:${PORT}/health`);
  console.log(`  → WS Stream: ws://localhost:${process.env.WS_PORT || 3002}`);
  console.log(`  → API Docs : http://localhost:${PORT}/`);
  console.log("");
});
