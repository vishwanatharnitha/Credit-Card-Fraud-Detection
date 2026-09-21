# Gold Sentinel

### 🎯 CORE TOPIC & DATA CONTEXT

- PROJECT TOPIC: Credit Card Fraud Detection & Transaction Anomaly Engine.

- CORE CONTEXT: This dashboard is built for FinTech data scientists and bank security teams to monitor credit card transactions. The underlying logic specifically evaluates Principal Component Analysis (PCA) data features (specifically components V14, V4, V12, V10, Time, and Amount) extracted from historical credit card datasets to flag anomalies and block real-time fraudulent payments.

### 🟢 VISUAL STYLE & AESTHETIC DESIGN RULES

- DO NOT use standard corporate blue-and-white layouts. 

- THEME: Premium Dark Mode with Luxury Cinematic Accents.

- BACKGROUND: Implement a full-screen, looping background video or highly realistic CSS canvas animation that runs subtly behind the UI. It should depict abstract 3D golden currency nodes, streaming binary code, or fluid digital money particles flowing through dark space.

- COLOR PALETTE: Deep Obsidian Black (#09090b), Dark Navy Slate (#0f172a), with accents of Matte Gold (#d4af37) for premium elements, Emerald Green (#10b981) for safe transactions, and Neon Crimson Red (#ef4444) for flagged fraud anomalies.

- STYLING: Glassmorphism container panels with a blurred backdrop effect (backdrop-filter: blur), subtle gold or crimson glowing borders, custom glowing typography, and sharp, premium iconography (Lucide-react).

### 📊 FRONTEND DASHBOARD STRUCTURE

Create a clean, multi-tab layout for banking security officers:

1. OVERVIEW HUB: High-impact analytical metrics grids showing: Total Monitored Volume (\$), Active Threat Level (with an animated gauge), and Total Blocked Fraud Cases. Include an interactive chart showing continuous transaction volumes over time.

2. LIVE STREAM TRAFFIC MAP: A real-time data table displaying incoming mock bank transactions. Each row must show: Timestamp, Masked Card Holder Name, Transaction Location, Amount (\$), and an ML-calculated Fraud Risk Score (0-100%).

3. INTERACTIVE RISK SANDBOX: An evaluation panel containing numerical sliders and inputs matching these exact credit card dataset features: Amount, Time, V14, V4, V12, V10. Provide an "Analyze Vector" button that evaluates the transaction and triggers a dramatic, animated UI popup warning if the risk is high.

### 🗄️ SUPABASE BACKEND & DATABASE LOGIC

- Automatically generate a Supabase database table named `monitored_transactions` with fields for: id, timestamp, card_holder, amount, location, pca_vectors (jsonb), risk_score, and status (e.g., 'Cleared', 'Flagged', 'Blocked').

- Write a Supabase Edge Function skeleton structure that simulates evaluating the transactions. If a transaction amount exceeds \$5,000 or if its V14 slider value drops below -2.5, automatically trigger an immediate database status update to 'Blocked'.

- Ensure the frontend live-updates automatically whenever a new transaction is logged or blocked in the Supabase table.

-

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a9700a63-fdad-4684-8b98-9317d0a3a4bb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
