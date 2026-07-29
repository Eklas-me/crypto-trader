// ============================================================================
// CryptoTrader Pro — Technical Indicators Engine
// All indicator calculations: RSI, MACD, EMA, BB, ATR, VWAP, Ichimoku,
// StochRSI, ADX, OBV, MFI
// ============================================================================

import type {
  Candle, RSIResult, MACDResult, EMAResult, BollingerBandsResult,
  ATRResult, VWAPResult, StochRSIResult, ADXResult, OBVResult,
  MFIResult, IchimokuResult, Divergence,
} from './types';

// ─── EMA (Exponential Moving Average) ───────────────────────────────────────

export function calculateEMA(data: number[], period: number): EMAResult {
  const values: number[] = [];
  if (data.length < period) {
    return { values: [], current: 0 };
  }

  const multiplier = 2 / (period + 1);

  // First EMA = SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
    values.push(0); // placeholder
  }
  values[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    const ema = (data[i] - values[i - 1]) * multiplier + values[i - 1];
    values.push(ema);
  }

  return { values, current: values[values.length - 1] || 0 };
}

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / period);
  }
  return result;
}

// ─── RSI (Relative Strength Index) ──────────────────────────────────────────

export function calculateRSI(candles: Candle[], period: number = 14): RSIResult {
  const closes = candles.map(c => c.close);
  const values: number[] = new Array(closes.length).fill(0);

  if (closes.length < period + 1) {
    return { values, current: 50, isOversold: false, isOverbought: false };
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // First average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // RSI for first valid point
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  values[period] = 100 - (100 / (1 + rs));

  // Smoothed RSI (Wilder's smoothing)
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const smoothedRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    values[i + 1] = 100 - (100 / (1 + smoothedRS));
  }

  const current = values[values.length - 1];
  return {
    values,
    current,
    isOversold: current < 30,
    isOverbought: current > 70,
  };
}

// ─── MACD ───────────────────────────────────────────────────────────────────

export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): MACDResult {
  const closes = candles.map(c => c.close);
  const fastEMA = calculateEMA(closes, fastPeriod).values;
  const slowEMA = calculateEMA(closes, slowPeriod).values;

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] && slowEMA[i]) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    } else {
      macdLine.push(0);
    }
  }

  const validMACD = macdLine.filter(v => v !== 0);
  const signalEMA = calculateEMA(validMACD, signalPeriod).values;

  const signalLine: number[] = new Array(closes.length).fill(0);
  const histogram: number[] = new Array(closes.length).fill(0);

  const offset = closes.length - validMACD.length;
  const signalOffset = offset + (validMACD.length - signalEMA.length);

  for (let i = 0; i < signalEMA.length; i++) {
    const idx = signalOffset + i;
    if (idx < closes.length) {
      signalLine[idx] = signalEMA[i];
      histogram[idx] = macdLine[idx] - signalEMA[i];
    }
  }

  const len = closes.length;
  const currentMACD = macdLine[len - 1] || 0;
  const currentSignal = signalLine[len - 1] || 0;
  const currentHistogram = histogram[len - 1] || 0;
  const prevHistogram = histogram[len - 2] || 0;

  return {
    macdLine,
    signalLine,
    histogram,
    currentMACD,
    currentSignal,
    currentHistogram,
    isBullishCross: prevHistogram <= 0 && currentHistogram > 0,
    isBearishCross: prevHistogram >= 0 && currentHistogram < 0,
  };
}

// ─── Bollinger Bands ────────────────────────────────────────────────────────

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2,
): BollingerBandsResult {
  const closes = candles.map(c => c.close);
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      lower.push(0);
      width.push(0);
      continue;
    }

    let sumSquares = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSquares += (closes[j] - middle[i]) ** 2;
    }
    const stdDev = Math.sqrt(sumSquares / period);

    upper.push(middle[i] + stdDev * stdDevMultiplier);
    lower.push(middle[i] - stdDev * stdDevMultiplier);
    width.push(middle[i] > 0 ? ((upper[i] - lower[i]) / middle[i]) * 100 : 0);
  }

  const len = closes.length;
  return {
    upper, middle, lower, width,
    currentUpper: upper[len - 1] || 0,
    currentMiddle: middle[len - 1] || 0,
    currentLower: lower[len - 1] || 0,
    currentWidth: width[len - 1] || 0,
  };
}

// ─── ATR (Average True Range) ───────────────────────────────────────────────

export function calculateATR(candles: Candle[], period: number = 14): ATRResult {
  const values: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    );
    values.push(tr);
  }

  // Smooth ATR using Wilder's smoothing
  const atr: number[] = new Array(candles.length).fill(0);
  if (candles.length <= period) {
    return { values: atr, current: 0 };
  }

  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += values[i];
  }
  atr[period] = sum / period;

  for (let i = period + 1; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + values[i]) / period;
  }

  return { values: atr, current: atr[atr.length - 1] || 0 };
}

// ─── VWAP (Volume Weighted Average Price) ───────────────────────────────────

export function calculateVWAP(candles: Candle[]): VWAPResult {
  const values: number[] = [];
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    values.push(cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : typicalPrice);
  }

  return { values, current: values[values.length - 1] || 0 };
}

// ─── Stochastic RSI ─────────────────────────────────────────────────────────

export function calculateStochRSI(
  candles: Candle[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3,
): StochRSIResult {
  const rsi = calculateRSI(candles, rsiPeriod);
  const rsiValues = rsi.values;

  const stochK: number[] = new Array(rsiValues.length).fill(0);

  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    let minRSI = Infinity;
    let maxRSI = -Infinity;
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      if (rsiValues[j] !== 0) {
        minRSI = Math.min(minRSI, rsiValues[j]);
        maxRSI = Math.max(maxRSI, rsiValues[j]);
      }
    }
    const range = maxRSI - minRSI;
    stochK[i] = range > 0 ? ((rsiValues[i] - minRSI) / range) * 100 : 50;
  }

  // Smooth K
  const k = calculateSMA(stochK, kSmooth);
  const d = calculateSMA(k, dSmooth);

  const currentK = k[k.length - 1] || 50;
  const currentD = d[d.length - 1] || 50;

  return {
    k, d, currentK, currentD,
    isOversold: currentK < 20,
    isOverbought: currentK > 80,
  };
}

// ─── ADX (Average Directional Index) ────────────────────────────────────────

export function calculateADX(candles: Candle[], period: number = 14): ADXResult {
  const len = candles.length;
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [0];

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    tr.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    ));
  }

  // Smooth with Wilder's method
  const smoothedPlusDM: number[] = new Array(len).fill(0);
  const smoothedMinusDM: number[] = new Array(len).fill(0);
  const smoothedTR: number[] = new Array(len).fill(0);
  const plusDI: number[] = new Array(len).fill(0);
  const minusDI: number[] = new Array(len).fill(0);
  const dx: number[] = new Array(len).fill(0);
  const adx: number[] = new Array(len).fill(0);

  if (len <= period) {
    return {
      adx, plusDI, minusDI,
      currentADX: 0, currentPlusDI: 0, currentMinusDI: 0,
      isTrending: false, isStrongTrend: false,
    };
  }

  // First smoothed values = sum of first `period`
  let sumPlusDM = 0, sumMinusDM = 0, sumTR = 0;
  for (let i = 1; i <= period; i++) {
    sumPlusDM += plusDM[i];
    sumMinusDM += minusDM[i];
    sumTR += tr[i];
  }
  smoothedPlusDM[period] = sumPlusDM;
  smoothedMinusDM[period] = sumMinusDM;
  smoothedTR[period] = sumTR;

  for (let i = period + 1; i < len; i++) {
    smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i];
    smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i];
    smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i];
  }

  for (let i = period; i < len; i++) {
    plusDI[i] = smoothedTR[i] > 0 ? (smoothedPlusDM[i] / smoothedTR[i]) * 100 : 0;
    minusDI[i] = smoothedTR[i] > 0 ? (smoothedMinusDM[i] / smoothedTR[i]) * 100 : 0;

    const diSum = plusDI[i] + minusDI[i];
    dx[i] = diSum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0;
  }

  // First ADX = average of first `period` DX values
  let dxSum = 0;
  const adxStart = period * 2;
  if (adxStart < len) {
    for (let i = period; i < adxStart; i++) {
      dxSum += dx[i];
    }
    adx[adxStart - 1] = dxSum / period;

    for (let i = adxStart; i < len; i++) {
      adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
    }
  }

  const currentADX = adx[len - 1] || 0;
  return {
    adx, plusDI, minusDI,
    currentADX,
    currentPlusDI: plusDI[len - 1] || 0,
    currentMinusDI: minusDI[len - 1] || 0,
    isTrending: currentADX > 25,
    isStrongTrend: currentADX > 40,
  };
}

// ─── OBV (On Balance Volume) ────────────────────────────────────────────────

export function calculateOBV(candles: Candle[]): OBVResult {
  const values: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      values.push(values[i - 1] + candles[i].volume);
    } else if (candles[i].close < candles[i - 1].close) {
      values.push(values[i - 1] - candles[i].volume);
    } else {
      values.push(values[i - 1]);
    }
  }

  return { values, current: values[values.length - 1] || 0 };
}

// ─── MFI (Money Flow Index) ─────────────────────────────────────────────────

export function calculateMFI(candles: Candle[], period: number = 14): MFIResult {
  const values: number[] = new Array(candles.length).fill(0);

  if (candles.length < period + 1) {
    return { values, current: 50, isOversold: false, isOverbought: false };
  }

  const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
  const rawMoneyFlow = typicalPrices.map((tp, i) => tp * candles[i].volume);

  for (let i = period; i < candles.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else {
        negativeFlow += rawMoneyFlow[j];
      }
    }

    const mfRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow;
    values[i] = 100 - (100 / (1 + mfRatio));
  }

  const current = values[values.length - 1];
  return {
    values, current,
    isOversold: current < 20,
    isOverbought: current > 80,
  };
}

// ─── Ichimoku Cloud ─────────────────────────────────────────────────────────

export function calculateIchimoku(
  candles: Candle[],
  tenkanPeriod: number = 10,
  kijunPeriod: number = 30,
  senkouBPeriod: number = 60,
): IchimokuResult {
  const len = candles.length;

  const highLow = (start: number, end: number): number => {
    let highest = -Infinity, lowest = Infinity;
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < len) {
        highest = Math.max(highest, candles[i].high);
        lowest = Math.min(lowest, candles[i].low);
      }
    }
    return (highest + lowest) / 2;
  };

  const tenkanSen: number[] = new Array(len).fill(0);
  const kijunSen: number[] = new Array(len).fill(0);
  const senkouSpanA: number[] = new Array(len).fill(0);
  const senkouSpanB: number[] = new Array(len).fill(0);
  const chikouSpan: number[] = new Array(len).fill(0);

  for (let i = 0; i < len; i++) {
    if (i >= tenkanPeriod - 1) {
      tenkanSen[i] = highLow(i - tenkanPeriod + 1, i);
    }
    if (i >= kijunPeriod - 1) {
      kijunSen[i] = highLow(i - kijunPeriod + 1, i);
    }
    if (i >= kijunPeriod - 1) {
      senkouSpanA[i] = (tenkanSen[i] + kijunSen[i]) / 2;
    }
    if (i >= senkouBPeriod - 1) {
      senkouSpanB[i] = highLow(i - senkouBPeriod + 1, i);
    }
    // Chikou Span = current close, plotted 26 periods back
    if (i >= kijunPeriod) {
      chikouSpan[i - kijunPeriod] = candles[i].close;
    }
  }

  const lastClose = candles[len - 1]?.close || 0;
  const lastSpanA = senkouSpanA[len - 1] || 0;
  const lastSpanB = senkouSpanB[len - 1] || 0;
  const cloudTop = Math.max(lastSpanA, lastSpanB);
  const cloudBottom = Math.min(lastSpanA, lastSpanB);

  return {
    tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan,
    isAboveCloud: lastClose > cloudTop,
    isBelowCloud: lastClose < cloudBottom,
    isInsideCloud: lastClose >= cloudBottom && lastClose <= cloudTop,
  };
}

// ─── Divergence Detection ───────────────────────────────────────────────────

export function detectDivergences(
  candles: Candle[],
  indicatorValues: number[],
  indicatorName: 'RSI' | 'OBV' | 'MFI' | 'MACD',
  lookback: number = 30,
): Divergence[] {
  const divergences: Divergence[] = [];
  const closes = candles.map(c => c.close);
  const startIdx = Math.max(0, closes.length - lookback);

  // Find local lows for bullish divergence
  for (let i = startIdx + 2; i < closes.length - 2; i++) {
    // Is it a local low in price?
    if (closes[i] < closes[i - 1] && closes[i] < closes[i - 2] &&
        closes[i] < closes[i + 1] && closes[i] < closes[i + 2]) {

      // Look for previous local low
      for (let j = i - 5; j >= startIdx + 2; j--) {
        if (closes[j] < closes[j - 1] && closes[j] < closes[j - 2] &&
            closes[j] < closes[j + 1] && closes[j] < closes[j + 2]) {

          // Bullish divergence: price lower low, indicator higher low
          if (closes[i] < closes[j] && indicatorValues[i] > indicatorValues[j]) {
            divergences.push({
              type: 'BULLISH',
              indicator: indicatorName,
              startIndex: j,
              endIndex: i,
              confidence: 75,
            });
          }
          break;
        }
      }
    }

    // Is it a local high in price?
    if (closes[i] > closes[i - 1] && closes[i] > closes[i - 2] &&
        closes[i] > closes[i + 1] && closes[i] > closes[i + 2]) {

      // Look for previous local high
      for (let j = i - 5; j >= startIdx + 2; j--) {
        if (closes[j] > closes[j - 1] && closes[j] > closes[j - 2] &&
            closes[j] > closes[j + 1] && closes[j] > closes[j + 2]) {

          // Bearish divergence: price higher high, indicator lower high
          if (closes[i] > closes[j] && indicatorValues[i] < indicatorValues[j]) {
            divergences.push({
              type: 'BEARISH',
              indicator: indicatorName,
              startIndex: j,
              endIndex: i,
              confidence: 75,
            });
          }
          break;
        }
      }
    }
  }

  return divergences;
}

// ─── Convenience: Calculate All Indicators ──────────────────────────────────

export interface AllIndicators {
  rsi: RSIResult;
  macd: MACDResult;
  ema20: EMAResult;
  ema50: EMAResult;
  ema100: EMAResult;
  ema200: EMAResult;
  bollingerBands: BollingerBandsResult;
  atr: ATRResult;
  vwap: VWAPResult;
  stochRSI: StochRSIResult;
  adx: ADXResult;
  obv: OBVResult;
  mfi: MFIResult;
  ichimoku: IchimokuResult;
  divergences: Divergence[];
}

export function calculateAllIndicators(candles: Candle[]): AllIndicators {
  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const obv = calculateOBV(candles);
  const mfi = calculateMFI(candles);

  // Detect divergences on RSI, OBV, MFI
  const rsiDivergences = detectDivergences(candles, rsi.values, 'RSI');
  const obvDivergences = detectDivergences(candles, obv.values, 'OBV');
  const mfiDivergences = detectDivergences(candles, mfi.values, 'MFI');
  const macdDivergences = detectDivergences(candles, macd.histogram, 'MACD');

  return {
    rsi,
    macd,
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema100: calculateEMA(closes, 100),
    ema200: calculateEMA(closes, 200),
    bollingerBands: calculateBollingerBands(candles),
    atr: calculateATR(candles),
    vwap: calculateVWAP(candles),
    stochRSI: calculateStochRSI(candles),
    adx: calculateADX(candles),
    obv,
    mfi,
    ichimoku: calculateIchimoku(candles),
    divergences: [
      ...rsiDivergences,
      ...obvDivergences,
      ...mfiDivergences,
      ...macdDivergences,
    ],
  };
}
