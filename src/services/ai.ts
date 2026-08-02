import type { Signal, LayerResult } from '@/engine/types';

interface MarketData {
  coin: string;
  price: number;
  timeframe: string;
  layers: LayerResult[];
  confidence: number;
  direction: string;
  grade: string;
}

async function callGemini(apiKey: string, prompt: string, maxTokens = 2500): Promise<string | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
    })
  });
  if (!response.ok) {
    console.error('Gemini API Error:', await response.text());
    return null;
  }
  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export async function generateMarketBriefing(apiKey: string, data: MarketData, isAlert: boolean = false): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const prompt = isAlert ? generateAlertPrompt(data) : generateBriefingPrompt(data);
    return await callGemini(apiKey, prompt, 2500);
  } catch (error) {
    console.error('Failed to generate market briefing:', error);
    return null;
  }
}

export async function generateSignalAnalysis(apiKey: string, signal: Signal, currentPrice: number): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const prompt = generateSignalPrompt(signal, currentPrice);
    return await callGemini(apiKey, prompt, 2000);
  } catch (error) {
    console.error('Failed to generate signal analysis:', error);
    return null;
  }
}

function generateBriefingPrompt(data: MarketData): string {
  const layerSummary = data.layers.map(l => `- ${l.name}: ${l.signal} (Confidence: ${Math.round(l.confidence)}%) - ${l.details}`).join('\n');
  
  return `
You are a highly experienced quantitative crypto analyst and trader. 
Analyze the following technical data for ${data.coin} on the ${data.timeframe} timeframe and provide a comprehensive "Market Briefing" in Bengali (with necessary English trading terms).

Current Price: $${data.price}
Algorithm Signal Direction: ${data.direction} (Grade: ${data.grade}, Algorithmic Confidence: ${Math.round(data.confidence)}%)

Technical Layer Analysis:
${layerSummary}

Instructions for the Briefing:
1. Write in clear, professional Bengali mixed with standard English trading terminology (e.g., Support, Resistance, Breakout, Whale, Order Block).
2. Summarize the overall market structure and sentiment based on the 12 layers.
3. Don't just list the layers; Synthesize what they mean together (e.g., "Since RSI is oversold and price is near a bullish order block, a bounce is highly probable...").
4. Keep it concise but highly informative (2-3 short paragraphs).
5. Add a "💡 AI Advice:" at the end giving a clear recommendation (e.g., Wait for confirmation, look for longs, stay out of the market).
6. Format with Telegram-friendly markdown and emojis.
`;
}

function generateAlertPrompt(data: MarketData): string {
  const layerSummary = data.layers.map(l => `- ${l.name}: ${l.signal} (${l.details})`).join('\n');
  
  return `
You are an AI Risk Manager for a crypto trading algorithm. 
A sudden market shift has been detected for ${data.coin} on the ${data.timeframe} timeframe. Provide an urgent "Emergency Alert" in Bengali.

Current Price: $${data.price}
Algorithm Signal Direction: ${data.direction}

Technical Layer Analysis:
${layerSummary}

Instructions for the Alert:
1. Write in urgent, professional Bengali mixed with English trading terms.
2. Explain what is likely happening based on the data (e.g., sudden dump breaking support, or huge whale buy volume).
3. Provide immediate actionable advice (e.g., "Close long positions", "Tighten stop loss", "Do not FOMO buy").
4. Keep it very short and punchy (Max 4-5 sentences).
5. Format with emojis and bold text for Telegram.
`;
}

function generateSignalPrompt(signal: Signal, currentPrice: number): string {
  const tradeTypeLabel = signal.tradeType === 'SCALPING' ? '⚡ Scalping' 
    : signal.tradeType === 'INTRADAY' ? '📈 Intraday' 
    : '🌊 Swing';

  const directionLabel = signal.direction === 'BUY' ? 'LONG (Buy)' : 'SHORT (Sell)';
  const layerSummary = signal.layers.map(l => `- ${l.name}: ${l.signal} (${Math.round(l.confidence)}%) — ${l.details}`).join('\n');

  return `
You are an expert crypto trading analyst. Our algorithm just generated a ${signal.grade}-Grade ${directionLabel} signal for ${signal.coin}.
Trade Type: ${tradeTypeLabel}

Signal Details:
- Current Price: $${currentPrice}
- Direction: ${directionLabel}
- Grade: ${signal.grade} (${signal.layersAgreed} layers agreed)
- Confidence: ${signal.confidence}%
- Entry Zone: $${signal.entryPriceLow} to $${signal.entryPriceHigh}
- Stop Loss: $${signal.stopLoss}
- Take Profit 1: $${signal.tp1}
- Take Profit 2: $${signal.tp2}
- Risk/Reward: 1:${signal.riskRewardRatio}

Technical Layer Breakdown:
${layerSummary}

Instructions:
1. Write entirely in Bengali (with English trading terms where needed).
2. This is a SIGNAL ANALYSIS — explain WHY this specific signal triggered.
3. Highlight the key confirming layers and why they matter.
4. Point out any risks or layers that did NOT agree and what the trader should watch for.
5. Give a trade management tip for a ${tradeTypeLabel} trade (how tight to set the stop, when to move SL to breakeven).
6. End with "Warning:" — one sentence risk warning.
7. Keep it to 3 focused paragraphs. Use Telegram markdown.
`;
}
