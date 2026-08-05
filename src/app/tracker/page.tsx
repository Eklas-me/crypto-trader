'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { fetchHistoricalRange } from '@/services/binance-api';
import { Activity, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type RangePreset = '24h' | '7d' | '1m' | 'custom';

export default function TrackerPage() {
  const { watchlist, livePrices } = useAppStore();
  
  const [selectedCoin, setSelectedCoin] = useState(watchlist[0]?.symbol || 'BTCUSDT');
  const [preset, setPreset] = useState<RangePreset>('24h');
  
  // Dates for custom range
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [rangeHigh, setRangeHigh] = useState<number | null>(null);
  const [rangeLow, setRangeLow] = useState<number | null>(null);
  const [rangeVolume, setRangeVolume] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  
  const currentPrice = livePrices[selectedCoin] || 0;

  const calculateRange = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const now = Date.now();
      let startTime = 0;
      let interval: '1h' | '4h' | '1d' = '1d';
      
      if (preset === '24h') {
        startTime = now - 24 * 60 * 60 * 1000;
        interval = '1h';
      } else if (preset === '7d') {
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        interval = '4h';
      } else if (preset === '1m') {
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        interval = '1d';
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
      
      if (candles.length === 0) {
        throw new Error('No data found for this range');
      }

      let high = -Infinity;
      let low = Infinity;
      let vol = 0;
      
      candles.forEach(c => {
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
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom') {
      calculateRange();
    }
  }, [selectedCoin, preset]);

  // Meter calculation
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

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-blue-500" />
          Crypto Range Tracker
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">Analyze historical extremes and current situation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Controls Card */}
        <div className="col-span-1 lg:col-span-3 glass-panel p-6 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">Select Coin</label>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
            >
              {watchlist.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.symbol.replace('USDT', '')}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs uppercase tracking-wider text-[var(--foreground-muted)] mb-2">Time Range</label>
            <div className="flex bg-[var(--surface-active)] rounded-lg p-1 border border-[var(--border)]">
              {['24h', '7d', '1m', 'custom'].map(p => (
                <button
                  key={p}
                  onClick={() => setPreset(p as RangePreset)}
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
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-1.5 text-sm mb-[2px] transition-colors disabled:opacity-50"
              >
                Fetch
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="col-span-1 lg:col-span-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* High Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-green-500" />
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mb-1">Period High</p>
          <div className="text-3xl font-bold text-green-400 mb-2">
            ${rangeHigh ? formatPrice(rangeHigh) : '---'}
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">Highest price reached in selected range</p>
        </div>

        {/* Low Card */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-red-500 transform scale-y-[-1]" />
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mb-1">Period Low</p>
          <div className="text-3xl font-bold text-red-400 mb-2">
            ${rangeLow ? formatPrice(rangeLow) : '---'}
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">Lowest price reached in selected range</p>
        </div>

        {/* Volume & Change Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-sm text-[var(--foreground-muted)] mb-1">Total Volume Traded</p>
            <div className="text-2xl font-bold text-white mb-4">
              {rangeVolume ? formatVol(rangeVolume) : '---'} <span className="text-sm font-normal text-[var(--foreground-muted)]">{selectedCoin.replace('USDT', '')}</span>
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

      {/* Current Position Meter */}
      <div className="glass-panel p-8 rounded-2xl mb-8 flex-1 flex flex-col justify-center min-h-[250px]">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Current Situation</h2>
            <p className="text-sm text-[var(--foreground-muted)]">Where the live price stands relative to the range</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--foreground-muted)] mb-1">Live Price</p>
            <p className="text-2xl font-bold animate-pulse text-blue-400">${currentPrice ? formatPrice(currentPrice) : '---'}</p>
          </div>
        </div>

        <div className="relative w-full h-4 bg-[var(--surface-active)] rounded-full overflow-hidden mb-3 border border-[var(--border)]">
          {/* Gradient fill representing the range */}
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
        
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-sm text-blue-200">
            <strong>Analysis Insight: </strong>
            {positionPercent > 80 ? 
              `The price is currently hovering near its ${preset === 'custom' ? 'custom range' : preset} highs, indicating strong bullish momentum. Watch for potential breakouts or overbought exhaustion.` : 
             positionPercent < 20 ? 
              `The price is resting near its ${preset === 'custom' ? 'custom range' : preset} lows, indicating bearish pressure. This could be a support zone for a bounce or risk of further breakdown.` :
             positionPercent > 50 ?
              `The price is in the upper half of its range, maintaining a generally bullish posture but consolidating below recent highs.` :
              `The price is in the lower half of its range, suggesting weakness but avoiding extreme lows. Market may be range-bound.`}
          </p>
        </div>
      </div>
    </div>
  );
}
