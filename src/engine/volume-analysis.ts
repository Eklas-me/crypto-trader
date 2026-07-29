// ============================================================================
// CryptoTrader Pro — Volume Analysis Engine
// Volume Profile, POC/VAH/VAL, CVD, Volume Spike, Volume Divergence
// ============================================================================

import type {
  Candle, VolumeProfileResult, VolumeProfileLevel, CVDResult,
} from './types';

// ─── Volume Profile ─────────────────────────────────────────────────────────

/**
 * Creates a volume profile by binning price data into fixed-size buckets
 * and accumulating volume at each price level.
 */
export function calculateVolumeProfile(
  candles: Candle[],
  numBuckets: number = 50,
): VolumeProfileResult {
  if (candles.length === 0) {
    return { levels: [], poc: 0, vah: 0, val: 0 };
  }

  const highestHigh = Math.max(...candles.map(c => c.high));
  const lowestLow = Math.min(...candles.map(c => c.low));
  const range = highestHigh - lowestLow;

  if (range === 0) {
    return { levels: [], poc: highestHigh, vah: highestHigh, val: lowestLow };
  }

  const bucketSize = range / numBuckets;
  const buckets: { price: number; volume: number }[] = [];

  for (let i = 0; i < numBuckets; i++) {
    buckets.push({
      price: lowestLow + bucketSize * (i + 0.5), // Midpoint of bucket
      volume: 0,
    });
  }

  // Distribute volume across buckets
  for (const candle of candles) {
    const candleRange = candle.high - candle.low;
    if (candleRange === 0) {
      const bucketIdx = Math.min(
        Math.floor((candle.close - lowestLow) / bucketSize),
        numBuckets - 1,
      );
      buckets[bucketIdx].volume += candle.volume;
      continue;
    }

    // Distribute volume proportionally across price levels the candle touched
    const lowBucket = Math.max(0, Math.floor((candle.low - lowestLow) / bucketSize));
    const highBucket = Math.min(numBuckets - 1, Math.floor((candle.high - lowestLow) / bucketSize));
    const bucketsSpanned = highBucket - lowBucket + 1;
    const volumePerBucket = candle.volume / bucketsSpanned;

    for (let b = lowBucket; b <= highBucket; b++) {
      buckets[b].volume += volumePerBucket;
    }
  }

  // Find POC (Point of Control) — highest volume bucket
  const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);
  let maxVolume = 0;
  let pocIdx = 0;

  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].volume > maxVolume) {
      maxVolume = buckets[i].volume;
      pocIdx = i;
    }
  }

  // Calculate Value Area (70% of total volume)
  const valueAreaTarget = totalVolume * 0.7;
  let vaVolume = buckets[pocIdx].volume;
  let vaLowIdx = pocIdx;
  let vaHighIdx = pocIdx;

  while (vaVolume < valueAreaTarget) {
    const expandUp = vaHighIdx + 1 < numBuckets ? buckets[vaHighIdx + 1].volume : 0;
    const expandDown = vaLowIdx - 1 >= 0 ? buckets[vaLowIdx - 1].volume : 0;

    if (expandUp >= expandDown && vaHighIdx + 1 < numBuckets) {
      vaHighIdx++;
      vaVolume += buckets[vaHighIdx].volume;
    } else if (vaLowIdx - 1 >= 0) {
      vaLowIdx--;
      vaVolume += buckets[vaLowIdx].volume;
    } else {
      break;
    }
  }

  // Mark HVN (High Volume Nodes) and LVN (Low Volume Nodes)
  const avgVolume = totalVolume / numBuckets;
  const levels: VolumeProfileLevel[] = buckets.map((b, i) => ({
    price: b.price,
    volume: b.volume,
    isHVN: b.volume > avgVolume * 1.5,
    isLVN: b.volume < avgVolume * 0.5,
    isPOC: i === pocIdx,
  }));

  return {
    levels,
    poc: buckets[pocIdx].price,
    vah: buckets[vaHighIdx].price + bucketSize / 2,
    val: buckets[vaLowIdx].price - bucketSize / 2,
  };
}

// ─── Cumulative Volume Delta (CVD) ──────────────────────────────────────────

/**
 * CVD estimates buying vs selling pressure by classifying candle volume
 * based on price action. If close > open, volume is "buy volume".
 */
export function calculateCVD(candles: Candle[]): CVDResult {
  const values: number[] = [];
  let cvd = 0;

  for (const candle of candles) {
    const range = candle.high - candle.low;
    if (range === 0) {
      values.push(cvd);
      continue;
    }

    // Estimate buy/sell split based on close position within the candle
    const buyRatio = (candle.close - candle.low) / range;
    const sellRatio = 1 - buyRatio;
    const delta = candle.volume * buyRatio - candle.volume * sellRatio;

    cvd += delta;
    values.push(cvd);
  }

  // Determine CVD trend (last 10 values)
  const recentLen = Math.min(10, values.length);
  const recentStart = values.length - recentLen;
  let trend: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';

  if (recentLen >= 2) {
    const startVal = values[recentStart];
    const endVal = values[values.length - 1];
    const changePct = startVal !== 0 ? ((endVal - startVal) / Math.abs(startVal)) * 100 : 0;

    if (changePct > 5) trend = 'RISING';
    else if (changePct < -5) trend = 'FALLING';
  }

  return { values, current: values[values.length - 1] || 0, trend };
}

// ─── Volume Spike Detection ─────────────────────────────────────────────────

export interface VolumeSpike {
  index: number;
  volume: number;
  multiplier: number; // How many times average
  type: 'EXTREME' | 'HIGH' | 'NORMAL';
}

export function detectVolumeSpikes(
  candles: Candle[],
  period: number = 20,
): VolumeSpike[] {
  const spikes: VolumeSpike[] = [];

  for (let i = period; i < candles.length; i++) {
    let avgVolume = 0;
    for (let j = i - period; j < i; j++) {
      avgVolume += candles[j].volume;
    }
    avgVolume /= period;

    if (avgVolume === 0) continue;

    const multiplier = candles[i].volume / avgVolume;

    if (multiplier >= 3) {
      spikes.push({
        index: i,
        volume: candles[i].volume,
        multiplier,
        type: 'EXTREME',
      });
    } else if (multiplier >= 2) {
      spikes.push({
        index: i,
        volume: candles[i].volume,
        multiplier,
        type: 'HIGH',
      });
    }
  }

  return spikes;
}

// ─── Volume Confirmation Check ──────────────────────────────────────────────

/**
 * Checks if current price move is confirmed by volume.
 * Breakout with high volume = confirmed.
 * Breakout with low volume = likely fake.
 */
export function isVolumeConfirmed(
  candles: Candle[],
  period: number = 20,
): { isConfirmed: boolean; volumeRatio: number; isLowVolume: boolean } {
  if (candles.length < period + 1) {
    return { isConfirmed: false, volumeRatio: 1, isLowVolume: false };
  }

  let avgVolume = 0;
  for (let i = candles.length - period - 1; i < candles.length - 1; i++) {
    avgVolume += candles[i].volume;
  }
  avgVolume /= period;

  const currentVolume = candles[candles.length - 1].volume;
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

  return {
    isConfirmed: volumeRatio >= 1.5,
    volumeRatio,
    isLowVolume: volumeRatio < 0.5,
  };
}

// ─── Volume Divergence Detection ────────────────────────────────────────────

export interface VolumeDivergence {
  type: 'BULLISH' | 'BEARISH';
  description: string;
  index: number;
}

/**
 * Detects volume divergences:
 * - Price making new high but volume decreasing = bearish divergence
 * - Price making new low but volume decreasing = bullish divergence
 */
export function detectVolumeDivergence(
  candles: Candle[],
  lookback: number = 20,
): VolumeDivergence[] {
  const divergences: VolumeDivergence[] = [];
  if (candles.length < lookback) return divergences;

  const startIdx = candles.length - lookback;

  for (let i = startIdx + 5; i < candles.length; i++) {
    // Find previous significant high/low
    let prevHighIdx = -1;
    let prevLowIdx = -1;

    for (let j = i - 3; j >= startIdx; j--) {
      if (prevHighIdx === -1 && candles[j].high > candles[j - 1].high && candles[j].high > candles[j + 1].high) {
        prevHighIdx = j;
      }
      if (prevLowIdx === -1 && candles[j].low < candles[j - 1].low && candles[j].low < candles[j + 1].low) {
        prevLowIdx = j;
      }
      if (prevHighIdx !== -1 && prevLowIdx !== -1) break;
    }

    // Bearish volume divergence: price higher high + lower volume
    if (prevHighIdx !== -1 && candles[i].high > candles[prevHighIdx].high &&
        candles[i].volume < candles[prevHighIdx].volume * 0.8) {
      divergences.push({
        type: 'BEARISH',
        description: 'Price making higher high but volume decreasing — weakening momentum',
        index: i,
      });
    }

    // Bullish volume divergence: price lower low + lower volume
    if (prevLowIdx !== -1 && candles[i].low < candles[prevLowIdx].low &&
        candles[i].volume < candles[prevLowIdx].volume * 0.8) {
      divergences.push({
        type: 'BULLISH',
        description: 'Price making lower low but selling volume decreasing — selling exhaustion',
        index: i,
      });
    }
  }

  return divergences;
}
