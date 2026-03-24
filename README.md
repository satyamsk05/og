# 💎 OGBOT PRO v6.0
### Advanced Polymarket Dip Sniper & Martingale Trading Engine

OGBOT PRO is a premium, high-frequency trading bot specifically engineered for **Polymarket**. It combines real-time market scanning, an advanced 5-layer Martingale recovery system, and a professional terminal interface to deliver a state-of-the-art trading experience.

---

## 🚀 Key Features

*   **📊 Bloomberg-Style Dashboard:** A professional real-time terminal for monitoring balances, PnL, Win/Loss ratios, and multi-coin market status.
*   **📈 Binary Trend Analysis:** Uses a session-based approach (1/0 indicators) to track market streaks without relying on stale historical data.
*   **🛠 Advanced Martingale System:** 5-layer recovery strategy ($3, $6, $13, $28, $60) designed to recover losses within the same session.
*   **🤖 Gasless Auto-Redemption:** Fully automated winning claim system using the **Builder API** to redeem profits every 5 minutes with zero gas fees.
*   **📱 Premium Telegram Bot:**
    *   **Live Charts:** View session-based trends (`11100`) directly in chat.
    *   **Manual Trading:** Interactive inline menus for instant manual orders.
    *   **Notifications:** Instant alerts for every buy, sell, win, and claim.
*   **⚡ Multi-Coin Support:** Simultaneous scanning for **BTC, ETH, SOL,** and **XRP** on 15m intervals.

---

## 🛠 Setup & Installation

### 1. Prerequisites
- **Node.js:** v20.x or higher
- **NPM/Yarn**
- **Polymarket Account:** With USDC (Polygon POS) and MATIC for initial setup.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/satyamsk05/og
cd og

# Install dependencies
npm install
```

### 3. Configuration (`.env`)
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Update the following fields:
- `POLY_PRIVATE_KEY`: Your wallet's private key.
- `API_KEY`, `API_SECRET`, `PASSPHRASE`: Standard Polymarket API keys.
- `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`: For bot notifications.

### 4. Generate Builder Keys (CRITICAL for Auto-Redeem)
Run the built-in generator to get your Builder API credentials for gasless claims:
```bash
npm run generate-builder-keys
```
Copy the `BUILDER_API_KEY`, `BUILDER_SECRET`, and `BUILDER_PASSPHRASE` into your `.env`.

---

## 🏃 Running the Bot

### Development Mode (with Live Reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 📊 Dashboard Indicators

| Indicator | Meaning |
| :--- | :--- |
| `1` | **Green Candle** (Price > 0.50) |
| `0` | **Red Candle** (Price < 0.50) |
| `----` | **Empty Session** (Waiting for bot to scan new candles) |
| `L0-L5` | **Martingale Level** (Resets to L0 after a win) |

---

## 🆘 Strategy Logic
- **Mean Reversion:** If 3 consecutive candles show the same direction (e.g., `111`), the bot bets on a reversal (`NO`).
- **Startup Protection:** The bot waits for at least **3 NEW candles** to be scanned after starting before placing its first trade. This ensures fresh session-based data.
- **Recovery Priority:** If one coin is in a recovery cycle (L2+), the bot prioritizes trade execution for that coin to clear the loss.

---

## ⚖️ Disclaimer
This software is for educational and research purposes only. Trading cryptocurrency involves significant risk of loss. The developers are not responsible for any financial losses incurred.

**Developed with 💙 by OGBOT PRO Team**
