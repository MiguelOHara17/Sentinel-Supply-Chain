# Sentinel, Smart Supply Chain Monitor

> **Google Solution Challenge 2026** | UN SDG 9, Industry, Innovation & Infrastructure

Sentinel is an AI-powered supply chain disruption intelligence platform that detects, analyzes, and resolves global shipping disruptions in real time using Google's Gemini AI.

![Sentinel Dashboard](./screenshot.png)


## Problem Statement

Global supply chains lose **$1.5 trillion annually** due to disruptions from port congestion, extreme weather, carrier failures, and geopolitical events. Traditional monitoring tools react after a disruption occurs. Logistics teams often learn about issues **hours or days late** and receive no automated guidance on how to respond.



## Our Solution

Sentinel offers **proactive, AI-driven supply chain intelligence**:

- **Real-time risk scoring** — every shipment is scored from 0 to 100 using a multi-factor engine
- **Gemini AI analysis** — deep disruption analysis with helpful recommendations
- **Global shipment tracking** — live map with color-coded risk overlays
- **WebSocket live alerts** — instant notifications for disruption events
- **Automated route optimization** — recommendations for alternate routes when paths are blocked
- **Analytics dashboard** — displays 7-day disruption trends, carrier performance, and risk distribution



## UN SDG Alignment

| SDG | How Sentinel Contributes |
|-----|--------------------------|
| **SDG 9** — Industry, Innovation & Infrastructure | Strengthens supply chain infrastructure using AI |
| **SDG 8** — Decent Work & Economic Growth | Cuts economic losses from disruptions |
| **SDG 17** — Partnerships for the Goals | Facilitates global trade coordination |



## Tech Stack

### Frontend
- Vanilla HTML/CSS/JavaScript
- Leaflet.js — interactive global map
- Chart.js — data visualizations
- WebSocket client — live event streaming

### Backend
- Node.js + Express — REST API
- WebSocket (ws) — real-time event server
- node-cron — scheduled risk rescoring
- Firebase Firestore — persistent data storage
- express-rate-limit — API protection

### AI & Google Technologies
- **Gemini 2.0 Flash** — disruption analysis and recommendations
- **Firebase** — Firestore database and hosting
- **Google AI Studio** — API key management



## Getting Started

### Prerequisites
- Node.js v18+
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/YourUsername/sentinel-supply-chain.git
cd sentinel-supply-chain
```

### 2. Set up the backend
```bash
cd sentinel-backend
npm install
cp .env.example .env
```

Edit `.env` and add your keys:
//GEMINI_API_KEY=your_gemini_key_here
PORT=3001
WS_PORT=3002


### 3. Start the backend
```bash
npm run dev
```

You should see:
 SENTINEL BACKEND RUNNING
→ REST API: http://localhost:3001
→ WS Stream: ws://localhost:3002

### 4. Open the frontend
Open `supply-chain-sentinel.html` with VS Code Live Server or any HTTP server.

### 5. Connect frontend to backend
- Click **⚙ Backend Config** in the sidebar.
- Set REST API to `http://localhost:3001`.
- Set WebSocket to `ws://localhost:3002`.
- Click **Save & Connect**.

The **API dot** should turn green.



## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/shipments` | All shipments with risk scores |
| GET | `/api/shipments/:id` | Single shipment detail |
| PATCH | `/api/shipments/:id/status` | Update shipment status |
| GET | `/api/disruptions` | All active disruptions |
| POST | `/api/disruptions` | Create new disruption |
| PATCH | `/api/disruptions/:id/resolve` | Resolve a disruption |
| GET | `/api/alerts` | Smart risk-based alerts |
| GET | `/api/routes/optimize/:id` | Route recommendation for shipment |
| POST | `/api/routes/analyze` | Gemini AI disruption analysis |
| GET | `/api/routes/optimize-all` | Batch route optimization |
| WS | `ws://localhost:3002` | Live event stream |



## Risk Scoring Engine

Each shipment is scored from 0 to 100 based on:

| Factor | Weight |
|--------|--------|
| Severe weather on corridor | +35 |
| Moderate weather advisory | +15 |
| High-congestion port on route | +20 |
| Unreliable carrier history | +15 |
| 3 or more prior delays detected | +20 |
| 1 to 2 prior delays | +10 |
| Active disruption flag | +25 |

**Thresholds:** `0-39` Low, `40-69` Medium, `70-100` High


## Project Structure
## 📁 Project Structure
sentinel-supply-chain/
├── supply-chain-sentinel.html # Frontend dashboard
├── README.md
├── screenshot.png
└── sentinel-backend/
├── server.js # Main entry point
├── package.json
├── .env.example
├── config/
│ ├── constants.js # Risk weights & thresholds
│ └── firebase.js # Firebase init
├── routes/
│ ├── shipments.js
│ ├── disruptions.js
│ ├── alerts.js
│ └── routes.js
├── services/
│ ├── riskEngine.js # Core scoring algorithm
│ ├── routeOptimizer.js # Alternate route logic
│ ├── geminiService.js # Gemini AI integration
│ └── wsSimulator.js # WebSocket server
├── middleware/
│ ├── errorHandler.js
│ └── rateLimiter.js
└── data/
├── shipments.json # Seed shipment data
└── disruptions.json # Seed disruption data

### Team

---

## 👥 Team

| Name | Role |
|------|------|
| Soumyadeep Sengupta | Full Stack + AI Integration |
| Nafisah Ahmed | UI Design + Testing |
| Riyana Das | Debugging + Research and documentation|



## 📸 Screenshots

### Dashboard Overview
![Dashboard](./screenshot.png)

---

## 📄 License

MIT License — free to use, modify and distribute.

---

<div align="center">
  Built with ❤️ for Google Solution Challenge 2026
  <br/>
  <strong>Sentinel — Know before it breaks.</strong>
</div>