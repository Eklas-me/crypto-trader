// ============================================================================
// CryptoTrader Pro — Pattern Recognition Engine
// 10 Candlestick Patterns + 14 Chart Patterns
// ============================================================================

import type { Candle, PatternDetection, CandlestickPatternName, ChartPatternName } from './types';
import { detectSwingPoints } from './market-structure';

// ─── Helper Functions ───────────────────────────────────────────────────────

function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open);
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

function totalRange(c: Candle): number {
  return c.high - c.low;
}

function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

// ─── Candlestick Pattern Detection ──────────────────────────────────────────

export function detectCandlestickPatterns(candles: Candle[]): PatternDetection[] {
  const patterns: PatternDetection[] = [];
  const len = candles.length;
  if (len < 3) return patterns;

  for (let i = 2; i < len; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prevPrev = candles[i - 2];
    const range = totalRange(c);
    const body = bodySize(c);

    if (range === 0) continue;
    const bodyRatio = body / range;
    const upperWickRatio = upperWick(c) / range;
    const lowerWickRatio = lowerWick(c) / range;

    // ── HAMMER ──
    // Small body at top, long lower wick (2x+ body), little upper wick
    if (lowerWick(c) >= body * 2 && upperWickRatio < 0.15 && bodyRatio < 0.35) {
      // Check if at potential bottom (previous candles bearish)
      if (isBearish(prev) || isBearish(prevPrev)) {
        patterns.push({
          name: 'HAMMER',
          signal: 'BULLISH',
          confidence: 70,
          index: i,
        });
      }
    }

    // ── INVERTED HAMMER ──
    // Small body at bottom, long upper wick, little lower wick
    if (upperWick(c) >= body * 2 && lowerWickRatio < 0.15 && bodyRatio < 0.35) {
      if (isBearish(prev) || isBearish(prevPrev)) {
        patterns.push({
          name: 'INVERTED_HAMMER',
          signal: 'BULLISH',
          confidence: 60,
          index: i,
        });
      }
    }

    // ── SHOOTING STAR ──
    // Small body at bottom, long upper wick, at potential top
    if (upperWick(c) >= body * 2 && lowerWickRatio < 0.15 && bodyRatio < 0.35) {
      if (isBullish(prev) || isBullish(prevPrev)) {
        patterns.push({
          name: 'SHOOTING_STAR',
          signal: 'BEARISH',
          confidence: 70,
          index: i,
        });
      }
    }

    // ── DOJI ──
    // Very small body relative to range
    if (bodyRatio < 0.1) {
      // Dragonfly Doji: long lower wick, no upper wick
      if (lowerWickRatio > 0.7 && upperWickRatio < 0.1) {
        patterns.push({
          name: 'DRAGONFLY_DOJI',
          signal: 'BULLISH',
          confidence: 65,
          index: i,
        });
      }
      // Gravestone Doji: long upper wick, no lower wick
      else if (upperWickRatio > 0.7 && lowerWickRatio < 0.1) {
        patterns.push({
          name: 'GRAVESTONE_DOJI',
          signal: 'BEARISH',
          confidence: 65,
          index: i,
        });
      }
      // Regular Doji
      else {
        patterns.push({
          name: 'DOJI',
          signal: isBearish(prev) ? 'BULLISH' : 'BEARISH',
          confidence: 55,
          index: i,
        });
      }
    }

    // ── BULLISH ENGULFING ──
    if (isBearish(prev) && isBullish(c) &&
        c.open <= prev.close && c.close >= prev.open &&
        bodySize(c) > bodySize(prev)) {
      patterns.push({
        name: 'BULLISH_ENGULFING',
        signal: 'BULLISH',
        confidence: 80,
        index: i,
      });
    }

    // ── BEARISH ENGULFING ──
    if (isBullish(prev) && isBearish(c) &&
        c.open >= prev.close && c.close <= prev.open &&
        bodySize(c) > bodySize(prev)) {
      patterns.push({
        name: 'BEARISH_ENGULFING',
        signal: 'BEARISH',
        confidence: 80,
        index: i,
      });
    }

    // ── MORNING STAR (3-candle bullish reversal) ──
    if (i >= 2) {
      const first = prevPrev;
      const second = prev;
      const third = c;

      if (isBearish(first) && bodySize(first) > totalRange(first) * 0.5 &&
          bodySize(second) < totalRange(second) * 0.3 &&
          isBullish(third) && bodySize(third) > totalRange(third) * 0.5 &&
          third.close > (first.open + first.close) / 2) {
        patterns.push({
          name: 'MORNING_STAR',
          signal: 'BULLISH',
          confidence: 85,
          index: i,
        });
      }

      // ── EVENING STAR (3-candle bearish reversal) ──
      if (isBullish(first) && bodySize(first) > totalRange(first) * 0.5 &&
          bodySize(second) < totalRange(second) * 0.3 &&
          isBearish(third) && bodySize(third) > totalRange(third) * 0.5 &&
          third.close < (first.open + first.close) / 2) {
        patterns.push({
          name: 'EVENING_STAR',
          signal: 'BEARISH',
          confidence: 85,
          index: i,
        });
      }
    }

    // ── INSIDE BAR ──
    if (c.high < prev.high && c.low > prev.low) {
      patterns.push({
        name: 'INSIDE_BAR',
        signal: isBullish(prev) ? 'BULLISH' : 'BEARISH',
        confidence: 60,
        index: i,
      });
    }

    // ── PIN BAR ──
    // Long wick rejection (at least 2/3 of total range is wick)
    if (lowerWick(c) > range * 0.6 && bodyRatio < 0.25) {
      patterns.push({
        name: 'PIN_BAR',
        signal: 'BULLISH',
        confidence: 75,
        index: i,
      });
    } else if (upperWick(c) > range * 0.6 && bodyRatio < 0.25) {
      patterns.push({
        name: 'PIN_BAR',
        signal: 'BEARISH',
        confidence: 75,
        index: i,
      });
    }

    // ── THREE WHITE SOLDIERS ──
    if (i >= 2 &&
        isBullish(prevPrev) && isBullish(prev) && isBullish(c) &&
        prev.close > prevPrev.close && c.close > prev.close &&
        bodySize(prevPrev) > totalRange(prevPrev) * 0.5 &&
        bodySize(prev) > totalRange(prev) * 0.5 &&
        bodySize(c) > totalRange(c) * 0.5) {
      patterns.push({
        name: 'THREE_WHITE_SOLDIERS' as CandlestickPatternName,
        signal: 'BULLISH',
        confidence: 80,
        index: i,
      });
    }

    // ── THREE BLACK CROWS ──
    if (i >= 2 &&
        isBearish(prevPrev) && isBearish(prev) && isBearish(c) &&
        prev.close < prevPrev.close && c.close < prev.close &&
        bodySize(prevPrev) > totalRange(prevPrev) * 0.5 &&
        bodySize(prev) > totalRange(prev) * 0.5 &&
        bodySize(c) > totalRange(c) * 0.5) {
      patterns.push({
        name: 'THREE_BLACK_CROWS' as CandlestickPatternName,
        signal: 'BEARISH',
        confidence: 80,
        index: i,
      });
    }
  }

  return patterns;
}

// ─── Chart Pattern Detection ────────────────────────────────────────────────

export function detectChartPatterns(candles: Candle[]): PatternDetection[] {
  const patterns: PatternDetection[] = [];
  const swingPoints = detectSwingPoints(candles, 5);

  const highs = swingPoints.filter(sp => sp.type === 'HH' || sp.type === 'LH');
  const lows = swingPoints.filter(sp => sp.type === 'HL' || sp.type === 'LL');

  if (highs.length < 2 || lows.length < 2) return patterns;

  // ── DOUBLE TOP ──
  for (let i = 1; i < highs.length; i++) {
    const tolerance = highs[i].price * 0.015; // 1.5% tolerance
    if (Math.abs(highs[i].price - highs[i - 1].price) < tolerance &&
        highs[i].index - highs[i - 1].index > 10) {
      // Find neckline (lowest low between the two tops)
      let neckline = Infinity;
      for (const low of lows) {
        if (low.index > highs[i - 1].index && low.index < highs[i].index) {
          neckline = Math.min(neckline, low.price);
        }
      }
      if (neckline < Infinity) {
        const height = highs[i].price - neckline;
        patterns.push({
          name: 'DOUBLE_TOP',
          signal: 'BEARISH',
          confidence: 75,
          index: highs[i].index,
          targetPrice: neckline - height,
          invalidationPrice: highs[i].price * 1.01,
        });
      }
    }
  }

  // ── DOUBLE BOTTOM ──
  for (let i = 1; i < lows.length; i++) {
    const tolerance = lows[i].price * 0.015;
    if (Math.abs(lows[i].price - lows[i - 1].price) < tolerance &&
        lows[i].index - lows[i - 1].index > 10) {
      let neckline = -Infinity;
      for (const high of highs) {
        if (high.index > lows[i - 1].index && high.index < lows[i].index) {
          neckline = Math.max(neckline, high.price);
        }
      }
      if (neckline > -Infinity) {
        const height = neckline - lows[i].price;
        patterns.push({
          name: 'DOUBLE_BOTTOM',
          signal: 'BULLISH',
          confidence: 75,
          index: lows[i].index,
          targetPrice: neckline + height,
          invalidationPrice: lows[i].price * 0.99,
        });
      }
    }
  }

  // ── HEAD AND SHOULDERS ──
  if (highs.length >= 3) {
    for (let i = 2; i < highs.length; i++) {
      const leftShoulder = highs[i - 2];
      const head = highs[i - 1];
      const rightShoulder = highs[i];

      // Head must be highest
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Shoulders roughly equal
        const shoulderTolerance = leftShoulder.price * 0.03;
        if (Math.abs(leftShoulder.price - rightShoulder.price) < shoulderTolerance) {
          const neckline = Math.min(leftShoulder.price, rightShoulder.price) * 0.98;
          const height = head.price - neckline;
          patterns.push({
            name: 'HEAD_AND_SHOULDERS',
            signal: 'BEARISH',
            confidence: 80,
            index: rightShoulder.index,
            targetPrice: neckline - height,
            invalidationPrice: head.price,
          });
        }
      }
    }
  }

  // ── INVERSE HEAD AND SHOULDERS ──
  if (lows.length >= 3) {
    for (let i = 2; i < lows.length; i++) {
      const leftShoulder = lows[i - 2];
      const head = lows[i - 1];
      const rightShoulder = lows[i];

      if (head.price < leftShoulder.price && head.price < rightShoulder.price) {
        const shoulderTolerance = leftShoulder.price * 0.03;
        if (Math.abs(leftShoulder.price - rightShoulder.price) < shoulderTolerance) {
          const neckline = Math.max(leftShoulder.price, rightShoulder.price) * 1.02;
          const height = neckline - head.price;
          patterns.push({
            name: 'INVERSE_HEAD_AND_SHOULDERS',
            signal: 'BULLISH',
            confidence: 80,
            index: rightShoulder.index,
            targetPrice: neckline + height,
            invalidationPrice: head.price,
          });
        }
      }
    }
  }

  // ── TRIANGLES (Ascending, Descending, Symmetrical) ──
  detectTriangles(highs, lows, patterns);

  // ── WEDGES (Rising, Falling) ──
  detectWedges(highs, lows, patterns);

  // ── FLAGS (Bull, Bear) & PENNANT ──
  detectFlags(candles, highs, lows, patterns);

  return patterns;
}

// ─── Triangle Detection ─────────────────────────────────────────────────────

function detectTriangles(
  highs: { price: number; index: number }[],
  lows: { price: number; index: number }[],
  patterns: PatternDetection[],
): void {
  if (highs.length < 3 || lows.length < 3) return;

  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);

  // Calculate slopes
  const highSlope = recentHighs.length >= 2
    ? (recentHighs[recentHighs.length - 1].price - recentHighs[0].price)
      / (recentHighs[recentHighs.length - 1].index - recentHighs[0].index || 1)
    : 0;

  const lowSlope = recentLows.length >= 2
    ? (recentLows[recentLows.length - 1].price - recentLows[0].price)
      / (recentLows[recentLows.length - 1].index - recentLows[0].index || 1)
    : 0;

  const avgPrice = (recentHighs[0].price + recentLows[0].price) / 2;
  const normalizedHighSlope = highSlope / avgPrice * 1000;
  const normalizedLowSlope = lowSlope / avgPrice * 1000;

  // Ascending Triangle: flat highs, rising lows
  if (Math.abs(normalizedHighSlope) < 0.5 && normalizedLowSlope > 0.5) {
    const breakoutLevel = recentHighs[recentHighs.length - 1].price;
    const height = breakoutLevel - recentLows[recentLows.length - 1].price;
    patterns.push({
      name: 'ASCENDING_TRIANGLE',
      signal: 'BULLISH',
      confidence: 70,
      index: recentHighs[recentHighs.length - 1].index,
      targetPrice: breakoutLevel + height,
    });
  }

  // Descending Triangle: falling highs, flat lows
  if (normalizedHighSlope < -0.5 && Math.abs(normalizedLowSlope) < 0.5) {
    const breakdownLevel = recentLows[recentLows.length - 1].price;
    const height = recentHighs[0].price - breakdownLevel;
    patterns.push({
      name: 'DESCENDING_TRIANGLE',
      signal: 'BEARISH',
      confidence: 70,
      index: recentLows[recentLows.length - 1].index,
      targetPrice: breakdownLevel - height,
    });
  }

  // Symmetrical Triangle: falling highs AND rising lows (converging)
  if (normalizedHighSlope < -0.3 && normalizedLowSlope > 0.3) {
    patterns.push({
      name: 'SYMMETRICAL_TRIANGLE',
      signal: 'BULLISH', // Slight bullish bias in uptrend, but can go either way
      confidence: 60,
      index: Math.max(
        recentHighs[recentHighs.length - 1].index,
        recentLows[recentLows.length - 1].index,
      ),
    });
  }
}

// ─── Wedge Detection ────────────────────────────────────────────────────────

function detectWedges(
  highs: { price: number; index: number }[],
  lows: { price: number; index: number }[],
  patterns: PatternDetection[],
): void {
  if (highs.length < 3 || lows.length < 3) return;

  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);

  const highSlope = recentHighs.length >= 2
    ? (recentHighs[recentHighs.length - 1].price - recentHighs[0].price)
      / (recentHighs[recentHighs.length - 1].index - recentHighs[0].index || 1)
    : 0;

  const lowSlope = recentLows.length >= 2
    ? (recentLows[recentLows.length - 1].price - recentLows[0].price)
      / (recentLows[recentLows.length - 1].index - recentLows[0].index || 1)
    : 0;

  // Rising Wedge: both slopes positive, converging (bearish)
  if (highSlope > 0 && lowSlope > 0 && lowSlope > highSlope) {
    patterns.push({
      name: 'RISING_WEDGE',
      signal: 'BEARISH',
      confidence: 70,
      index: recentHighs[recentHighs.length - 1].index,
    });
  }

  // Falling Wedge: both slopes negative, converging (bullish)
  if (highSlope < 0 && lowSlope < 0 && highSlope > lowSlope) {
    patterns.push({
      name: 'FALLING_WEDGE',
      signal: 'BULLISH',
      confidence: 70,
      index: recentLows[recentLows.length - 1].index,
    });
  }
}

// ─── Flag & Pennant Detection ───────────────────────────────────────────────

function detectFlags(
  candles: Candle[],
  highs: { price: number; index: number }[],
  lows: { price: number; index: number }[],
  patterns: PatternDetection[],
): void {
  if (candles.length < 30) return;

  // Look for a strong move (pole) followed by consolidation (flag)
  const lookback = Math.min(50, candles.length);
  const start = candles.length - lookback;

  for (let i = start + 10; i < candles.length - 5; i++) {
    // Check for bullish pole: strong upward move in ~5-10 candles
    const poleStart = Math.max(start, i - 10);
    const poleMove = candles[i].close - candles[poleStart].close;
    const polePercent = (poleMove / candles[poleStart].close) * 100;

    if (polePercent > 3) { // 3%+ pole move (bullish)
      // Check for consolidation after pole (flag body)
      const flagCandles = candles.slice(i, Math.min(i + 15, candles.length));
      if (flagCandles.length < 5) continue;

      const flagRange = Math.max(...flagCandles.map(c => c.high)) -
                        Math.min(...flagCandles.map(c => c.low));
      const flagRangePercent = (flagRange / candles[i].close) * 100;

      // Flag should be tight consolidation (< half of pole)
      if (flagRangePercent < polePercent * 0.5 && flagRangePercent < 3) {
        patterns.push({
          name: 'BULL_FLAG',
          signal: 'BULLISH',
          confidence: 72,
          index: i + flagCandles.length - 1,
          targetPrice: candles[i].close + poleMove, // Measured move
        });
        break; // Only report one flag
      }
    }

    if (polePercent < -3) { // Bear flag
      const flagCandles = candles.slice(i, Math.min(i + 15, candles.length));
      if (flagCandles.length < 5) continue;

      const flagRange = Math.max(...flagCandles.map(c => c.high)) -
                        Math.min(...flagCandles.map(c => c.low));
      const flagRangePercent = (flagRange / candles[i].close) * 100;

      if (flagRangePercent < Math.abs(polePercent) * 0.5 && flagRangePercent < 3) {
        patterns.push({
          name: 'BEAR_FLAG',
          signal: 'BEARISH',
          confidence: 72,
          index: i + flagCandles.length - 1,
          targetPrice: candles[i].close + poleMove,
        });
        break;
      }
    }
  }
}

// ─── Export All Pattern Detection ───────────────────────────────────────────

export function detectAllPatterns(candles: Candle[]): {
  candlestick: PatternDetection[];
  chart: PatternDetection[];
} {
  return {
    candlestick: detectCandlestickPatterns(candles),
    chart: detectChartPatterns(candles),
  };
}
