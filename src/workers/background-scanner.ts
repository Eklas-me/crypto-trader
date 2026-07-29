import { fetchKlines } from '@/services/binance-api';
import { generateSignal } from '@/engine/signal-engine';
import { sendTelegramSignal } from '@/services/telegram';
import { DEFAULT_WATCHLIST, DEFAULT_SETTINGS } from '@/engine/types';

// In-memory cache to prevent duplicate signals for the same coin on the same candle
const lastSignalSent: Record<string, number> = {};

export async function runBackgroundScan() {
  console.log(`[Scanner] Running background scan at ${new Date().toISOString()}...`);
  
  // Use env variables, fallback to defaults
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  let watchlist = DEFAULT_WATCHLIST;
  if (process.env.WATCHLIST) {
    watchlist = process.env.WATCHLIST.split(',').map(s => s.trim().toUpperCase());
  }

  if (!token || !chatId) {
    console.warn('[Scanner] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Skipping Telegram alerts.');
  }

  // We scan the 1h timeframe by default for background swing trading
  const timeframe = '1h';

  for (const coin of watchlist) {
    try {
      // 1. Fetch data
      const candles = await fetchKlines(coin, timeframe, 200);
      if (candles.length < 50) continue;

      // 2. Generate signal
      const signal = generateSignal({ 
        coin, 
        timeframe, 
        candles, 
        riskSettings: DEFAULT_SETTINGS.risk 
      });

      if (!signal) continue;

      // 3. Filter for A or B grade, and ACTIVE
      if (signal.status === 'ACTIVE' && (signal.grade === 'A' || signal.grade === 'B')) {
        
        // Prevent sending the exact same signal multiple times
        const signalKey = `${coin}-${signal.direction}-${signal.timestamp}`;
        if (lastSignalSent[coin] === signal.timestamp) continue;

        console.log(`[Scanner] ${signal.grade}-Grade ${signal.direction} signal found for ${coin}!`);
        
        // 4. Send Telegram Alert
        if (token && chatId) {
          const success = await sendTelegramSignal(chatId, token, signal);
          if (success) {
            lastSignalSent[coin] = signal.timestamp;
            console.log(`[Scanner] Telegram alert sent for ${coin}`);
          }
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
