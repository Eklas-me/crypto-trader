# 🚀 CryptoTrader Pro — Smart Institutional Trading System

CryptoTrader Pro is a high-precision, institutional-grade cryptocurrency trading and analysis platform. It features a **12-Layer Confluence Signal Engine**, a **24/7 Automated Background Scanner**, an **Instant Binance WebSocket Auto Paper-Trading Engine**, and **Telegram Notification Integration**.

---

## 🌟 Key System Architecture & How It Works

```
                     ┌────────────────────────────────────────┐
                     │           Binance Live Data            │
                     └───────────────────┬────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
              ┌──────────▼──────────┐         ┌──────────▼──────────┐
              │ Background Scanner  │         │  Binance WebSocket  │
              │  (Every 5 Minutes)  │         │  (Millisecond Feed) │
              └──────────┬──────────┘         └──────────┬──────────┘
                         │                               │
     12-Layer Signal Engine & MTF Filter                 │
                         │                               │
        ┌────────────────┼────────────────┐              │
        │                │                │              │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐     │
│ Signal Database│ │Telegram Bot│ │ Auto Paper-    │     │
│   (MongoDB)    │ │   Alerts   │ │ Trading Entry  │     │
└────────────────┘ └────────────┘ └───────┬────────┘     │
                                          │              │
                                  ┌───────▼──────────────▼──────┐
                                  │ Real-Time TP/SL & Break-Even│
                                  │  Execution via WebSocket    │
                                  └───────────────┬─────────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ P&L & Capital  │
                                          │     Update     │
                                          └────────────────┘
```

1. **Background Scanner (`src/workers/background-scanner.ts`)**: Runs continuously every 5 minutes, inspecting watchlist coins on 1-Hour candles alongside 4-Hour trend alignment.
2. **12-Layer Signal Engine (`src/engine/signal-engine.ts`)**: Evaluates 12 technical, institutional, and sentiment indicators simultaneously to produce a single graded trade signal.
3. **Automated Telegram Alerts (`src/services/telegram.ts`)**: Instantly dispatches rich markdown trade alerts for Grade A & B setups.
4. **Real-Time Trade Monitor (`src/workers/trade-monitor.ts`)**: Maintains a persistent WebSocket connection with Binance (`wss://stream.binance.com`) for millisecond-level TP, SL, and Break-Even execution.
5. **MongoDB Cloud Sync (`src/lib/db.ts`)**: Persists all settings, watchlists, signal histories, and virtual paper-trading balances across all user devices.

---

## 🧠 The 12 Analysis Layers & Signal Logic

To eliminate fakeouts and high-risk trades, CryptoTrader Pro requires multi-layer confluence before generating any buy/sell signal.

### Layer 1: Market Regime
- **Logic**: Combines **ADX (14)** and **Bollinger Bands Width**.
- **Action**: Identifies whether the market is strongly trending ($ADX > 25$), ranging, or choppy ($ADX < 20$). Ranging markets increase strictness to avoid choppy trades.

### Layer 2: Higher Timeframe (HTF) Trend
- **Logic**: Evaluates **EMA 50** vs **EMA 200** alignment on HTF candles.
- **Action**: $Price > EMA 50 > EMA 200$ flags a strong Bullish structure, while $Price < EMA 50 < EMA 200$ flags a Bearish structure.

### Layer 3: Smart Money Concepts (SMC) & Liquidity
- **Logic**: Scans for **Order Blocks (OB)**, **Breaker Blocks**, **Fair Value Gaps (FVG)**, **Sell-Side/Buy-Side Liquidity Sweeps**, and **Premium/Discount Zones**.
- **Action**: Unmitigated Fresh Order Blocks receive a **90% confidence score**, Breaker Blocks receive **85%**, and Liquidity Sweeps flag smart-money reversal points.

### Layer 4: Volume Profile & Cumulative Volume Delta (CVD)
- **Logic**: Computes **Point of Control (POC)**, **Value Area High (VAH)**, and **Value Area Low (VAL)** alongside CVD trend.
- **Action**: Prices below VAL signify undervalued conditions (Bullish), while prices above VAH signal overextended conditions (Bearish).

### Layer 5: Momentum & Divergences
- **Logic**: Evaluates **RSI (14)** and scans for **Bullish/Bearish Divergences** across RSI, MACD, OBV, and MFI.
- **Action**: Bullish Divergence + Oversold RSI ($< 30$) produces an **85% confidence** buy score. Bearish Divergence + Overbought RSI ($> 70$) produces a sell score.

### Layer 6: Trend Indicators
- **Logic**: Analyzes **EMA 20 / EMA 50 Crossovers** combined with **MACD Histogram** direction.
- **Action**: Confirms momentum continuation when histogram crosses the zero line.

### Layer 7: Market Sentiment
- **Logic**: Fetches live **Fear & Greed Index** data from Alternative.me API.
- **Action**: $Index \le 20$ (Extreme Fear) flags oversold market sentiment; $Index \ge 80$ (Extreme Greed) flags overextended market risk.

### Layer 8: Candlestick & Chart Patterns
- **Logic**: Detects 18+ candlestick patterns (Bullish/Bearish Engulfing, Morning/Evening Star, Pin Bars, Doji) and 12+ chart patterns (Head & Shoulders, Double Top/Bottom, Triangles, Wedges).
- **Action**: Adds pattern confirmation to entry price zones.

### Layer 9: Fibonacci Golden Zones
- **Logic**: Calculates Fibonacci Retracement levels from major swing highs and swing lows.
- **Action**: Flags high-probability reversal zones when price reaches the **Golden Zone (0.618 - 0.786)**.

### Layer 10: Order Book Depth & Whale Walls
- **Logic**: Inspects bid/ask order book volume imbalance and scans for bid/ask walls ($> \$500K$).
- **Action**: High bid-to-ask volume imbalance confirms buying pressure.

### Layer 11: Futures Sentiment
- **Logic**: Analyzes **Funding Rates**, **Long/Short Ratios**, and **Open Interest (OI)** changes.
- **Action**: Prevents opening trades when the market is over-leveraged in one direction.

### Layer 12: Market Correlation & BTC Dominance
- **Logic**: Fetches CoinGecko global market data for **BTC Dominance (BTC.D)** and **USDT Dominance**.
- **Action**: Verifies if altcoins are in an Altseason phase or if Bitcoin dominance is surging.

---

## 🛡️ Advanced Risk Management & Execution Features

### 1. Signal Grading System
- **Grade A ($\ge 10$ layers or $\ge 85\%$ ratio)**: Institutional setup — Auto Paper-Traded & Telegram Alerted.
- **Grade B ($\ge 8$ layers or $\ge 70\%$ ratio)**: High-quality setup — Auto Paper-Traded & Telegram Alerted.
- **Grade C ($\ge 6$ layers or $\ge 55\%$ ratio)**: Low-confidence setup — Filtered out from background auto-trading to protect capital.

### 2. Multi-Timeframe (MTF 4h) Hard Check
- If a 1-Hour signal is **BUY**, but the 4-Hour trend is strongly **BEARISH**, the system automatically rejects the signal as a risky counter-trend trade.

### 3. Risk-Free Break-Even Trailing Stop-Loss
- As soon as a trade's live price reaches **50% towards Take Profit (TP1)**, the real-time WebSocket monitor automatically moves the Stop Loss to the **Entry Price** (Break-Even). This guarantees the trade cannot turn into a loss!

### 4. Dynamic Precision Rounding
- Automatically adjusts price decimal precision based on asset value (e.g., BTC at 2 decimals `$65,200.50`, ADA at 4-6 decimals `$0.1745`).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack, Server Actions)
- **State Management**: Zustand
- **Database**: MongoDB with Mongoose (Singleton connection pattern)
- **Real-Time Data**: Binance WebSocket (`wss://stream.binance.com:9443`) & REST API
- **Cron Scheduling**: `node-cron` inside Next.js `instrumentation.ts`
- **Styling**: Vanilla CSS tokens & Glassmorphism UI
- **Deployment**: Docker multi-stage build, Nixpacks on Coolify

---

## 📦 Local Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eklas-me/crypto-trader.git
   cd crypto-trader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`)**:
   ```env
   NODE_ENV=production
   PORT=3000
   MONGODB_URI="your-mongodb-connection-string"
   TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
   TELEGRAM_CHAT_ID="your-telegram-chat-id"
   WATCHLIST="BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT"
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
