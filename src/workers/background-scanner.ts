import { fetchKlines } from '@/services/binance-api';
import { generateSignal } from '@/engine/signal-engine';
import { sendTelegramSignal } from '@/services/telegram';
import { DEFAULT_WATCHLIST, DEFAULT_SETTINGS } from '@/engine/types';
import { connectDB } from '@/lib/db';
import SettingsModel from '@/models/Settings';
import SignalModel from '@/models/Signal';
import TradeModel from '@/models/Trade';

// In-memory cache to prevent duplicate signals for the same coin on the same candle
const lastSignalSent: Record<string, number> = {};

export async function runBackgroundScan() {
  console.log(`[Scanner] Running background scan at ${new Date().toISOString()}...`);
  
  try {
    await connectDB();
  } catch (e) {
    console.error('[Scanner] DB connection failed, skipping scan', e);
    return;
  }
  
  const settingsDoc = await SettingsModel.findOne();
  const settings = settingsDoc?.settings || DEFAULT_SETTINGS;

  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;
  const watchlist = settings.watchlist?.length > 0 ? settings.watchlist : DEFAULT_WATCHLIST;

  if (!token || !chatId) {
    console.warn('[Scanner] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Skipping Telegram alerts.');
  }

  // We scan the 1h timeframe by default for background swing trading
  const timeframe = '1h';

  for (const coin of watchlist) {
    try {
      // 1. Fetch data (1h for entry, 4h for HTF trend)
      const candles = await fetchKlines(coin, timeframe, 200);
      if (!candles || candles.length < 50) continue;

      const htfCandles = await fetchKlines(coin, '4h', 100).catch(() => undefined);

      // 2. Generate signal with MTF alignment
      const signal = generateSignal({ 
        coin, 
        timeframe, 
        candles, 
        htfCandles,
        riskSettings: settings.riskSettings || DEFAULT_SETTINGS.riskSettings 
      });

      if (!signal) continue;

      // 3. Filter for A or B grade, and ACTIVE
      if (signal.status === 'ACTIVE' && (signal.grade === 'A' || signal.grade === 'B')) {
        
        // Prevent sending the exact same signal multiple times
        if (lastSignalSent[coin] === signal.timestamp) continue;

        console.log(`[Scanner] ${signal.grade}-Grade ${signal.direction} signal found for ${coin}!`);
        
        // Save to Database
        try {
          await SignalModel.create(signal);

          // Auto Paper-Trading Entry
          const riskSettings = settings.riskSettings;
          const riskDollars = (riskSettings.totalCapital * riskSettings.riskPerTrade) / 100;
          const slDistance = Math.abs(signal.entryPriceHigh - signal.stopLoss);
          const quantity = riskDollars / slDistance;

          await TradeModel.create({
            id: signal.id,
            coin: signal.coin,
            direction: signal.direction,
            entryPrice: signal.entryPriceHigh, // simplified entry
            exitPrice: null,
            quantity: quantity,
            stopLoss: signal.stopLoss,
            takeProfit: signal.tp1, // targeting tp1 for auto trade
            entryTime: Date.now(),
            exitTime: null,
            pnl: null,
            pnlPercent: null,
            status: 'OPEN',
            signalGrade: signal.grade,
            notes: `Auto Entry (${signal.timeframe})`,
          });
          console.log(`[Scanner] Auto Trade Opened for ${coin} - Qty: ${quantity.toFixed(4)}`);

        } catch (dbError: any) {
          // ignore unique constraint errors if signal was already saved
          if (dbError.code !== 11000) {
            console.error('[Scanner] Failed to save signal/trade to DB:', dbError);
          }
        }

        // 4. Send Telegram Alert
        if (token && chatId) {
          const success = await sendTelegramSignal(chatId, token, signal);
          if (success) {
            lastSignalSent[coin] = signal.timestamp;
            console.log(`[Scanner] Telegram alert sent for ${coin}`);
          }
        } else {
          lastSignalSent[coin] = signal.timestamp;
        }
      }
    } catch (error) {
      console.error(`[Scanner] Error analyzing ${coin}:`, error);
    }
    
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[Scanner] Background scan complete.');
}
