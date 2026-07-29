// ============================================================================
// CryptoTrader Pro — Market Structure Engine
// HH/HL/LH/LL detection, Trend classification, BOS, CHoCH
// ============================================================================

import type {
  Candle, SwingPoint, SwingPointType, TrendDirection,
  StructureBreak, MarketStructureResult,
} from './types';

// ─── Swing Point Detection ──────────────────────────────────────────────────

/**
 * Detects swing highs and swing lows using a configurable lookback window.
 * A swing high is a candle high that is higher than `strength` candles on both sides.
 * A swing low is a candle low that is lower than `strength` candles on both sides.
 */
export function detectSwingPoints(
  candles: Candle[],
  strength: number = 3,
): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];

  for (let i = strength; i < candles.length - strength; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= strength; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swingPoints.push({
        type: 'HH', // Will be classified later
        price: candles[i].high,
        index: i,
        time: candles[i].time,
      });
    }

    if (isSwingLow) {
      swingPoints.push({
        type: 'HL', // Will be classified later
        price: candles[i].low,
        index: i,
        time: candles[i].time,
      });
    }
  }

  // Sort by index
  swingPoints.sort((a, b) => a.index - b.index);

  return classifySwingPoints(swingPoints);
}

// ─── Classify Swing Points as HH/HL/LH/LL ──────────────────────────────────

function classifySwingPoints(swingPoints: SwingPoint[]): SwingPoint[] {
  if (swingPoints.length < 2) return swingPoints;

  // Separate highs and lows
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (const sp of swingPoints) {
    // Determine if this is a high or low based on its position
    // If it's higher than the average of surrounding points, it's likely a high
    const idx = swingPoints.indexOf(sp);
    const prev = idx > 0 ? swingPoints[idx - 1] : null;

    if (!prev) {
      // First point: classify based on the next point
      const next = swingPoints[idx + 1];
      if (next && sp.price > next.price) {
        highs.push(sp);
      } else {
        lows.push(sp);
      }
    } else if (sp.price > prev.price) {
      highs.push(sp);
    } else {
      lows.push(sp);
    }
  }

  // Classify highs: HH or LH
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      highs[i].type = 'HH';
    } else {
      highs[i].type = highs[i].price > highs[i - 1].price ? 'HH' : 'LH';
    }
  }

  // Classify lows: HL or LL
  for (let i = 0; i < lows.length; i++) {
    if (i === 0) {
      lows[i].type = 'HL';
    } else {
      lows[i].type = lows[i].price > lows[i - 1].price ? 'HL' : 'LL';
    }
  }

  // Merge and sort by index
  const classified = [...highs, ...lows];
  classified.sort((a, b) => a.index - b.index);

  return classified;
}

// ─── Trend Detection ────────────────────────────────────────────────────────

export function detectTrend(swingPoints: SwingPoint[]): TrendDirection {
  if (swingPoints.length < 4) return 'SIDEWAYS';

  const recent = swingPoints.slice(-6); // Last 6 swing points
  const recentHighs = recent.filter(sp => sp.type === 'HH' || sp.type === 'LH');
  const recentLows = recent.filter(sp => sp.type === 'HL' || sp.type === 'LL');

  const hhCount = recentHighs.filter(sp => sp.type === 'HH').length;
  const lhCount = recentHighs.filter(sp => sp.type === 'LH').length;
  const hlCount = recentLows.filter(sp => sp.type === 'HL').length;
  const llCount = recentLows.filter(sp => sp.type === 'LL').length;

  // Uptrend: HH + HL dominant
  if (hhCount >= lhCount && hlCount >= llCount && (hhCount + hlCount) > 2) {
    return 'UPTREND';
  }

  // Downtrend: LH + LL dominant
  if (lhCount >= hhCount && llCount >= hlCount && (lhCount + llCount) > 2) {
    return 'DOWNTREND';
  }

  return 'SIDEWAYS';
}

// ─── Break of Structure (BOS) / Change of Character (CHoCH) ─────────────────

export interface StructureBreakResult {
  type: StructureBreak;
  price: number;
  index: number;
}

export function detectStructureBreak(
  candles: Candle[],
  swingPoints: SwingPoint[],
  currentTrend: TrendDirection,
): StructureBreakResult | null {
  if (swingPoints.length < 3 || candles.length < 2) return null;

  const lastCandle = candles[candles.length - 1];

  // Find last significant swing high and swing low
  const lastSwingHigh = [...swingPoints]
    .filter(sp => sp.type === 'HH' || sp.type === 'LH')
    .pop();
  const lastSwingLow = [...swingPoints]
    .filter(sp => sp.type === 'HL' || sp.type === 'LL')
    .pop();

  if (!lastSwingHigh || !lastSwingLow) return null;

  // BOS in uptrend: Price breaks above last swing high (continuation)
  if (currentTrend === 'UPTREND' && lastCandle.close > lastSwingHigh.price) {
    return {
      type: 'BOS',
      price: lastSwingHigh.price,
      index: candles.length - 1,
    };
  }

  // BOS in downtrend: Price breaks below last swing low (continuation)
  if (currentTrend === 'DOWNTREND' && lastCandle.close < lastSwingLow.price) {
    return {
      type: 'BOS',
      price: lastSwingLow.price,
      index: candles.length - 1,
    };
  }

  // CHoCH in uptrend: Price breaks below last swing low (reversal!)
  if (currentTrend === 'UPTREND' && lastCandle.close < lastSwingLow.price) {
    return {
      type: 'CHoCH',
      price: lastSwingLow.price,
      index: candles.length - 1,
    };
  }

  // CHoCH in downtrend: Price breaks above last swing high (reversal!)
  if (currentTrend === 'DOWNTREND' && lastCandle.close > lastSwingHigh.price) {
    return {
      type: 'CHoCH',
      price: lastSwingHigh.price,
      index: candles.length - 1,
    };
  }

  return null;
}

// ─── Full Market Structure Analysis ─────────────────────────────────────────

export function analyzeMarketStructure(
  candles: Candle[],
  swingStrength: number = 3,
): MarketStructureResult {
  const swingPoints = detectSwingPoints(candles, swingStrength);
  const trend = detectTrend(swingPoints);
  const structureBreak = detectStructureBreak(candles, swingPoints, trend);

  return {
    swingPoints,
    trend,
    lastBOS: structureBreak?.type || null,
    bosIndex: structureBreak?.index || null,
    bosPrice: structureBreak?.price || null,
  };
}
