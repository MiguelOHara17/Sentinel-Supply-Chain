const WebSocket = require("ws");
let wss = null;
const clients = new Set();

function initWebSocket(port = 3002) {
  wss = new WebSocket.Server({
    port,
    perMessageDeflate: false,
    clientTracking: true,
    verifyClient: () => true,  // allow all origins including file://
  });

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total: ${clients.size}`);
    ws.send(JSON.stringify({
      type: "CONNECTED",
      payload: { message: "Sentinel WS connected" },
      timestamp: new Date().toISOString(),
    }));
    ws.on("close", () => { clients.delete(ws); console.log(`[WS] Client disconnected. Total: ${clients.size}`); });
    ws.on("error", (err) => { clients.delete(ws); console.error("[WS] Error:", err.message); });
  });

  wss.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[WS] Port ${port} in use. Kill existing process: taskkill /IM node.exe /F`);
    } else {
      console.error("[WS] Server error:", err.message);
    }
  });

  // Live event every 8 seconds
  setInterval(() => {
    if (!clients.size) return;
    const ships = ["SHP-4821","SHP-3302","SHP-5514","SHP-2987","SHP-6641","SHP-1173"];
    const types = ["SHIPMENT_UPDATE","ROUTE_REROUTED","ALERT_CLEARED"];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = ships[Math.floor(Math.random() * ships.length)];
    const payloads = {
      SHIPMENT_UPDATE: { shipmentId: id, update: "Position updated", riskDelta: (Math.random() > .5 ? 1 : -1) * Math.floor(Math.random() * 8) },
      ROUTE_REROUTED:  { shipmentId: id, newRoute: "Alternate corridor activated", delaySaved: Math.floor(Math.random() * 20) + 4 },
      ALERT_CLEARED:   { shipmentId: id, message: "Disruption resolved. Back on schedule." },
    };
    broadcast({ type, payload: payloads[type], timestamp: new Date().toISOString() });
  }, 8000);

  console.log(`[WS] Server running on ws://localhost:${port}`);
  return wss;
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

function pushEvent(type, payload) {
  broadcast({ type, payload, timestamp: new Date().toISOString() });
}

module.exports = { initWebSocket, pushEvent };
