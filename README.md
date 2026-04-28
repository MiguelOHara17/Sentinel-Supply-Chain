# Sentinel, Smart Supply Chain Monitor

# 🚀 Sentinel — Real-Time AI Supply Chain Intelligence

> **Detect. Decide. Act — in under 60 seconds.**
> Google Solution Challenge 2026 | UN SDG 9, Industry, Innovation & Infrastructure

Sentinel is a browser-based AI platform that monitors global shipments, detects disruptions in real time, and uses Google Gemini AI to generate actionable decisions and reroute strategies instantly.

---

## 🌐 Live Demo

* 🔗 **Prototype:** https://miguelohara17.github.io/Sentinel-Supply-Chain/
* 🎥 **Demo Video:** https://youtu.be/7v5SMTP2U7g

⚠️ If the live deployment is temporarily unavailable, the demo video showcases the full working system.

---

## 🔍 Quick Demo Guide (2 minutes)

1. Open the dashboard → view live shipment map
2. Click **"Run Deep Analysis"** → trigger Gemini AI
3. Navigate to **Route Optimizer** → observe rerouting logic
4. Try this scenario in Gemini Analyzer:
   *"Port congestion at Rotterdam. 200+ vessels delayed. What should we do?"*

⚠️ Demo mode ensures functionality even if backend/API is unavailable.

---

## 🧠 Problem Statement

Global supply chains lose **$1.5 trillion annually** due to disruptions caused by port congestion, extreme weather, carrier failures, and geopolitical events.

Existing systems:

* Detect issues too late
* Provide fragmented data
* Offer no actionable decision support

Result: delays, inefficiencies, and massive financial loss.

---

## 💡 Our Solution

Sentinel bridges the gap between **detection and decision-making**.

### 🔄 Core Workflow

* **Detect Instantly**
  Real-time monitoring via WebSockets identifies disruptions across shipment corridors

* **Decide in Seconds**
  Gemini 2.0 Flash generates structured AI analysis:

  * Impact assessment
  * Immediate actions
  * Rerouting recommendation
  * Risk timeline

* **Act Immediately**
  One-click rerouting updates shipment paths, ETA, and risk dynamically

---

## ⚡ Key Capabilities

### Core Features

* Real-time disruption detection
* Gemini AI decision engine
* Automated route optimization

### Supporting Features

* Live global shipment map (Leaflet.js)
* KPI analytics dashboard
* WebSocket-based live alerts
* Offline AI fallback for reliability

---

## 🌍 UN SDG Alignment

| SDG        | Contribution                                        |
| ---------- | --------------------------------------------------- |
| **SDG 9**  | Strengthens infrastructure with AI-driven logistics |
| **SDG 8**  | Reduces economic losses from delays                 |
| **SDG 17** | Enhances global trade coordination                  |

---

## 🧰 Tech Stack

### Frontend

* HTML, CSS, JavaScript (Vanilla)
* Leaflet.js — interactive map
* Chart.js — analytics visualization
* WebSocket client — real-time updates

### Backend

* Node.js + Express — REST APIs
* WebSocket (ws) — live event streaming
* node-cron — scheduled risk recalculation
* Firebase Firestore — database
* express-rate-limit — API protection

### AI & Google Technologies

* **Gemini 2.0 Flash** — disruption analysis
* Firebase — real-time data layer
* Google AI Studio — API integration

---

## ⚙️ Getting Started

### Prerequisites

* Node.js v18+
* Gemini API key from https://aistudio.google.com

### Setup

```bash
git clone https://github.com/MiguelOHara17/Sentinel-Supply-Chain.git
cd sentinel-supply-chain
cd sentinel-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your_key_here
PORT=3001
WS_PORT=3002
```

### Run Backend

```bash
npm run dev
```

### Run Frontend

Open:

```
supply-chain-sentinel.html
```

Then configure:

* REST API → http://localhost:3001
* WebSocket → ws://localhost:3002

---

## 📊 Risk Scoring Engine

Each shipment is scored (0–100) based on:

* Severe weather: +35
* Moderate weather: +15
* Port congestion: +20
* Carrier reliability issues: +15
* Delay history: +10 to +20
* Active disruption: +25

**Thresholds:**

* 0–39 → Low
* 40–69 → Medium
* 70–100 → High

---

## 📁 Project Structure

```
sentinel-supply-chain/
├── supply-chain-sentinel.html
├── README.md
├── screenshot.png
└── sentinel-backend/
    ├── server.js
    ├── routes/
    ├── services/
    ├── middleware/
    └── data/
```

---

## 👥 Team

| Name                | Role                        |
| ------------------- | --------------------------- |
| Soumyadeep Sengupta | Full Stack + AI Integration |
| Nafisah Ahmed       | UI Design + Testing         |
| Riyana Das          | Debugging + Research        |

---

## 📸 Screenshots

![Dashboard](./screenshot.png)

---

## 📄 License

MIT License — free to use and modify.

---

<div align="center">
<strong>Sentinel — Know before it breaks.</strong><br/>
Built for Google Solution Challenge 2026
</div>


<div align="center">
  Built with ❤️ for Google Solution Challenge 2026
  <br/>
  <strong>Sentinel — Know before it breaks.</strong>
</div>
