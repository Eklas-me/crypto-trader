// ============================================================================
// CryptoTrader Pro — 12-Layer Signal Engine
// Combines all analysis layers → generates BUY/SELL signals with grading
// ============================================================================

import type {
  Candle, Signal, SignalGrade, SignalDirection, LayerResult,
  Timeframe, FearGreedData, FuturesSentiment, MarketCorrelation,
  OrderBookAnalysis, RiskSettings,
} from './types';
import { calculateAllIndicators, calculateEMA } from './indicators';
import { analyzeMarketStructure } from './market-structure';
import { detectAllPatterns } from './patterns';
import { analyzeSMC } from './smartmoney';
import { calculateFibonacci, isPriceAtFibLevel } from './fibonacci';
import { detectSRLevels, detectSupplyDemandZones, isPriceNearSR, isPriceInSDZone } from './support-resistance';
import { calculateVolumeProfile, calculateCVD, isVolumeConfirmed, detectVolumeSpikes } from './volume-analysis';
import { calculateATR } from './indicators';

// ─── Layer Analysis Functions ───────────────────────────────────────────────

/**
 * Layer 1: Market Regime (ADX + Bollinger Width)
 * Determines if market is trending, ranging, or choppy
 */
function analyzeLayer1_MarketRegime(candles: Candle[]): LayerResult {
  const indicators = calculateAllIndicators(candles);
  const { currentADX, isTrending } = indicators.adx;
  const { currentWidth } = indicators.bollingerBands;

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  if (isTrending) {
    // In trending market, determine direction
    if (indicators.adx.currentPlusDI > indicators.adx.currentMinusDI) {
      signal = 'BULLISH';
      details = `Trending market (ADX: ${currentADX.toFixed(1)}) — Bullish momentum dominant`;
    } else {
      signal = 'BEARISH';
      details = `Trending market (ADX: ${currentADX.toFixed(1)}) — Bearish momentum dominant`;
    }
    confidence = Math.min(90, 50 + currentADX);
  } else if (currentADX < 20) {
    signal = 'NEUTRAL';
    details = `Ranging/Choppy market (ADX: ${currentADX.toFixed(1)}) — Caution`;
    confidence = 30;
  }

  return { name: 'Market Regime', signal, confidence, details };
}

/**
 * Layer 2: Higher Timeframe Trend (EMA 50/200 alignment)
 */
function analyzeLayer2_HTFTrend(candles: Candle[]): LayerResult {
  const closes = candles.map(c => c.close);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const currentPrice = closes[closes.length - 1];

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  if (ema50.current > ema200.current && currentPrice > ema50.current) {
    signal = 'BULLISH';
    details = 'Price > EMA50 > EMA200 — Strong bullish structure';
    confidence = 85;
  } else if (ema50.current > ema200.current && currentPrice < ema50.current) {
    signal = 'BULLISH';
    details = 'EMA50 > EMA200 (Golden Cross) but price pullback — Cautious bullish';
    confidence = 60;
  } else if (ema50.current < ema200.current && currentPrice < ema50.current) {
    signal = 'BEARISH';
    details = 'Price < EMA50 < EMA200 — Strong bearish structure';
    confidence = 85;
  } else if (ema50.current < ema200.current && currentPrice > ema50.current) {
    signal = 'BEARISH';
    details = 'EMA50 < EMA200 (Death Cross) but price bounce — Cautious bearish';
    confidence = 60;
  }

  return { name: 'HTF Trend', signal, confidence, details };
}

/**
 * Layer 3: Smart Money Concepts (Order Blocks + FVG + Liquidity)
 */
function analyzeLayer3_SMC(candles: Candle[]): LayerResult {
  const smc = analyzeSMC(candles);
  const currentPrice = candles[candles.length - 1].close;

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  // Check if price is at a bullish order block
  const bullishOBs = smc.orderBlocks.filter(ob => ob.type === 'BULLISH' && !ob.isBreaker);
  const bearishOBs = smc.orderBlocks.filter(ob => ob.type === 'BEARISH' && !ob.isBreaker);

  for (const ob of bullishOBs) {
    if (currentPrice >= ob.low && currentPrice <= ob.high) {
      signal = 'BULLISH';
      details = `Price at Bullish Order Block ($${ob.low.toFixed(2)}-$${ob.high.toFixed(2)})`;
      confidence = ob.isMitigated ? 60 : 80;
      break;
    }
  }

  for (const ob of bearishOBs) {
    if (currentPrice >= ob.low && currentPrice <= ob.high) {
      signal = 'BEARISH';
      details = `Price at Bearish Order Block ($${ob.low.toFixed(2)}-$${ob.high.toFixed(2)})`;
      confidence = ob.isMitigated ? 60 : 80;
      break;
    }
  }

  // Check premium/discount zone
  if (signal === 'NEUTRAL') {
    if (currentPrice <= smc.discountZone.high) {
      signal = 'BULLISH';
      details = `Price in Discount Zone (below equilibrium $${smc.equilibrium.toFixed(2)})`;
      confidence = 65;
    } else if (currentPrice >= smc.premiumZone.low) {
      signal = 'BEARISH';
      details = `Price in Premium Zone (above equilibrium $${smc.equilibrium.toFixed(2)})`;
      confidence = 65;
    }
  }

  // Check recent liquidity sweeps
  const recentSweeps = smc.liquiditySweeps.filter(
    s => s.index >= candles.length - 5,
  );
  if (recentSweeps.length > 0) {
    const lastSweep = recentSweeps[recentSweeps.length - 1];
    if (lastSweep.type === 'SELL_SIDE') {
      signal = 'BULLISH';
      details = `Sell-side liquidity sweep at $${lastSweep.price.toFixed(2)} — Smart money buying`;
      confidence = 75;
    } else {
      signal = 'BEARISH';
      details = `Buy-side liquidity sweep at $${lastSweep.price.toFixed(2)} — Smart money selling`;
      confidence = 75;
    }
  }

  return { name: 'Smart Money', signal, confidence, details };
}

/**
 * Layer 4: Volume Profile (POC + Value Area)
 */
function analyzeLayer4_VolumeProfile(candles: Candle[]): LayerResult {
  const vp = calculateVolumeProfile(candles);
  const cvd = calculateCVD(candles);
  const currentPrice = candles[candles.length - 1].close;

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  // Price below VAL = potential buy zone (below value)
  if (currentPrice < vp.val) {
    signal = 'BULLISH';
    details = `Price below Value Area Low ($${vp.val.toFixed(2)}) — Undervalued`;
    confidence = 70;
  }
  // Price above VAH = potential sell zone (above value)
  else if (currentPrice > vp.vah) {
    signal = 'BEARISH';
    details = `Price above Value Area High ($${vp.vah.toFixed(2)}) — Overextended`;
    confidence = 70;
  }
  // Price near POC = strong support/resistance
  else if (Math.abs(currentPrice - vp.poc) / vp.poc < 0.005) {
    signal = cvd.trend === 'RISING' ? 'BULLISH' : cvd.trend === 'FALLING' ? 'BEARISH' : 'NEUTRAL';
    details = `Price at POC ($${vp.poc.toFixed(2)}) — CVD ${cvd.trend}`;
    confidence = 60;
  }

  return { name: 'Volume Profile', signal, confidence, details };
}

/**
 * Layer 5: Momentum (RSI + Divergence)
 */
function analyzeLayer5_Momentum(candles: Candle[]): LayerResult {
  const indicators = calculateAllIndicators(candles);
  const { rsi, stochRSI, divergences } = indicators;

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  // Check for divergences first (strongest signal)
  const recentDivergences = divergences.filter(
    d => d.endIndex >= candles.length - 10,
  );

  if (recentDivergences.length > 0) {
    const bullishDiv = recentDivergences.find(d => d.type === 'BULLISH');
    const bearishDiv = recentDivergences.find(d => d.type === 'BEARISH');

    if (bullishDiv && rsi.isOversold) {
      signal = 'BULLISH';
      details = `Bullish ${bullishDiv.indicator} divergence + RSI oversold (${rsi.current.toFixed(1)})`;
      confidence = 85;
    } else if (bearishDiv && rsi.isOverbought) {
      signal = 'BEARISH';
      details = `Bearish ${bearishDiv.indicator} divergence + RSI overbought (${rsi.current.toFixed(1)})`;
      confidence = 85;
    } else if (bullishDiv) {
      signal = 'BULLISH';
      details = `Bullish ${bullishDiv.indicator} divergence detected`;
      confidence = 70;
    } else if (bearishDiv) {
      signal = 'BEARISH';
      details = `Bearish ${bearishDiv.indicator} divergence detected`;
      confidence = 70;
    }
  }
  // RSI alone
  else if (rsi.isOversold) {
    signal = 'BULLISH';
    details = `RSI oversold (${rsi.current.toFixed(1)})`;
    confidence = 65;
  } else if (rsi.isOverbought) {
    signal = 'BEARISH';
    details = `RSI overbought (${rsi.current.toFixed(1)})`;
    confidence = 65;
  }

  return { name: 'Momentum', signal, confidence, details };
}

/**
 * Layer 6: Trend Indicators (EMA Cross + MACD)
 */
function analyzeLayer6_Trend(candles: Candle[]): LayerResult {
  const indicators = calculateAllIndicators(candles);
  const { macd, ema20, ema50 } = indicators;
  const currentPrice = candles[candles.length - 1].close;

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  const emaBullish = ema20.current > ema50.current && currentPrice > ema20.current;
  const emaBearish = ema20.current < ema50.current && currentPrice < ema20.current;

  if (macd.isBullishCross && emaBullish) {
    signal = 'BULLISH';
    details = 'MACD bullish crossover + Price above EMA 20 > 50';
    confidence = 80;
  } else if (macd.isBearishCross && emaBearish) {
    signal = 'BEARISH';
    details = 'MACD bearish crossover + Price below EMA 20 < 50';
    confidence = 80;
  } else if (emaBullish) {
    signal = 'BULLISH';
    details = `Price above EMA 20 ($${ema20.current.toFixed(2)}) > EMA 50 ($${ema50.current.toFixed(2)})`;
    confidence = 65;
  } else if (emaBearish) {
    signal = 'BEARISH';
    details = `Price below EMA 20 ($${ema20.current.toFixed(2)}) < EMA 50 ($${ema50.current.toFixed(2)})`;
    confidence = 65;
  }

  return { name: 'Trend', signal, confidence, details };
}

/**
 * Layer 7: Market Sentiment (Fear & Greed + Volume Spike)
 */
function analyzeLayer7_Sentiment(
  candles: Candle[],
  fearGreed?: FearGreedData,
): LayerResult {
  const volumeSpikes = detectVolumeSpikes(candles);
  const volConfirm = isVolumeConfirmed(candles);

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  if (fearGreed) {
    if (fearGreed.value <= 25) {
      signal = 'BULLISH';
      details = `Extreme Fear (${fearGreed.value}) — Contrarian buy opportunity`;
      confidence = 75;
    } else if (fearGreed.value <= 40) {
      signal = 'BULLISH';
      details = `Fear (${fearGreed.value}) — Buy opportunity`;
      confidence = 60;
    } else if (fearGreed.value >= 75) {
      signal = 'BEARISH';
      details = `Extreme Greed (${fearGreed.value}) — Sell/Take profit zone`;
      confidence = 75;
    } else if (fearGreed.value >= 60) {
      signal = 'BEARISH';
      details = `Greed (${fearGreed.value}) — Caution`;
      confidence = 55;
    }
  }

  // Volume spike adds confidence
  const recentSpikes = volumeSpikes.filter(s => s.index >= candles.length - 3);
  if (recentSpikes.length > 0) {
    confidence += 10;
    details += ` | Volume spike detected (${recentSpikes[0].multiplier.toFixed(1)}x avg)`;
  }

  return { name: 'Sentiment', signal, confidence: Math.min(95, confidence), details };
}

/**
 * Layer 8: Candlestick Patterns
 */
function analyzeLayer8_CandlestickPatterns(candles: Candle[]): LayerResult {
  const { candlestick } = detectAllPatterns(candles);
  const recentPatterns = candlestick.filter(p => p.index >= candles.length - 3);

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  if (recentPatterns.length > 0) {
    const strongest = recentPatterns.reduce((a, b) => a.confidence > b.confidence ? a : b);
    signal = strongest.signal;
    details = `${strongest.name.replace(/_/g, ' ')} pattern detected`;
    confidence = strongest.confidence;
  }

  return { name: 'Candle Patterns', signal, confidence, details };
}

/**
 * Layer 9: Fibonacci Levels
 */
function analyzeLayer9_Fibonacci(candles: Candle[]): LayerResult {
  const fib = calculateFibonacci(candles);
  const currentPrice = candles[candles.length - 1].close;
  const fibCheck = isPriceAtFibLevel(currentPrice, fib);

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  if (fibCheck.isInGoldenZone) {
    signal = fib.trend === 'UP' ? 'BULLISH' : 'BEARISH';
    details = `Price in Fibonacci Golden Zone (0.618-0.786)`;
    confidence = 80;
  } else if (fibCheck.isAtLevel && fibCheck.level) {
    signal = fib.trend === 'UP' ? 'BULLISH' : 'BEARISH';
    details = `Price at Fibonacci ${fibCheck.level.label} ($${fibCheck.level.price.toFixed(2)})`;
    confidence = 65;
  }

  return { name: 'Fibonacci', signal, confidence, details };
}

/**
 * Layer 10: Order Book Depth (requires external data)
 */
function analyzeLayer10_OrderBook(orderBook?: OrderBookAnalysis): LayerResult {
  if (!orderBook) {
    return { name: 'Order Book', signal: 'NEUTRAL', confidence: 0, details: 'No order book data available' };
  }

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = orderBook.imbalance;
  let confidence = 50;
  let details = `Bid/Ask ratio: ${orderBook.bidAskRatio.toFixed(2)}`;

  if (orderBook.bidAskRatio > 1.5) {
    confidence = 75;
    details += ' — Strong buying pressure';
  } else if (orderBook.bidAskRatio < 0.67) {
    confidence = 75;
    details += ' — Strong selling pressure';
  }

  const whaleWalls = orderBook.walls.filter(w => w.isWhale);
  if (whaleWalls.length > 0) {
    const bidWalls = whaleWalls.filter(w => w.type === 'BID');
    const askWalls = whaleWalls.filter(w => w.type === 'ASK');
    details += ` | ${bidWalls.length} bid walls, ${askWalls.length} ask walls`;
  }

  return { name: 'Order Book', signal, confidence, details };
}

/**
 * Layer 11: Futures Sentiment (L/S ratio + Funding + OI)
 */
function analyzeLayer11_Futures(futures?: FuturesSentiment): LayerResult {
  if (!futures) {
    return { name: 'Futures', signal: 'NEUTRAL', confidence: 0, details: 'No futures data' };
  }

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  // Funding rate analysis
  if (futures.fundingRate > 0.05) {
    signal = 'BEARISH'; // Over-leveraged longs = potential crash
    details = `High funding rate (${(futures.fundingRate * 100).toFixed(3)}%) — Longs overleveraged`;
    confidence = 70;
  } else if (futures.fundingRate < -0.05) {
    signal = 'BULLISH'; // Over-leveraged shorts = potential squeeze
    details = `Negative funding (${(futures.fundingRate * 100).toFixed(3)}%) — Short squeeze possible`;
    confidence = 70;
  }

  // L/S ratio (contrarian when extreme)
  if (futures.longShortRatio > 2.5) {
    signal = 'BEARISH'; // Too many longs = contrarian bearish
    details += ` | L/S ratio ${futures.longShortRatio.toFixed(2)} — Crowded long`;
    confidence = Math.min(80, confidence + 10);
  } else if (futures.longShortRatio < 0.5) {
    signal = 'BULLISH'; // Too many shorts = contrarian bullish
    details += ` | L/S ratio ${futures.longShortRatio.toFixed(2)} — Crowded short`;
    confidence = Math.min(80, confidence + 10);
  }

  return { name: 'Futures', signal, confidence, details };
}

/**
 * Layer 12: Market Correlation (BTC Dominance + USDT Dominance)
 */
function analyzeLayer12_Correlation(
  coin: string,
  correlation?: MarketCorrelation,
): LayerResult {
  if (!correlation) {
    return { name: 'Correlation', signal: 'NEUTRAL', confidence: 0, details: 'No correlation data' };
  }

  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let details = '';
  let confidence = 50;

  const isBTC = coin.toUpperCase().startsWith('BTC');

  if (isBTC) {
    // For BTC, look at USDT dominance
    if (correlation.usdtDominance < 4) {
      signal = 'BULLISH';
      details = 'Low USDT dominance — Money flowing into crypto';
      confidence = 65;
    } else if (correlation.usdtDominance > 7) {
      signal = 'BEARISH';
      details = 'High USDT dominance — Money flowing to stablecoins';
      confidence = 65;
    }
  } else {
    // For altcoins, BTC dominance matters more
    if (correlation.isAltseason) {
      signal = 'BULLISH';
      details = `Altseason detected — BTC.D falling (${correlation.btcDominance.toFixed(1)}%)`;
      confidence = 75;
    } else if (correlation.btcDomChange24h > 1) {
      signal = 'BEARISH';
      details = `BTC dominance rising (${correlation.btcDominance.toFixed(1)}%) — Bad for alts`;
      confidence = 65;
    }

    // Market phase
    if (correlation.marketPhase === 'EVERYTHING_DOWN') {
      signal = 'BEARISH';
      details = 'Everything dropping — Stay out';
      confidence = 80;
    }
  }

  return { name: 'Correlation', signal, confidence, details };
}

// ─── Master Signal Generator ────────────────────────────────────────────────

export interface SignalInput {
  candles: Candle[];
  coin: string;
  timeframe: Timeframe;
  fearGreed?: FearGreedData;
  futures?: FuturesSentiment;
  correlation?: MarketCorrelation;
  orderBook?: OrderBookAnalysis;
  riskSettings: RiskSettings;
}

export function generateSignal(input: SignalInput): Signal | null {
  const {
    candles, coin, timeframe, fearGreed, futures, correlation, orderBook, riskSettings,
  } = input;

  if (candles.length < 200) return null; // Need enough data

  // Run all 12 layers
  const layers: LayerResult[] = [
    analyzeLayer1_MarketRegime(candles),
    analyzeLayer2_HTFTrend(candles),
    analyzeLayer3_SMC(candles),
    analyzeLayer4_VolumeProfile(candles),
    analyzeLayer5_Momentum(candles),
    analyzeLayer6_Trend(candles),
    analyzeLayer7_Sentiment(candles, fearGreed),
    analyzeLayer8_CandlestickPatterns(candles),
    analyzeLayer9_Fibonacci(candles),
    analyzeLayer10_OrderBook(orderBook),
    analyzeLayer11_Futures(futures),
    analyzeLayer12_Correlation(coin, correlation),
  ];

  // Count how many layers agree on bullish vs bearish
  const activeLayers = layers.filter(l => l.confidence > 0);
  const bullishLayers = activeLayers.filter(l => l.signal === 'BULLISH');
  const bearishLayers = activeLayers.filter(l => l.signal === 'BEARISH');

  const totalActive = activeLayers.length;
  const bullishCount = bullishLayers.length;
  const bearishCount = bearishLayers.length;

  // Determine direction
  let direction: SignalDirection = 'HOLD';
  let layersAgreed = 0;

  if (bullishCount > bearishCount && bullishCount >= 5) {
    direction = 'BUY';
    layersAgreed = bullishCount;
  } else if (bearishCount > bullishCount && bearishCount >= 5) {
    direction = 'SELL';
    layersAgreed = bearishCount;
  } else {
    return null; // Not enough confluence
  }

  // Grade the signal
  const grade = gradeSignal(layersAgreed, totalActive);

  // Calculate confidence
  const avgConfidence = (direction === 'BUY' ? bullishLayers : bearishLayers)
    .reduce((sum, l) => sum + l.confidence, 0) / layersAgreed;
  const confidence = Math.round((layersAgreed / totalActive) * avgConfidence);

  // Calculate entry, TP, SL
  const currentPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles);

  const atrValue = atr.current;
  const entryPriceLow = direction === 'BUY'
    ? currentPrice - atrValue * 0.2
    : currentPrice - atrValue * 0.5;
  const entryPriceHigh = direction === 'BUY'
    ? currentPrice + atrValue * 0.2
    : currentPrice + atrValue * 0.5;

  const stopLoss = direction === 'BUY'
    ? currentPrice - atrValue * 1.5
    : currentPrice + atrValue * 1.5;

  const riskDistance = Math.abs(currentPrice - stopLoss);
  const tp1 = direction === 'BUY'
    ? currentPrice + riskDistance * 1.5
    : currentPrice - riskDistance * 1.5;
  const tp2 = direction === 'BUY'
    ? currentPrice + riskDistance * 2.5
    : currentPrice - riskDistance * 2.5;
  const tp3 = direction === 'BUY'
    ? currentPrice + riskDistance * 3.5
    : currentPrice - riskDistance * 3.5;

  const riskRewardRatio = riskDistance > 0 ? (Math.abs(tp2 - currentPrice) / riskDistance) : 0;

  // Check minimum R:R
  if (riskRewardRatio < riskSettings.minRiskReward) {
    return null;
  }

  // Get detected patterns
  const allPatterns = detectAllPatterns(candles);
  const recentCandlePatterns = allPatterns.candlestick.filter(p => p.index >= candles.length - 5);
  const recentChartPatterns = allPatterns.chart.filter(p => p.index >= candles.length - 20);

  const signal: Signal = {
    id: `${coin}-${timeframe}-${Date.now()}`,
    coin,
    timeframe,
    direction,
    grade,
    confidence,
    layersAgreed,
    layers,
    entryPriceLow: Math.round(entryPriceLow * 100) / 100,
    entryPriceHigh: Math.round(entryPriceHigh * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    tp1: Math.round(tp1 * 100) / 100,
    tp2: Math.round(tp2 * 100) / 100,
    tp3: Math.round(tp3 * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 10) / 10,
    candlePatterns: recentCandlePatterns,
    chartPatterns: recentChartPatterns,
    timestamp: Date.now(),
    expiresAt: Date.now() + getExpiryMs(timeframe),
    status: 'ACTIVE',
  };

  return signal;
}

// ─── Signal Grading ─────────────────────────────────────────────────────────

function gradeSignal(layersAgreed: number, totalLayers: number): SignalGrade {
  const ratio = layersAgreed / Math.max(totalLayers, 1);

  if (layersAgreed >= 10 || ratio >= 0.85) return 'A';
  if (layersAgreed >= 8 || ratio >= 0.7) return 'B';
  if (layersAgreed >= 6 || ratio >= 0.55) return 'C';
  return 'NONE';
}

function getExpiryMs(timeframe: Timeframe): number {
  const map: Record<Timeframe, number> = {
    '1m': 15 * 60_000,       // 15 minutes
    '5m': 60 * 60_000,       // 1 hour
    '15m': 4 * 3_600_000,    // 4 hours
    '1h': 24 * 3_600_000,    // 24 hours
    '4h': 3 * 86_400_000,    // 3 days
    '1d': 7 * 86_400_000,    // 7 days
    '1w': 30 * 86_400_000,   // 30 days
  };
  return map[timeframe];
}

// ─── Market Direction Meter ─────────────────────────────────────────────────

export interface MarketDirection {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  probability: number;
  summary: string;
  layerBreakdown: LayerResult[];
}

export function getMarketDirection(input: SignalInput): MarketDirection {
  const { candles, coin, fearGreed, futures, correlation, orderBook } = input;

  const layers: LayerResult[] = [
    analyzeLayer1_MarketRegime(candles),
    analyzeLayer2_HTFTrend(candles),
    analyzeLayer3_SMC(candles),
    analyzeLayer5_Momentum(candles),
    analyzeLayer6_Trend(candles),
    analyzeLayer7_Sentiment(candles, fearGreed),
    analyzeLayer11_Futures(futures),
    analyzeLayer12_Correlation(coin, correlation),
  ];

  const activeLayers = layers.filter(l => l.confidence > 0);
  const bullish = activeLayers.filter(l => l.signal === 'BULLISH').length;
  const bearish = activeLayers.filter(l => l.signal === 'BEARISH').length;
  const total = activeLayers.length || 1;

  let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  let probability: number;

  if (bullish > bearish) {
    direction = 'BULLISH';
    probability = Math.round((bullish / total) * 100);
  } else if (bearish > bullish) {
    direction = 'BEARISH';
    probability = Math.round((bearish / total) * 100);
  } else {
    direction = 'NEUTRAL';
    probability = 50;
  }

  const timeframeLabel = input.timeframe === '1h' ? '24 hours' :
    input.timeframe === '4h' ? '2-3 days' : input.timeframe === '1d' ? '1-2 weeks' : 'short term';

  const summary = direction === 'NEUTRAL'
    ? `Market is undecided. No clear direction in the next ${timeframeLabel}.`
    : `Market is likely going ${direction === 'BULLISH' ? 'UP ▲' : 'DOWN ▼'} in the next ${timeframeLabel} (${probability}% probability)`;

  return { direction, probability, summary, layerBreakdown: layers };
}
