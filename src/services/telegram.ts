import TelegramBot from 'node-telegram-bot-api';
import type { Signal } from '@/engine/types';

let bot: TelegramBot | null = null;
let isPollingStarted = false;

export function getTelegramBot(token: string) {
  if (!bot && token) {
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
}

export function startTelegramPolling(token: string, onAnalyze: (chatId: string, coin: string) => void) {
  if (!token) return;
  
  if (!bot) {
    bot = new TelegramBot(token, { polling: true });
    isPollingStarted = true;
  } else if (!isPollingStarted) {
    bot.stopPolling().then(() => bot?.startPolling());
    isPollingStarted = true;
  }

  // Handle /analyze command
  bot.onText(/\/analyze (.+)/, (msg, match) => {
    const chatId = msg.chat.id.toString();
    const coin = match?.[1]?.toUpperCase() || '';
    
    if (coin) {
      bot?.sendMessage(chatId, `⏳ Analyzing ${coin}... Please wait a moment.`, { parse_mode: 'Markdown' });
      onAnalyze(chatId, coin);
    } else {
      bot?.sendMessage(chatId, '❌ Please provide a coin. Example: `/analyze BTCUSDT`', { parse_mode: 'Markdown' });
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram Polling Error:', error);
  });
}

export async function sendMarketBriefing(chatId: string, token: string, text: string) {
  if (!chatId || !token) return false;
  const botInstance = getTelegramBot(token);
  if (!botInstance) return false;
  
  // Convert standard markdown to Telegram-friendly markdown
  // AI usually outputs **bold**, Telegram expects *bold*
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
  
  try {
    await botInstance.sendMessage(chatId, formattedText, { parse_mode: 'Markdown' });
    return true;
  } catch (error: any) {
    console.error('Markdown parsing failed, falling back to plain text. Error:', error.message);
    try {
      // Fallback: send without parse_mode so it doesn't crash if entities are broken
      await botInstance.sendMessage(chatId, text);
      return true;
    } catch (fallbackError) {
      console.error('Failed to send Telegram briefing entirely:', fallbackError);
      return false;
    }
  }
}

export async function sendTelegramSignal(chatId: string, token: string, signal: Signal) {
  if (!chatId || !token) return false;
  
  const botInstance = getTelegramBot(token);
  if (!botInstance) return false;

  const isBuy = signal.direction === 'BUY';
  const emoji = isBuy ? '🟢' : '🔴';
  
  const message = `
${emoji} *${signal.grade}-GRADE SIGNAL: ${signal.coin}* ${emoji}

*Direction:* ${isBuy ? 'LONG (Buy)' : 'SHORT (Sell)'}
*Timeframe:* ${signal.timeframe}
*Confidence:* ${signal.confidence}% (${signal.layersAgreed}/12 layers agreed)

🎯 *Entry Zone:* $${signal.entryPriceLow.toLocaleString()} - $${signal.entryPriceHigh.toLocaleString()}
🛑 *Stop Loss:* $${signal.stopLoss.toLocaleString()}

💰 *Take Profit 1:* $${signal.tp1.toLocaleString()}
💰 *Take Profit 2:* $${signal.tp2.toLocaleString()}
💰 *Take Profit 3:* $${signal.tp3.toLocaleString()}

⚖️ *Risk:Reward:* 1:${signal.riskRewardRatio}

_Automated alert from CryptoTrader Pro_
  `;

  try {
    await botInstance.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram signal:', error);
    return false;
  }
}
