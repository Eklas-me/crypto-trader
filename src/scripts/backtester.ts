import { fetchKlines } from '../services/binance-api';
import { generateSignal } from '../engine/signal-engine';
import { DEFAULT_SETTINGS } from '../engine/types';
import type { Candle, Signal } from '../engine/types';

interface TradeRecord {
  signal: Signal;
  entryPrice: number;
  exitPrice: number;
  status: 'WIN' | 'LOSS';
  pnlPercent: number;
  durationMinutes: number;
  entryTime: string;
  exitTime: string;
}

async function runBacktest(coin: string, timeframe: '15m' | '1h', limit: number = 1000) {
  console.log(`\n🚀 Starting Backtest for ${coin} on ${timeframe} timeframe...`);
  console.log(`📊 Fetching last ${limit} historical candles...`);

  const candles = await fetchKlines(coin, timeframe, limit);
  if (!candles || candles.length < 250) {
    console.error('❌ Not enough historical data to run backtest.');
    return;
  }

  console.log(`✅ Data fetched. Simulating ${candles.length - 200} potential entry points...`);

  const trades: TradeRecord[] = [];
  let currentOpenTrade: { signal: Signal, startIndex: number } | null = null;
  const riskSettings = {
    ...DEFAULT_SETTINGS.riskSettings,
    minRiskReward: 1.5,
  };

  // Start from index 200 because generateSignal needs 200 candles of history
  for (let i = 200; i < candles.length - 1; i++) {
    const historicalSlice = candles.slice(i - 200, i + 1);
    const currentCandle = historicalSlice[historicalSlice.length - 1];

    // 1. Check if we have an open trade
    if (currentOpenTrade) {
      const { signal, startIndex } = currentOpenTrade;
      
      // Check if current candle hits TP or SL
      // Simplified: we check if high >= TP or low <= SL for BUY
      const isBuy = signal.direction === 'BUY';
      let hitWin = false;
      let hitLoss = false;
      let exitPrice = 0;

      if (isBuy) {
        if (currentCandle.low <= signal.stopLoss) {
          hitLoss = true;
          exitPrice = signal.stopLoss;
        } else if (currentCandle.high >= signal.tp1) {
          hitWin = true;
          exitPrice = signal.tp1;
        }
      } else {
        if (currentCandle.high >= signal.stopLoss) {
          hitLoss = true;
          exitPrice = signal.stopLoss;
        } else if (currentCandle.low <= signal.tp1) {
          hitWin = true;
          exitPrice = signal.tp1;
        }
      }

      if (hitWin || hitLoss) {
        const pnlPercent = isBuy 
          ? ((exitPrice - signal.entryPriceHigh) / signal.entryPriceHigh) * 100
          : ((signal.entryPriceHigh - exitPrice) / signal.entryPriceHigh) * 100;

        const durationMs = (currentCandle.time - candles[startIndex].time) * 1000;
        
        trades.push({
          signal,
          entryPrice: signal.entryPriceHigh,
          exitPrice,
          status: hitWin ? 'WIN' : 'LOSS',
          pnlPercent,
          durationMinutes: Math.floor(durationMs / 60000),
          entryTime: new Date(candles[startIndex].time * 1000).toLocaleString(),
          exitTime: new Date(currentCandle.time * 1000).toLocaleString(),
        });

        // Close trade
        currentOpenTrade = null;
      }
      
      // If we are in a trade, we skip looking for new signals
      continue;
    }

    // 2. Look for new signals
    // For backtesting, we skip HTF, OrderBook and Futures since we don't have historical data for them
    const signal = generateSignal({
      coin,
      timeframe,
      candles: historicalSlice,
      riskSettings
    });

    if (signal && signal.status === 'ACTIVE' && (signal.grade === 'A' || signal.grade === 'B')) {
      // Enter trade on the CLOSE of this candle
      currentOpenTrade = {
        signal,
        startIndex: i
      };
    }
  }

  // Generate Report
  console.log('\n=============================================');
  console.log(`📈 BACKTEST REPORT: ${coin} (${timeframe})`);
  console.log('=============================================');
  console.log(`Total Candles Scanned : ${candles.length - 200}`);
  console.log(`Total Trades Taken    : ${trades.length}`);
  
  if (trades.length > 0) {
    const wins = trades.filter(t => t.status === 'WIN').length;
    const losses = trades.filter(t => t.status === 'LOSS').length;
    const winRate = ((wins / trades.length) * 100).toFixed(2);
    
    // Calculate PnL (assuming 2% risk per trade)
    let initialBalance = 1000;
    let balance = initialBalance;
    const riskPerTrade = 2; // 2% of total capital

    trades.forEach(t => {
      const riskAmount = balance * (riskPerTrade / 100);
      const positionSize = riskAmount / Math.abs(1 - (t.signal.stopLoss / t.entryPrice));
      
      if (t.status === 'WIN') {
        const profit = positionSize * Math.abs((t.exitPrice / t.entryPrice) - 1);
        balance += profit;
      } else {
        balance -= riskAmount;
      }
    });

    console.log(`Wins                  : ${wins} ✅`);
    console.log(`Losses                : ${losses} ❌`);
    console.log(`Win Rate              : ${winRate}% 🏆`);
    console.log(`Starting Balance      : $${initialBalance.toFixed(2)}`);
    console.log(`Ending Balance        : $${balance.toFixed(2)}`);
    console.log(`Total ROI             : ${(((balance - initialBalance) / initialBalance) * 100).toFixed(2)}% 💰`);
    console.log('\n--- Trade History ---');
    trades.forEach((t, index) => {
      console.log(`${index + 1}. [${t.entryTime}] ${t.signal.direction} ${t.signal.tradeType} (${t.signal.grade}-Grade)`);
      console.log(`   Result: ${t.status === 'WIN' ? '✅ WIN' : '❌ LOSS'} | PnL: ${t.pnlPercent.toFixed(2)}% | Duration: ${t.durationMinutes}m`);
    });
  } else {
    console.log('No valid trades found in the specified period.');
  }
  console.log('=============================================\n');
}

// Read arguments
const args = process.argv.slice(2);
const coin = args[0] || 'ETHUSDT';
const timeframe = (args[1] as '15m' | '1h') || '15m';

runBacktest(coin, timeframe).catch(console.error);
