# OGBOT PRO v6.0 🚀
### Advanced Polymarket Dip Sniper & Martingale Trader

OGBOT PRO is a premium, high-frequency trading bot designed for Polymarket. It utilizes a session-based trend-following strategy with an advanced Martingale recovery system to maximize profitability while minimizing risk.

---

## ✨ Features

*   **Bloomberg-Style Terminal:** A professional, box-style real-time dashboard for monitoring multi-coin performance, session stats, and engine status.
*   **Dual Timeframe Scanning:** Supports both 5m and 15m intervals (Current focus: 15m) for BTC, ETH, SOL, and XRP.
*   **Session-Based Logic:** High safety standard that ignores historical data on startup. The bot waits for **3 NEW candles** to form before initiating trades.
*   **Advanced Martingale:** 5-layer recovery system ($3, $6, $13, $28, $60) to recover losses instantly.
*   **Telegram Integration:** 
    *   Real-time notifications for Buy/Sell/Win/Loss.
    *   Premium "Manual Trade" menu with inline buttons for quick execution.
    *   Session-based chart history and total account summaries.
*   **Gasless Redemption:** Automated "Auto-Claim" system that redeems winnings every 5 minutes without requiring user intervention.
*   **Multi-Asset Priority:** Intelligence to prioritize Recovery Mode and specific assets (SOL-first) when multiple signals occur.

---

## 🛠 Setup & Installation

### 1. Prerequisites
*   Node.js (v18 or higher)
*   NPM
*   Polymarket API Keys & Private Key

### 2. Configuration (`.env`)
Create a `.env` file in the root directory and add your credentials:
```env
# Telegram
TELEGRAM_TOKEN=your_bot_token

# Polymarket API
POLY_API_KEY=your_api_key
POLY_API_SECRET=your_api_secret
POLY_PASSPHRASE=your_passphrase
POLY_PRIVATE_KEY=your_private_key
WALLET_ADDRESS=your_wallet_address

# Strategy
DRY_RUN=true
INTERVAL=15
INITIAL_BET_AMOUNT=3
COINS=BTC,ETH,SOL,XRP
```

### 3. Build & Run
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm run dev
```

---

## 📊 Dashboard Overview

*   **BALANCE:** Total USDC held across Wallet, CLOB, and Funder.
*   **PNL:** Total profit/loss in the current session.
*   **W/L:** Count of successful vs failed trades since bot start.
*   **HISTORY:** Visual indicators (🟢🔴) showing the trend of the last 4 candles.
*   **STATUS:** Real-time state of each asset (Scanning, Signal Generated, or Bet Filled).

---

## 🆘 Strategy Help
*   **Trend Following:** Bot bets based on the consensus of the last 3 candles.
*   **Recovery Lock:** If an asset is in a loss cycle, the bot locks onto it until the loss is recovered (L1 -> L5).
*   **Manual Override:** Use the Telegram bot's `Manual` menu to place quick trades without waiting for signals.

---

## ⚖️ Disclaimer
This software is for educational purposes only. Cryptocurrency trading involves high risk. Use at your own risk.

---
**Developed by OGBOT PRO Team** 💎⚡
