'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { fetchHistoricalRange } from '@/services/binance-api';
import type { Candle } from '@/engine/types';
import {
  Activity, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

type RangePreset = '24h' | '7d' | '1m' | 'custom';

interface DailyRow {
  date: string;        // formatted date
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  dollarChange: number;
  pctChange: number;
}

const DEFAULT_COINS = [
  { symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'BNBUSDT' },
  { symbol: 'SOLUSDT' }, { symbol: 'XRPUSDT' },
];

export default function TrackerPage() {
  const { watchlist, livePrices } = useAppStore();

  const validWatchlist = watchlist.filter(
    (c) => c && typeof c.symbol === 'string' && c.symbol.length > 0,
  );
  const coinList = validWatchlist.length > 0 ? validWatchlist : DEFAULT_COINS;

  const [selectedCoin, setSelectedCoin] = useState(coinList[0]?.symbol || 'BTCUSDT');
  const [preset, setPreset] = useState<RangePreset>('24h');

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary stats
  const [rangeHigh, setRangeHigh] = useState<number | null>(null);
  const [rangeLow, setRangeLow] = useState<number | null>(null);
  const [rangeVolume, setRangeVolume] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // Daily table rows
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  // Whether to show table (7d / 1m / custom)
  const showTable = preset !== '24h';

  const currentPrice = livePrices[selectedCoin] || 0;

  // ─── Helper: group candles into daily buckets ──────────────────────────────
  function groupByDay(candles: Candle[]): DailyRow[] {
    // Key: YYYY-MM-DD
    const buckets: Record<string, Candle[]> = {};
    for (const c of candles) {
      const d = new Date(c.time * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(c);
    }

    return Object.keys(buckets)
      .sort()
      .map((key) => {
        const cs = buckets[key];
        const high = Math.max(...cs.map((c) => c.high));
        const low = Math.min(...cs.map((c) => c.low));
        const open = cs[0].open;
        const close = cs[cs.length - 1].close;
        const volume = cs.reduce((s, c) => s + c.volume, 0);
        const dollarChange = close - open;
        const pctChange = ((close - open) / open) * 100;
        // Format date nicely
        const [y, m, day] = key.split('-');
        const dateStr = new Date(Number(y), Number(m) - 1, Number(day))
          .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        return { date: dateStr, open, close, high, low, volume, dollarChange, pctChange };
      })
      .reverse(); // newest first
  }

  const calculateRange = async () => {
    setIsLoading(true);
    setError(null);
    setDailyRows([]);

    try {
      const now = Date.now();
      let startTime = 0;
      let interval: '1h' | '4h' | '1d' = '1d';

      if (preset === '24h') {
        startTime = now - 24 * 60 * 60 * 1000;
        interval = '1h';
      } else if (preset === '7d') {
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        interval = '1h'; // hourly data for 7d, then group by day
      } else if (preset === '1m') {
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        interval = '1d'; // daily candles for 1m
      } else {
        if (!fromDate || !toDate) throw new Error('Please select both from and to dates');
        startTime = new Date(fromDate).getTime();
        const endTime = new Date(toDate).getTime();
        if (startTime >= endTime) throw new Error('From date must be before To date');
        const diffDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
        interval = diffDays <= 2 ? '1h' : diffDays <= 14 ? '4h' : '1d';
      }

      const endTime = preset === 'custom' ? new Date(toDate).getTime() : now;
      const candles = await fetchHistoricalRange(selectedCoin, interval, startTime, endTime);

      if (candles.length === 0) throw new Error('No data found for this range');

      let high = -Infinity;
      let low = Infinity;
      let vol = 0;

      candles.forEach((c) => {
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
        vol += c.volume;
      });

      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;

      setRangeHigh(high);
      setRangeLow(low);
      setRangeVolume(vol);
      setPriceChange(change);

      // Build daily table for multi-day ranges
      if (preset !== '24h') {
        setDailyRows(groupByDay(candles));
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom') {
      calculateRange();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin, preset]);

  let positionPercent = 0;
  if (rangeHigh && rangeLow && currentPrice) {
    positionPercent = ((currentPrice - rangeLow) / (rangeHigh - rangeLow)) * 100;
    positionPercent = Math.max(0, Math.min(100, positionPercent));
  }

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toFixed(2);
    if (p >= 10) return p.toFixed(4);
    return p.toFixed(6);
  };

  const formatVol = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
    return v.toFixed(2);
  };

  const baseName = selectedCoin?.replace?.('USDT', '') ?? selectedCoin ?? '';

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-blue-500" />
          Crypto Range Tracker
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">Analyze historical extremes and current situation</p>
      </div>

      {/* ── Controls ── */}
      <div className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-end mb-6 rounded-2xl">
        <div className="flex-1 w-full">
          <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">Select Coin</label>
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
          >
            {coinList.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {(c.symbol ?? '').replace('USDT', '')}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">Time Range</label>
          <div className="flex bg-[var(--surface-active)] rounded-lg p-1 border border-[var(--border)]">
            {(['24h', '7d', '1m', 'custom'] as RangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${preset === p ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-[var(--foreground-muted)] hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-1 gap-2 w-full">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <button
              onClick={calculateRange}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-1.5 text-sm self-end transition-colors disabled:opacity-50"
            >
              Fetch
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-[var(--foreground-muted)]">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading data...
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* High */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={64} className="text-green-500" />
              </div>
              <p className="text-sm text-[var(--foreground-muted)] mb-1">Period High</p>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${rangeHigh ? formatPrice(rangeHigh) : '---'}
              </div>
              <p className="text-xs text-[var(--foreground-muted)]">Highest price in selected range</p>
            </div>

            {/* Low */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={64} className="text-red-500 transform scale-y-[-1]" />
              </div>
              <p className="text-sm text-[var(--foreground-muted)] mb-1">Period Low</p>
              <div className="text-3xl font-bold text-red-400 mb-2">
                ${rangeLow ? formatPrice(rangeLow) : '---'}
              </div>
              <p className="text-xs text-[var(--foreground-muted)]">Lowest price in selected range</p>
            </div>

            {/* Volume & Change */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <p className="text-sm text-[var(--foreground-muted)] mb-1">Total Volume Traded</p>
                <div className="text-2xl font-bold text-white mb-4">
                  {rangeVolume ? formatVol(rangeVolume) : '---'}{' '}
                  <span className="text-sm font-normal text-[var(--foreground-muted)]">{baseName}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--foreground-muted)] mb-1">Net Price Change</p>
                <div className={`text-xl font-bold flex items-center gap-1 ${priceChange !== null && priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange !== null && priceChange >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  {priceChange !== null ? `${Math.abs(priceChange).toFixed(2)}%` : '---'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Range Position Meter ── */}
          <div className="glass-panel p-8 rounded-2xl mb-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Current Situation</h2>
                <p className="text-sm text-[var(--foreground-muted)]">Where the live price stands relative to the range</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--foreground-muted)] mb-1">Live Price</p>
                <p className="text-2xl font-bold animate-pulse text-blue-400">
                  ${currentPrice ? formatPrice(currentPrice) : '---'}
                </p>
              </div>
            </div>

            <div className="relative w-full h-4 bg-[var(--surface-active)] rounded-full overflow-hidden mb-3 border border-[var(--border)]">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${positionPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-[var(--foreground-muted)]">
              <div className="text-left">
                <span className="block text-red-400 font-bold mb-1">0% (LOW)</span>
                ${rangeLow ? formatPrice(rangeLow) : '---'}
              </div>
              <div className="text-center">
                <span className="block text-white font-bold mb-1">{positionPercent.toFixed(1)}%</span>
                Current
              </div>
              <div className="text-right">
                <span className="block text-green-400 font-bold mb-1">100% (HIGH)</span>
                ${rangeHigh ? formatPrice(rangeHigh) : '---'}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-200">
                <strong>Analysis Insight: </strong>
                {positionPercent > 80
                  ? `Price is near its ${preset === 'custom' ? 'custom range' : preset} highs — strong bullish momentum. Watch for breakout or overbought exhaustion.`
                  : positionPercent < 20
                  ? `Price is near its ${preset === 'custom' ? 'custom range' : preset} lows — bearish pressure. Possible support bounce or further breakdown.`
                  : positionPercent > 50
                  ? `Price is in the upper half of its range — generally bullish but consolidating.`
                  : `Price is in the lower half of its range — slight weakness, market may be range-bound.`}
              </p>
            </div>
          </div>

          {/* ── Daily Breakdown Table ── */}
          {showTable && dailyRows.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  Daily Breakdown
                  <span className="ml-2 text-sm font-normal text-[var(--foreground-muted)]">
                    — {dailyRows.length} days
                  </span>
                </h2>
                <span className="text-xs text-[var(--foreground-muted)]">Newest first</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border)]">
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-right px-4 py-3">Open</th>
                      <th className="text-right px-4 py-3">Close</th>
                      <th className="text-right px-4 py-3">High</th>
                      <th className="text-right px-4 py-3">Low</th>
                      <th className="text-right px-4 py-3">$ Change</th>
                      <th className="text-right px-4 py-3">% Change</th>
                      <th className="text-right px-6 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((row, i) => {
                      const isUp = row.dollarChange >= 0;
                      return (
                        <tr
                          key={i}
                          className="border-b border-[var(--border)]/40 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-3 font-medium text-white whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 text-right font-mono text-[var(--foreground-muted)]">
                            ${formatPrice(row.open)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            ${formatPrice(row.close)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-400">
                            ${formatPrice(row.high)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-400">
                            ${formatPrice(row.low)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            <span className="flex items-center justify-end gap-1">
                              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              ${Math.abs(row.dollarChange).toFixed(2)}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                              style={{
                                background: isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                                border: `1px solid ${isUp ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                              }}
                            >
                              {isUp ? '+' : ''}{row.pctChange.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-[var(--foreground-muted)]">
                            {formatVol(row.volume)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
