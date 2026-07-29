// ============================================================================
// CryptoTrader Pro — Support & Resistance Engine
// Horizontal S/R, Zones, Flip Zones, Supply & Demand
// ============================================================================

import type { Candle, SRLevel, SupplyDemandZone } from './types';

// ─── Support & Resistance Level Detection ───────────────────────────────────

/**
 * Detects horizontal support and resistance levels based on price clusters
 * where price has reversed multiple times.
 */
export function detectSRLevels(
  candles: Candle[],
  lookback: number = 100,
  sensitivity: number = 0.005, // 0.5% price cluster tolerance
): SRLevel[] {
  const levels: SRLevel[] = [];
  const startIdx = Math.max(0, candles.length - lookback);
  const recent = candles.slice(startIdx);
  const currentPrice = recent[recent.length - 1]?.close || 0;

  // Collect all significant price points (highs and lows)
  const pricePoints: number[] = [];
  for (const c of recent) {
    pricePoints.push(c.high, c.low);
  }

  // Cluster nearby prices
  const clusters: { price: number; count: number; points: number[] }[] = [];

  for (const price of pricePoints) {
    let added = false;
    for (const cluster of clusters) {
      if (Math.abs(price - cluster.price) / cluster.price < sensitivity) {
        cluster.points.push(price);
        cluster.price = cluster.points.reduce((a, b) => a + b, 0) / cluster.points.length;
        cluster.count++;
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ price, count: 1, points: [price] });
    }
  }

  // Filter significant levels (touched 3+ times)
  const significant = clusters
    .filter(c => c.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 levels

  for (const cluster of significant) {
    const zoneLow = Math.min(...cluster.points);
    const zoneHigh = Math.max(...cluster.points);
    const isZone = (zoneHigh - zoneLow) / cluster.price > 0.002; // Zone if spread > 0.2%

    const type = cluster.price < currentPrice ? 'support' : 'resistance';

    levels.push({
      price: cluster.price,
      type,
      strength: cluster.count,
      isZone,
      zoneHigh: isZone ? zoneHigh : undefined,
      zoneLow: isZone ? zoneLow : undefined,
      isFlipZone: false, // Will be set below
    });
  }

  // Detect flip zones — levels that changed from S to R or R to S
  detectFlipZones(candles, levels, startIdx);

  return levels.sort((a, b) => a.price - b.price);
}

// ─── Flip Zone Detection ────────────────────────────────────────────────────

function detectFlipZones(
  candles: Candle[],
  levels: SRLevel[],
  startIdx: number,
): void {
  for (const level of levels) {
    let wasSupport = false;
    let wasResistance = false;

    for (let i = startIdx + 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const tolerance = level.price * 0.003;

      // Price bounced UP from this level = acted as support
      if (prev.low <= level.price + tolerance && curr.close > level.price) {
        wasSupport = true;
      }
      // Price bounced DOWN from this level = acted as resistance
      if (prev.high >= level.price - tolerance && curr.close < level.price) {
        wasResistance = true;
      }
    }

    // If it acted as both support AND resistance at different times = flip zone
    if (wasSupport && wasResistance) {
      level.isFlipZone = true;
    }
  }
}

// ─── Supply & Demand Zone Detection ─────────────────────────────────────────

/**
 * Supply Zone: Area where strong selling originated
 *   - Rally-Base-Drop (RBD) or Drop-Base-Drop (DBD)
 *
 * Demand Zone: Area where strong buying originated
 *   - Drop-Base-Rally (DBR) or Rally-Base-Rally (RBR)
 */
export function detectSupplyDemandZones(
  candles: Candle[],
  lookback: number = 100,
): SupplyDemandZone[] {
  const zones: SupplyDemandZone[] = [];
  const startIdx = Math.max(0, candles.length - lookback);

  for (let i = startIdx + 3; i < candles.length - 3; i++) {
    // Look for base (consolidation) candles
    const base = candles[i];
    const bodySize = Math.abs(base.close - base.open);
    const range = base.high - base.low;

    // Base candle should be small (indecision)
    if (range === 0 || bodySize / range > 0.5) continue;

    // Check what happens BEFORE and AFTER the base
    const beforeMove = candles[i - 1].close - candles[i - 2].close;
    const afterMove = candles[i + 2].close - candles[i + 1].close;

    const avgRange = candles.slice(Math.max(0, i - 20), i)
      .reduce((sum, c) => sum + (c.high - c.low), 0) / 20;

    // DEMAND ZONE: Drop-Base-Rally
    // Price drops into a zone, consolidates briefly, then rallies strongly
    if (beforeMove < -avgRange * 0.5 && afterMove > avgRange * 1.5) {
      const zoneLow = Math.min(base.low, candles[i - 1].low);
      const zoneHigh = Math.max(base.high, candles[i - 1].high);
      const departureSpeed = afterMove / avgRange;

      // Check freshness: has price returned to this zone?
      let isFresh = true;
      let testCount = 0;
      for (let j = i + 3; j < candles.length; j++) {
        if (candles[j].low <= zoneHigh && candles[j].low >= zoneLow) {
          isFresh = false;
          testCount++;
        }
      }

      zones.push({
        type: 'demand',
        high: zoneHigh,
        low: zoneLow,
        strength: calculateZoneStrength(departureSpeed, isFresh, testCount),
        isFresh,
        testCount,
        departureSpeed,
      });
    }

    // SUPPLY ZONE: Rally-Base-Drop
    // Price rallies into a zone, consolidates briefly, then drops strongly
    if (beforeMove > avgRange * 0.5 && afterMove < -avgRange * 1.5) {
      const zoneLow = Math.min(base.low, candles[i + 1].low);
      const zoneHigh = Math.max(base.high, candles[i + 1].high);
      const departureSpeed = Math.abs(afterMove) / avgRange;

      let isFresh = true;
      let testCount = 0;
      for (let j = i + 3; j < candles.length; j++) {
        if (candles[j].high >= zoneLow && candles[j].high <= zoneHigh) {
          isFresh = false;
          testCount++;
        }
      }

      zones.push({
        type: 'supply',
        high: zoneHigh,
        low: zoneLow,
        strength: calculateZoneStrength(departureSpeed, isFresh, testCount),
        isFresh,
        testCount,
        departureSpeed,
      });
    }
  }

  // Deduplicate overlapping zones
  return deduplicateZones(zones);
}

// ─── Zone Strength Calculation ──────────────────────────────────────────────

function calculateZoneStrength(
  departureSpeed: number,
  isFresh: boolean,
  testCount: number,
): number {
  let strength = 50;

  // Departure speed bonus (faster departure = stronger zone)
  if (departureSpeed > 3) strength += 20;
  else if (departureSpeed > 2) strength += 15;
  else if (departureSpeed > 1.5) strength += 10;

  // Freshness bonus
  if (isFresh) strength += 20;
  else {
    // Each test weakens the zone
    strength -= testCount * 10;
  }

  return Math.max(0, Math.min(100, strength));
}

// ─── Deduplicate Overlapping Zones ──────────────────────────────────────────

function deduplicateZones(zones: SupplyDemandZone[]): SupplyDemandZone[] {
  if (zones.length <= 1) return zones;

  const result: SupplyDemandZone[] = [];
  const sorted = [...zones].sort((a, b) => a.low - b.low);

  for (const zone of sorted) {
    const existing = result.find(
      z => z.type === zone.type &&
        Math.abs(z.low - zone.low) / zone.low < 0.01 &&
        Math.abs(z.high - zone.high) / zone.high < 0.01,
    );

    if (!existing) {
      result.push(zone);
    } else if (zone.strength > existing.strength) {
      // Replace with stronger zone
      const idx = result.indexOf(existing);
      result[idx] = zone;
    }
  }

  return result;
}

// ─── Check if Price is Near S/R Level ───────────────────────────────────────

export function isPriceNearSR(
  price: number,
  levels: SRLevel[],
  tolerance: number = 0.01, // 1%
): { isNear: boolean; level: SRLevel | null; type: 'support' | 'resistance' | null } {
  for (const level of levels) {
    const diff = Math.abs(price - level.price) / level.price;
    if (diff < tolerance) {
      return { isNear: true, level, type: level.type };
    }
  }
  return { isNear: false, level: null, type: null };
}

// ─── Check if Price is in Supply/Demand Zone ────────────────────────────────

export function isPriceInSDZone(
  price: number,
  zones: SupplyDemandZone[],
): { isInZone: boolean; zone: SupplyDemandZone | null } {
  for (const zone of zones) {
    if (price >= zone.low && price <= zone.high) {
      return { isInZone: true, zone };
    }
  }
  return { isInZone: false, zone: null };
}
