// ============================================================================
// CryptoTrader Pro — Fibonacci Engine
// Retracement + Extension + Golden Zone Detection
// ============================================================================

import type { Candle, FibonacciLevel, FibonacciResult } from './types';
import { detectSwingPoints } from './market-structure';

// ─── Fibonacci Ratios ───────────────────────────────────────────────────────

const RETRACEMENT_RATIOS = [
  { ratio: 0, label: '0%' },
  { ratio: 0.236, label: '23.6%' },
  { ratio: 0.382, label: '38.2%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.618, label: '61.8% (Golden)' },
  { ratio: 0.786, label: '78.6%' },
  { ratio: 1, label: '100%' },
];

const EXTENSION_RATIOS = [
  { ratio: 1.0, label: '100%' },
  { ratio: 1.272, label: '127.2%' },
  { ratio: 1.414, label: '141.4%' },
  { ratio: 1.618, label: '161.8% (Golden)' },
  { ratio: 2.0, label: '200%' },
  { ratio: 2.618, label: '261.8%' },
];

// ─── Auto Swing High/Low Detection ──────────────────────────────────────────

/**
 * Finds the most significant recent swing high and swing low
 * for Fibonacci calculation.
 */
function findSignificantSwings(
  candles: Candle[],
  lookback: number = 100,
): { swingHigh: number; swingHighIdx: number; swingLow: number; swingLowIdx: number } {
  const startIdx = Math.max(0, candles.length - lookback);
  const recent = candles.slice(startIdx);

  const swingPoints = detectSwingPoints(recent, 5);

  const highs = swingPoints.filter(sp => sp.type === 'HH' || sp.type === 'LH');
  const lows = swingPoints.filter(sp => sp.type === 'HL' || sp.type === 'LL');

  // Find the highest high and lowest low among swing points
  let swingHigh = -Infinity;
  let swingHighIdx = 0;
  let swingLow = Infinity;
  let swingLowIdx = 0;

  for (const h of highs) {
    if (h.price > swingHigh) {
      swingHigh = h.price;
      swingHighIdx = h.index + startIdx;
    }
  }

  for (const l of lows) {
    if (l.price < swingLow) {
      swingLow = l.price;
      swingLowIdx = l.index + startIdx;
    }
  }

  // Fallback to simple high/low if no swing points found
  if (swingHigh === -Infinity) {
    for (let i = startIdx; i < candles.length; i++) {
      if (candles[i].high > swingHigh) {
        swingHigh = candles[i].high;
        swingHighIdx = i;
      }
    }
  }

  if (swingLow === Infinity) {
    for (let i = startIdx; i < candles.length; i++) {
      if (candles[i].low < swingLow) {
        swingLow = candles[i].low;
        swingLowIdx = i;
      }
    }
  }

  return { swingHigh, swingHighIdx, swingLow, swingLowIdx };
}

// ─── Fibonacci Calculation ──────────────────────────────────────────────────

export function calculateFibonacci(
  candles: Candle[],
  lookback: number = 100,
): FibonacciResult {
  const { swingHigh, swingHighIdx, swingLow, swingLowIdx } =
    findSignificantSwings(candles, lookback);

  const range = swingHigh - swingLow;

  // Determine trend direction based on which came first
  const trend: 'UP' | 'DOWN' = swingLowIdx < swingHighIdx ? 'UP' : 'DOWN';

  // Calculate retracement levels
  const retracement: FibonacciLevel[] = RETRACEMENT_RATIOS.map(({ ratio, label }) => {
    let price: number;
    if (trend === 'UP') {
      // In uptrend, retracement goes from high towards low
      price = swingHigh - range * ratio;
    } else {
      // In downtrend, retracement goes from low towards high
      price = swingLow + range * ratio;
    }

    return {
      ratio,
      price,
      label,
      isGoldenZone: ratio >= 0.618 && ratio <= 0.786,
    };
  });

  // Calculate extension levels
  const extension: FibonacciLevel[] = EXTENSION_RATIOS.map(({ ratio, label }) => {
    let price: number;
    if (trend === 'UP') {
      // Extension beyond the swing high
      price = swingLow + range * ratio;
    } else {
      // Extension beyond the swing low
      price = swingHigh - range * ratio;
    }

    return {
      ratio,
      price,
      label,
      isGoldenZone: ratio === 1.618,
    };
  });

  // Golden Zone boundaries
  let goldenZoneHigh: number;
  let goldenZoneLow: number;

  if (trend === 'UP') {
    goldenZoneHigh = swingHigh - range * 0.618;
    goldenZoneLow = swingHigh - range * 0.786;
  } else {
    goldenZoneLow = swingLow + range * 0.618;
    goldenZoneHigh = swingLow + range * 0.786;
  }

  return {
    retracement,
    extension,
    swingHigh,
    swingLow,
    goldenZoneHigh,
    goldenZoneLow,
    trend,
  };
}

// ─── Check if Price is at a Fibonacci Level ─────────────────────────────────

export function isPriceAtFibLevel(
  price: number,
  fibResult: FibonacciResult,
  tolerance: number = 0.005, // 0.5% default
): { isAtLevel: boolean; level: FibonacciLevel | null; isInGoldenZone: boolean } {
  for (const level of fibResult.retracement) {
    const diff = Math.abs(price - level.price) / level.price;
    if (diff < tolerance) {
      return {
        isAtLevel: true,
        level,
        isInGoldenZone: level.isGoldenZone,
      };
    }
  }

  // Check golden zone
  const isInGoldenZone =
    price >= Math.min(fibResult.goldenZoneHigh, fibResult.goldenZoneLow) &&
    price <= Math.max(fibResult.goldenZoneHigh, fibResult.goldenZoneLow);

  return { isAtLevel: false, level: null, isInGoldenZone };
}
