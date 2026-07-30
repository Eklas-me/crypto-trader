import WebSocket from 'ws';
import { connectDB } from '@/lib/db';
import Trade from '@/models/Trade';
import SettingsModel from '@/models/Settings';

let ws: WebSocket | null = null;
let activeTrades: any[] = [];
let monitorInterval: NodeJS.Timeout | null = null;

export async function startTradeMonitor() {
  await connectDB();
  
  // Periodically refresh active trades from DB
  const refreshTrades = async () => {
    try {
      activeTrades = await Trade.find({ status: 'OPEN' });
    } catch (e) {
      console.error('[TradeMonitor] Error fetching open trades', e);
    }
  };
  
  await refreshTrades();
  monitorInterval = setInterval(refreshTrades, 10000); // refresh every 10s

  const connect = () => {
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    ws.on('open', () => {
      console.log('[TradeMonitor] Connected to Binance WebSocket for Auto-Trading');
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!Array.isArray(msg) || activeTrades.length === 0) return;

        // Map current prices
        const prices: Record<string, number> = {};
        for (const t of msg) {
          prices[t.s] = parseFloat(t.c);
        }

        // Check active trades
        for (const trade of activeTrades) {
          const currentPrice = prices[trade.coin];
          if (!currentPrice) continue;

          let shouldClose = false;
          let closeReason: 'TP' | 'SL' = 'TP';

          if (trade.direction === 'BUY') {
            if (currentPrice >= trade.takeProfit) {
              shouldClose = true;
              closeReason = 'TP';
            } else if (currentPrice <= trade.stopLoss) {
              shouldClose = true;
              closeReason = 'SL';
            }
          } else {
            // SELL
            if (currentPrice <= trade.takeProfit) {
              shouldClose = true;
              closeReason = 'TP';
            } else if (currentPrice >= trade.stopLoss) {
              shouldClose = true;
              closeReason = 'SL';
            }
          }

          if (shouldClose) {
            await executeTradeClosure(trade, currentPrice, closeReason);
          }
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      console.warn('[TradeMonitor] WebSocket disconnected, reconnecting in 5s...');
      setTimeout(connect, 5000);
    });
    
    ws.on('error', (err) => {
      console.error('[TradeMonitor] WebSocket error:', err);
      ws?.close();
    });
  };

  connect();
}

async function executeTradeClosure(trade: any, exitPrice: number, reason: 'TP' | 'SL') {
  try {
    // 1. Remove from local active list immediately to prevent double execution
    activeTrades = activeTrades.filter(t => t._id.toString() !== trade._id.toString());

    // 2. Calculate P&L
    let pnl = 0;
    let pnlPercent = 0;
    
    if (trade.direction === 'BUY') {
      pnl = (exitPrice - trade.entryPrice) * trade.quantity;
      pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
      pnl = (trade.entryPrice - exitPrice) * trade.quantity;
      pnlPercent = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
    }

    // 3. Update Trade in DB
    trade.exitPrice = exitPrice;
    trade.exitTime = Date.now();
    trade.pnl = pnl;
    trade.pnlPercent = pnlPercent;
    trade.status = reason === 'TP' ? 'CLOSED_TP' : 'CLOSED_SL';
    await trade.save();

    console.log(`[TradeMonitor] Trade closed! ${trade.coin} ${trade.direction} hit ${reason}. P&L: $${pnl.toFixed(2)}`);

    // 4. Update Balance in Settings
    const settingsDoc = await SettingsModel.findOne();
    if (settingsDoc) {
      settingsDoc.settings.riskSettings.totalCapital += pnl;
      // Mark as modified if Mongoose doesn't detect deep nested changes
      settingsDoc.markModified('settings');
      await settingsDoc.save();
      console.log(`[TradeMonitor] New Balance: $${settingsDoc.settings.riskSettings.totalCapital.toFixed(2)}`);
    }
  } catch (error) {
    console.error('[TradeMonitor] Error executing trade closure:', error);
  }
}
