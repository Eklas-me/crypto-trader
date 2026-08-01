import cron from 'node-cron';
import { startTelegramPolling, sendMarketBriefing } from '@/services/telegram';
import { generateMarketBriefing } from '@/services/ai';
import { fetchKlines } from '@/services/binance-api';
import { generateSignal } from '@/engine/signal-engine';
import { connectDB } from '@/lib/db';
import SettingsModel from '@/models/Settings';
import { DEFAULT_SETTINGS } from '@/engine/types';

export async function startAIBrain() {
  try {
    await connectDB();
    const settingsDoc = await SettingsModel.findOne();
    const settings = settingsDoc?.settings || DEFAULT_SETTINGS;
    const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;

    // 1. Start Telegram Polling for /analyze commands
    if (token) {
      console.log('🤖 [AI Brain] Starting Telegram polling for /analyze...');
      startTelegramPolling(token, async (replyChatId, coin) => {
        try {
          const currentSettingsDoc = await SettingsModel.findOne();
          const currentSettings = currentSettingsDoc?.settings || DEFAULT_SETTINGS;

          if (!currentSettings.geminiApiKey) {
            await sendMarketBriefing(replyChatId, token, '❌ Error: Gemini API Key is missing in Settings.');
            return;
          }

          const candles = await fetchKlines(coin, '1h', 200);
          const htfCandles = await fetchKlines(coin, '4h', 100).catch(() => undefined);
          if (!candles || candles.length < 50) {
            await sendMarketBriefing(replyChatId, token, `❌ Error: Could not fetch enough data for ${coin}. Check if it's a valid Binance pair.`);
            return;
          }

          const signal = generateSignal({ 
            coin, 
            timeframe: '1h', 
            candles, 
            htfCandles, 
            riskSettings: currentSettings.riskSettings || DEFAULT_SETTINGS.riskSettings 
          });

          if (!signal) return;

          const aiResponse = await generateMarketBriefing(currentSettings.geminiApiKey, {
            coin: signal.coin,
            price: candles[candles.length - 1].close,
            timeframe: signal.timeframe,
            layers: signal.layers,
            confidence: signal.confidence,
            direction: signal.direction,
            grade: signal.grade
          });

          if (aiResponse) {
            await sendMarketBriefing(replyChatId, token, aiResponse);
          } else {
            await sendMarketBriefing(replyChatId, token, '❌ Error: AI failed to generate analysis.');
          }
        } catch (error) {
          console.error('[AI Brain] Analysis Error:', error);
          await sendMarketBriefing(replyChatId, token, '❌ An error occurred during analysis.');
        }
      });
    }

    // 2. Schedule Daily Market Briefing (3 times a day in Asia/Dhaka)
    cron.schedule('0 8,16,22 * * *', async () => {
      console.log('🤖 [AI Brain] Generating scheduled market briefing...');
      try {
        const currentSettingsDoc = await SettingsModel.findOne();
        const currentSettings = currentSettingsDoc?.settings || DEFAULT_SETTINGS;
        const currentToken = currentSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
        const currentChatId = currentSettings.telegramChatId || process.env.TELEGRAM_CHAT_ID;

        if (currentSettings.geminiApiKey && currentToken && currentChatId) {
          const coin = 'BTCUSDT'; // Use BTC as the overall market proxy
          const candles = await fetchKlines(coin, '1h', 200);
          const htfCandles = await fetchKlines(coin, '4h', 100).catch(() => undefined);
          
          if (!candles) return;
          
          const signal = generateSignal({ 
            coin, 
            timeframe: '1h', 
            candles, 
            htfCandles, 
            riskSettings: currentSettings.riskSettings || DEFAULT_SETTINGS.riskSettings 
          });
          
          if (signal) {
            const aiResponse = await generateMarketBriefing(currentSettings.geminiApiKey, {
              coin: signal.coin,
              price: candles[candles.length - 1].close,
              timeframe: signal.timeframe,
              layers: signal.layers,
              confidence: signal.confidence,
              direction: signal.direction,
              grade: signal.grade
            });

            if (aiResponse) {
              await sendMarketBriefing(currentChatId, currentToken, '🌅 *Scheduled Market Briefing*\n\n' + aiResponse);
            }
          }
        }
      } catch (error) {
        console.error('[AI Brain] Scheduled Briefing Error:', error);
      }
    }, {
      timezone: 'Asia/Dhaka'
    });

  } catch (error) {
    console.error('[AI Brain] Startup Error:', error);
  }
}
