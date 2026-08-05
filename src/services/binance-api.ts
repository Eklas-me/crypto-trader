// ============================================================================
// CryptoTrader Pro — Binance API Service
// Spot (klines, ticker, depth) + Futures (funding, OI, L/S ratio)
// ============================================================================

import type {
  Candle, Timeframe, FuturesSentiment, OrderBookAnalysis, OrderBookWall,
} from '@/engine/types';

const BINANCE_SPOT_BASE = 'https://api.binance.com';
const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

// ─── OHLCV Candlestick Data ────────────────────────────────────────────────

export async function fetchKlines(
  symbol: string,
  interval: Timeframe,
  limit: number = 500,
): Promise<Candle[]> {
  const intervalMap: Record<Timeframe, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h',
    '4h': '4h', '1d': '1d', '1w': '1w',
  };

  const url = `${BINANCE_SPOT_BASE}/api/v3/klines?symbol=${symbol}&interval=${intervalMap[interval]}&limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();

  return data.map((k: number[]) => ({
    time: Math.floor(k[0] / 1000), // Convert ms to seconds
    open: parseFloat(k[1] as unknown as string),
    high: parseFloat(k[2] as unknown as string),
    low: parseFloat(k[3] as unknown as string),
    close: parseFloat(k[4] as unknown as string),
    volume: parseFloat(k[5] as unknown as string),
  }));
}

// ─── Historical Range Data ──────────────────────────────────────────────────

export async function fetchHistoricalRange(
  symbol: string,
  interval: Timeframe | '1d',
  startTime: number,
  endTime: number,
): Promise<Candle[]> {
  const url = `${BINANCE_SPOT_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();

  return data.map((k: number[]) => ({
    time: Math.floor(k[0] / 1000), // Convert ms to seconds
    open: parseFloat(k[1] as unknown as string),
    high: parseFloat(k[2] as unknown as string),
    low: parseFloat(k[3] as unknown as string),
    close: parseFloat(k[4] as unknown as string),
    volume: parseFloat(k[5] as unknown as string),
  }));
}

// ─── 24h Ticker ─────────────────────────────────────────────────────────────

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export async function fetchTicker(symbol: string): Promise<TickerData> {
  const url = `${BINANCE_SPOT_BASE}/api/v3/ticker/24hr?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
  const d = await res.json();

  return {
    symbol: d.symbol,
    lastPrice: parseFloat(d.lastPrice),
    priceChange: parseFloat(d.priceChange),
    priceChangePercent: parseFloat(d.priceChangePercent),
    highPrice: parseFloat(d.highPrice),
    lowPrice: parseFloat(d.lowPrice),
    volume: parseFloat(d.volume),
    quoteVolume: parseFloat(d.quoteVolume),
  };
}

export async function fetchAllTickers(): Promise<TickerData[]> {
  const url = `${BINANCE_SPOT_BASE}/api/v3/ticker/24hr`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance tickers error: ${res.status}`);
  const data = await res.json();

  return data.map((d: Record<string, string>) => ({
    symbol: d.symbol,
    lastPrice: parseFloat(d.lastPrice),
    priceChange: parseFloat(d.priceChange),
    priceChangePercent: parseFloat(d.priceChangePercent),
    highPrice: parseFloat(d.highPrice),
    lowPrice: parseFloat(d.lowPrice),
    volume: parseFloat(d.volume),
    quoteVolume: parseFloat(d.quoteVolume),
  }));
}

// ─── Order Book Depth ───────────────────────────────────────────────────────

export async function fetchOrderBook(
  symbol: string,
  limit: number = 100,
): Promise<OrderBookAnalysis> {
  const url = `${BINANCE_SPOT_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance depth error: ${res.status}`);
  const data = await res.json();

  const bids: [string, string][] = data.bids;
  const asks: [string, string][] = data.asks;

  let totalBidVolume = 0;
  let totalAskVolume = 0;
  const walls: OrderBookWall[] = [];

  // Calculate average order size for whale detection
  const allSizes = [...bids, ...asks].map(([, qty]) => parseFloat(qty));
  const avgSize = allSizes.reduce((a, b) => a + b, 0) / allSizes.length;
  const tickerRes = await fetchTicker(symbol);
  const currentPrice = tickerRes.lastPrice;

  for (const [price, qty] of bids) {
    const p = parseFloat(price);
    const q = parseFloat(qty);
    const dollarValue = p * q;
    totalBidVolume += dollarValue;

    if (q > avgSize * 20) { // Significant wall = 20x average
      walls.push({
        price: p,
        size: dollarValue,
        type: 'BID',
        isWhale: dollarValue > 500_000,
      });
    }
  }

  for (const [price, qty] of asks) {
    const p = parseFloat(price);
    const q = parseFloat(qty);
    const dollarValue = p * q;
    totalAskVolume += dollarValue;

    if (q > avgSize * 20) {
      walls.push({
        price: p,
        size: dollarValue,
        type: 'ASK',
        isWhale: dollarValue > 500_000,
      });
    }
  }

  const bidAskRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 1;

  return {
    bidAskRatio,
    walls: walls.sort((a, b) => b.size - a.size).slice(0, 10),
    imbalance: bidAskRatio > 1.3 ? 'BULLISH' : bidAskRatio < 0.77 ? 'BEARISH' : 'NEUTRAL',
    totalBidVolume,
    totalAskVolume,
  };
}

// ─── Futures: Funding Rate ──────────────────────────────────────────────────

export async function fetchFundingRate(symbol: string): Promise<number> {
  try {
    const url = `${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.length > 0 ? parseFloat(data[0].fundingRate) : 0;
  } catch {
    return 0;
  }
}

// ─── Futures: Open Interest ─────────────────────────────────────────────────

export async function fetchOpenInterest(symbol: string): Promise<number> {
  try {
    const url = `${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.openInterest);
  } catch {
    return 0;
  }
}

// ─── Futures: Long/Short Ratio ──────────────────────────────────────────────

export async function fetchLongShortRatio(symbol: string): Promise<number> {
  try {
    const url = `${BINANCE_FUTURES_BASE}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return 1;
    const data = await res.json();
    return data.length > 0 ? parseFloat(data[0].longShortRatio) : 1;
  } catch {
    return 1;
  }
}

// ─── Combined Futures Sentiment ─────────────────────────────────────────────

export async function fetchFuturesSentiment(symbol: string): Promise<FuturesSentiment> {
  const [fundingRate, openInterest, longShortRatio] = await Promise.all([
    fetchFundingRate(symbol),
    fetchOpenInterest(symbol),
    fetchLongShortRatio(symbol),
  ]);

  let sentiment: FuturesSentiment['sentiment'] = 'NEUTRAL';
  const isOverLeveragedLong = fundingRate > 0.05 || longShortRatio > 2.5;
  const isOverLeveragedShort = fundingRate < -0.05 || longShortRatio < 0.4;

  if (isOverLeveragedLong) sentiment = 'EXTREME_BULLISH'; // Contrarian bearish
  else if (isOverLeveragedShort) sentiment = 'EXTREME_BEARISH'; // Contrarian bullish
  else if (fundingRate > 0.01) sentiment = 'BULLISH';
  else if (fundingRate < -0.01) sentiment = 'BEARISH';

  return {
    longShortRatio,
    fundingRate,
    openInterest,
    oiChange24h: 0,
    sentiment,
    isOverLeveragedLong,
    isOverLeveragedShort,
  };
}

// ─── Fetch Current Price ────────────────────────────────────────────────────

export async function fetchCurrentPrice(symbol: string): Promise<number> {
  const url = `${BINANCE_SPOT_BASE}/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  return parseFloat(data.price);
}
