// ============================================================================
// CryptoTrader Pro — Smart Money Concepts (SMC) Engine
// Order Blocks, Fair Value Gaps, Breaker/Mitigation Blocks,
// Premium/Discount Zones, Inducement, Liquidity
// ============================================================================

import type {
  Candle, OrderBlock, FairValueGap, LiquiditySweep, SMCResult,
} from './types';
import { detectSwingPoints } from './market-structure';

// ─── Order Block Detection ──────────────────────────────────────────────────

/**
 * An Order Block is the last opposite candle before a strong impulsive move.
 * Bullish OB: Last bearish candle before a strong bullish move
 * Bearish OB: Last bullish candle before a strong bearish move
 */
export function detectOrderBlocks(candles: Candle[], lookback: number = 50): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const startIdx = Math.max(0, candles.length - lookback);

  for (let i = startIdx + 1; i < candles.length - 2; i++) {
    const c = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    const isCBearish = c.close < c.open;
    const isCBullish = c.close > c.open;

    // Bullish OB: bearish candle followed by 2 strong bullish candles
    if (isCBearish) {
      const move1 = next1.close - next1.open;
      const move2 = next2.close - next2.open;
      const avgBody = candles.slice(Math.max(0, i - 10), i)
        .reduce((sum, c2) => sum + Math.abs(c2.close - c2.open), 0) / 10;

      if (move1 > avgBody * 1.5 && move2 > 0) {
        // Check if OB has been mitigated (price came back into it)
        let isMitigated = false;
        let isBreaker = false;
        for (let j = i + 3; j < candles.length; j++) {
          if (candles[j].low <= c.high && candles[j].low >= c.low) {
            isMitigated = true;
          }
          // If price broke through the OB completely, it becomes a breaker
          if (candles[j].close < c.low) {
            isBreaker = true;
            break;
          }
        }

        obs.push({
          type: 'BULLISH',
          high: c.high,
          low: c.low,
          index: i,
          time: c.time,
          isMitigated,
          isBreaker,
        });
      }
    }

    // Bearish OB: bullish candle followed by 2 strong bearish candles
    if (isCBullish) {
      const move1 = next1.open - next1.close;
      const move2 = next2.open - next2.close;
      const avgBody = candles.slice(Math.max(0, i - 10), i)
        .reduce((sum, c2) => sum + Math.abs(c2.close - c2.open), 0) / 10;

      if (move1 > avgBody * 1.5 && move2 > 0) {
        let isMitigated = false;
        let isBreaker = false;
        for (let j = i + 3; j < candles.length; j++) {
          if (candles[j].high >= c.low && candles[j].high <= c.high) {
            isMitigated = true;
          }
          if (candles[j].close > c.high) {
            isBreaker = true;
            break;
          }
        }

        obs.push({
          type: 'BEARISH',
          high: c.high,
          low: c.low,
          index: i,
          time: c.time,
          isMitigated,
          isBreaker,
        });
      }
    }
  }

  return obs;
}

// ─── Fair Value Gap (FVG) Detection ─────────────────────────────────────────

/**
 * FVG is a 3-candle pattern where the middle candle creates a gap
 * between candle 1's wick and candle 3's wick.
 */
export function detectFairValueGaps(candles: Candle[], lookback: number = 50): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  const startIdx = Math.max(0, candles.length - lookback);

  for (let i = startIdx + 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Bullish FVG: Gap between prev high and next low
    if (next.low > prev.high) {
      let isFilled = false;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].low <= prev.high) {
          isFilled = true;
          break;
        }
      }

      fvgs.push({
        type: 'BULLISH',
        high: next.low,
        low: prev.high,
        index: i,
        time: curr.time,
        isFilled,
      });
    }

    // Bearish FVG: Gap between prev low and next high
    if (next.high < prev.low) {
      let isFilled = false;
      for (let j = i + 2; j < candles.length; j++) {
        if (candles[j].high >= prev.low) {
          isFilled = true;
          break;
        }
      }

      fvgs.push({
        type: 'BEARISH',
        high: prev.low,
        low: next.high,
        index: i,
        time: curr.time,
        isFilled,
      });
    }
  }

  return fvgs;
}

// ─── Liquidity Sweep Detection ──────────────────────────────────────────────

/**
 * Liquidity sweep: Price takes out a previous swing high/low
 * then immediately reverses — "stop hunt" behavior.
 */
export function detectLiquiditySweeps(
  candles: Candle[],
  lookback: number = 50,
): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  const swingPoints = detectSwingPoints(candles, 3);

  const recentStart = Math.max(0, candles.length - lookback);

  for (let i = recentStart; i < candles.length; i++) {
    const c = candles[i];

    // Check if current candle sweeps a previous swing low then closes above it
    for (const sp of swingPoints) {
      if (sp.index >= i) continue;
      if (sp.type === 'HL' || sp.type === 'LL') {
        // Sell-side liquidity sweep: wick below swing low but close above it
        if (c.low < sp.price && c.close > sp.price) {
          sweeps.push({
            type: 'SELL_SIDE',
            price: sp.price,
            index: i,
            time: c.time,
          });
        }
      }
      if (sp.type === 'HH' || sp.type === 'LH') {
        // Buy-side liquidity sweep: wick above swing high but close below it
        if (c.high > sp.price && c.close < sp.price) {
          sweeps.push({
            type: 'BUY_SIDE',
            price: sp.price,
            index: i,
            time: c.time,
          });
        }
      }
    }
  }

  return sweeps;
}

// ─── Premium / Discount Zone Calculation ────────────────────────────────────

function calculatePremiumDiscount(candles: Candle[], lookback: number = 50) {
  const recent = candles.slice(Math.max(0, candles.length - lookback));
  const highestHigh = Math.max(...recent.map(c => c.high));
  const lowestLow = Math.min(...recent.map(c => c.low));
  const equilibrium = (highestHigh + lowestLow) / 2;

  return {
    premiumZone: { high: highestHigh, low: equilibrium },
    discountZone: { high: equilibrium, low: lowestLow },
    equilibrium,
  };
}

// ─── Full SMC Analysis ──────────────────────────────────────────────────────

export function analyzeSMC(candles: Candle[], lookback: number = 50): SMCResult {
  const orderBlocks = detectOrderBlocks(candles, lookback);
  const fairValueGaps = detectFairValueGaps(candles, lookback);
  const liquiditySweeps = detectLiquiditySweeps(candles, lookback);
  const { premiumZone, discountZone, equilibrium } = calculatePremiumDiscount(candles, lookback);

  return {
    orderBlocks,
    fairValueGaps,
    liquiditySweeps,
    premiumZone,
    discountZone,
    equilibrium,
  };
}
