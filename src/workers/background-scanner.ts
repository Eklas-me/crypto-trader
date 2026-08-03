import { fetchKlines, fetchOrderBook, fetchFuturesSentiment } from '@/services/binance-api';
import { generateSignal } from '@/engine/signal-engine';
import { sendTelegramSignal, sendMarketBriefing } from '@/services/telegram';
import { generateMarketBriefing, generateSignalAnalysis } from '@/services/ai';
import { DEFAULT_WATCHLIST, DEFAULT_SETTINGS } from '@/engine/types';
import { connectDB } from '@/lib/db';
import SettingsModel from '@/models/Settings';
import SignalModel from '@/models/Signal';
import TradeModel from '@/models/Trade';
import { incrementScanCount } from '@/lib/status-tracker';

// In-memory cache to prevent duplicate signals for the same coin on the same candle
const lastSignalSent: Record<string, number> = {};
const lastAlertSent: Record<string, number> = {};

export async function runBackgroundScan() {
  incrementScanCount();
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
      const [candles, htfCandles, orderBook, futures] = await Promise.all([
        fetchKlines(coin, timeframe, 200),
        fetchKlines(coin, '4h', 100).catch(() => undefined),
        fetchOrderBook(coin).catch(() => undefined),
        fetchFuturesSentiment(coin).catch(() => undefined)
      ]);
      
      if (!candles || candles.length < 50) continue;

      // 2. Generate signal with MTF alignment
      const signal = generateSignal({ 
        coin, 
        timeframe, 
        candles, 
        htfCandles,
        orderBook,
        futures,
        riskSettings: {
          ...(settings.riskSettings || DEFAULT_SETTINGS.riskSettings),
          minRiskReward: Math.min(settings.riskSettings?.minRiskReward ?? 2, 1.5), // cap at 1.5 for better sensitivity
        }
      });

      if (!signal) continue;

      const lastCandle = candles[candles.length - 1];
      const movePercent = Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open * 100;

      // AI Alert for Sudden Market Shifts (>= 1.5% in 1 candle)
      if (movePercent >= 1.5 && settings.geminiApiKey && token && chatId) {
        if (!lastAlertSent[coin] || Date.now() - lastAlertSent[coin] > 3600000) { // Max 1 alert per hour per coin
          console.log(`[Scanner] 🚨 Sudden ${movePercent.toFixed(2)}% move detected for ${coin}. Triggering AI Alert.`);
          const aiResponse = await generateMarketBriefing(settings.geminiApiKey, {
            coin: signal.coin,
            price: lastCandle.close,
            timeframe: signal.timeframe,
            layers: signal.layers,
            confidence: signal.confidence,
            direction: signal.direction,
            grade: signal.grade
          }, true);

          if (aiResponse) {
            await sendMarketBriefing(chatId, token, aiResponse);
            lastAlertSent[coin] = Date.now();
          }
        }
      }

      // 3. Filter for A or B grade
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
          let slDistance = Math.abs(signal.entryPriceHigh - signal.stopLoss);
          if (!slDistance || slDistance <= 0 || isNaN(slDistance)) {
            slDistance = signal.entryPriceHigh * 0.02; // 2% fallback distance
          }
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
            console.log(`[Scanner] Telegram signal sent for ${coin}`);

            // 5. Send AI Analysis as follow-up message (if API key set)
            if (settings.geminiApiKey) {
              try {
                const currentPrice = candles[candles.length - 1].close;
                const aiAnalysis = await generateSignalAnalysis(settings.geminiApiKey, signal, currentPrice);
                if (aiAnalysis) {
                  await sendMarketBriefing(chatId, token, `🤖 *AI Signal Analysis*\n\n${aiAnalysis}`);
                }
              } catch (aiError) {
                console.error('[Scanner] AI analysis failed:', aiError);
              }
            }
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

  // ---------------------------------------------------------
  // 2. FAST SCAN: 15m timeframe for Major Coins only
  // ---------------------------------------------------------
  const majors = ['ETHUSDT', 'BNBUSDT', 'XRPUSDT'];
  const fastTimeframe = '15m';

  for (const coin of majors) {
    if (!watchlist.includes(coin)) continue; // Only scan if it's actually in user's watchlist

    try {
      const [candles, htfCandles, orderBook, futures] = await Promise.all([
        fetchKlines(coin, fastTimeframe, 200),
        fetchKlines(coin, '1h', 100).catch(() => undefined), // 1h is HTF for 15m
        fetchOrderBook(coin).catch(() => undefined),
        fetchFuturesSentiment(coin).catch(() => undefined)
      ]);

      if (!candles || candles.length < 50) continue;

      const signal = generateSignal({ 
        coin, 
        timeframe: fastTimeframe, 
        candles, 
        htfCandles,
        orderBook,
        futures,
        riskSettings: {
          ...(settings.riskSettings || DEFAULT_SETTINGS.riskSettings),
          minRiskReward: Math.min(settings.riskSettings?.minRiskReward ?? 2, 1.5),
        }
      });

      if (!signal) continue;

      if (signal.status === 'ACTIVE' && (signal.grade === 'A' || signal.grade === 'B')) {
        if (lastSignalSent[coin] === signal.timestamp) continue;
        
        console.log(`[Scanner] ${signal.grade}-Grade ${signal.direction} signal (15m) found for ${coin}!`);
        try {
          await SignalModel.create(signal);
          
          // Auto Paper-Trading Entry for 15m
          const riskSettings = settings.riskSettings;
          const riskDollars = (riskSettings.totalCapital * riskSettings.riskPerTrade) / 100;
          let slDistance = Math.abs(signal.entryPriceHigh - signal.stopLoss);
          if (!slDistance || slDistance <= 0 || isNaN(slDistance)) {
            slDistance = signal.entryPriceHigh * 0.02; // 2% fallback distance
          }
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
          console.log(`[Scanner] Auto Trade Opened for ${coin} (15m) - Qty: ${quantity.toFixed(4)}`);

        } catch (dbError: any) {
          if (dbError.code !== 11000) console.error('[Scanner] Failed to save 15m signal/trade:', dbError);
        }

        if (token && chatId) {
          const success = await sendTelegramSignal(chatId, token, signal);
          if (success) {
            lastSignalSent[coin] = signal.timestamp;
            console.log(`[Scanner] Telegram signal sent for ${coin} (15m)`);

            if (settings.geminiApiKey) {
              try {
                const currentPrice = candles[candles.length - 1].close;
                const aiAnalysis = await generateSignalAnalysis(settings.geminiApiKey, signal, currentPrice);
                if (aiAnalysis) {
                  await sendMarketBriefing(chatId, token, `🤖 *AI Signal Analysis*\n\n${aiAnalysis}`);
                }
              } catch (aiError) {
                console.error('[Scanner] AI analysis failed:', aiError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`[Scanner] Error analyzing ${coin} on 15m:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[Scanner] Background scan complete.');
}
