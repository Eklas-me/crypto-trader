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

export async function generateMarketBriefing(apiKey: string, data: MarketData, isAlert: boolean = false): Promise<string | null> {
  if (!apiKey) return null;

  try {
    const prompt = isAlert 
      ? generateAlertPrompt(data)
      : generateBriefingPrompt(data);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API Error:', await response.text());
      return null;
    }

    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Failed to generate market briefing:', error);
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
5. Format with 🚨 emojis and bold text for Telegram.
`;
}
