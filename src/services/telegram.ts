import TelegramBot from 'node-telegram-bot-api';
import type { Signal } from '@/engine/types';

let bot: TelegramBot | null = null;

export function getTelegramBot(token: string) {
  if (!bot && token) {
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
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
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}
