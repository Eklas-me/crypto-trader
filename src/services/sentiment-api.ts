// ============================================================================
// CryptoTrader Pro — Fear & Greed + CoinGecko Sentiment API
// ============================================================================

import type { FearGreedData, MarketCorrelation, TrendDirection } from '@/engine/types';

// ─── Fear & Greed Index (Alternative.me) ────────────────────────────────────

export async function fetchFearGreedIndex(): Promise<FearGreedData> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!res.ok) throw new Error('Fear & Greed API error');
    const data = await res.json();
    const item = data.data[0];
    const value = parseInt(item.value, 10);

    let classification: FearGreedData['classification'];
    if (value <= 20) classification = 'EXTREME_FEAR';
    else if (value <= 40) classification = 'FEAR';
    else if (value <= 60) classification = 'NEUTRAL';
    else if (value <= 80) classification = 'GREED';
    else classification = 'EXTREME_GREED';

    return {
      value,
      classification,
      timestamp: parseInt(item.timestamp, 10) * 1000,
    };
  } catch {
    return { value: 50, classification: 'NEUTRAL', timestamp: Date.now() };
  }
}

// ─── CoinGecko: Global Market Data ──────────────────────────────────────────

interface CGGlobal {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
}

export async function fetchGlobalMarketData(): Promise<MarketCorrelation> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global');
    if (!res.ok) throw new Error('CoinGecko global error');
    const json = await res.json();
    const data: CGGlobal = json.data;

    const btcDominance = data.market_cap_percentage.btc || 50;
    const ethDominance = data.market_cap_percentage.eth || 15;
    const usdtDominance = data.market_cap_percentage.usdt || 5;

    // Determine BTC trend from 24h market cap change
    const marketCapChange = data.market_cap_change_percentage_24h_usd;
    let btcTrend: TrendDirection = 'SIDEWAYS';
    if (marketCapChange > 2) btcTrend = 'UPTREND';
    else if (marketCapChange < -2) btcTrend = 'DOWNTREND';

    // Altseason: BTC dominance falling AND alts pumping
    const isAltseason = btcDominance < 45 && ethDominance > 18;

    // Market phase
    let marketPhase: MarketCorrelation['marketPhase'] = 'MIXED';
    if (isAltseason) marketPhase = 'ALTSEASON';
    else if (btcDominance > 55 && marketCapChange > 0) marketPhase = 'BTC_ONLY';
    else if (marketCapChange < -5) marketPhase = 'EVERYTHING_DOWN';

    return {
      btcDominance,
      btcDomChange24h: 0,
      usdtDominance,
      isAltseason,
      btcTrend,
      marketPhase,
    };
  } catch {
    return {
      btcDominance: 50, btcDomChange24h: 0, usdtDominance: 5,
      isAltseason: false, btcTrend: 'SIDEWAYS', marketPhase: 'MIXED',
    };
  }
}

// ─── CoinGecko: Coin Info ───────────────────────────────────────────────────

export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
  totalVolume: number;
  circulatingSupply: number;
  ath: number;
  athChangePercentage: number;
}

const SYMBOL_TO_CG_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  LINK: 'chainlink', MATIC: 'matic-network', DOGE: 'dogecoin',
  SHIB: 'shiba-inu', LTC: 'litecoin', ATOM: 'cosmos',
  NEAR: 'near', APT: 'aptos', SUI: 'sui', ARB: 'arbitrum',
  OP: 'optimism', INJ: 'injective-protocol',
};

export function symbolToCoinGeckoId(symbol: string): string {
  const base = symbol.replace('USDT', '').replace('BUSD', '').toUpperCase();
  return SYMBOL_TO_CG_ID[base] || base.toLowerCase();
}

export async function fetchCoinInfo(symbols: string[]): Promise<CoinInfo[]> {
  try {
    const ids = symbols.map(s => symbolToCoinGeckoId(s)).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return data.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      symbol: (d.symbol as string).toUpperCase(),
      name: d.name as string,
      image: d.image as string,
      currentPrice: d.current_price as number,
      marketCap: d.market_cap as number,
      marketCapRank: d.market_cap_rank as number,
      priceChange24h: d.price_change_24h as number,
      priceChangePercentage24h: d.price_change_percentage_24h as number,
      high24h: d.high_24h as number,
      low24h: d.low_24h as number,
      totalVolume: d.total_volume as number,
      circulatingSupply: d.circulating_supply as number,
      ath: d.ath as number,
      athChangePercentage: d.ath_change_percentage as number,
    }));
  } catch {
    return [];
  }
}
