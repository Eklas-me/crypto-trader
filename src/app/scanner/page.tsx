'use client';

import { useAppStore } from '@/store/app-store';
import { useScanner } from '@/hooks/use-data-feed';
import { useState } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Signal } from '@/engine/types';

export default function ScannerPage() {
  const { signals, settings, isLoading, setIsLoading, lastScanTime } = useAppStore();
  const { scanAll } = useScanner();
  const [filter, setFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [dirFilter, setDirFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const handleScan = async () => {
    setIsLoading(true);
    await scanAll();
    setIsLoading(false);
  };

  const filtered = signals
    .filter(s => filter === 'ALL' || s.grade === filter)
    .filter(s => dirFilter === 'ALL' || s.direction === dirFilter)
    .filter(s => s.status === 'ACTIVE')
    .slice(0, 50);

  const aCount = signals.filter(s => s.grade === 'A' && s.status === 'ACTIVE').length;
  const bCount = signals.filter(s => s.grade === 'B' && s.status === 'ACTIVE').length;

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Search size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Market Scanner</h1>
        </div>

        <div className="flex gap-2 flex-1">
          {/* Grade filter */}
          {(['ALL', 'A', 'B', 'C'] as const).map(g => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: filter === g ? 'var(--accent)' : 'var(--background-tertiary)',
                color: filter === g ? 'white'
                  : g === 'A' ? 'var(--grade-a)' : g === 'B' ? 'var(--grade-b)'
                  : g === 'C' ? 'var(--grade-c)' : 'var(--foreground-muted)',
                border: `1px solid ${filter === g ? 'var(--accent)'
                  : g === 'A' ? 'rgba(0,230,118,0.2)' : g === 'B' ? 'rgba(68,138,255,0.2)'
                  : g === 'C' ? 'rgba(255,215,64,0.2)' : 'var(--border)'}`,
              }}
            >
              {g === 'ALL' ? 'All' : `Grade ${g} ${g === 'A' ? `(${aCount})` : g === 'B' ? `(${bCount})` : ''}`}
            </button>
          ))}

          {/* Direction filter */}
          {(['ALL', 'BUY', 'SELL'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: dirFilter === d ? (d === 'BUY' ? 'var(--green-bg)' : d === 'SELL' ? 'var(--red-bg)' : 'var(--accent)') : 'var(--background-tertiary)',
                color: dirFilter === d ? (d === 'BUY' ? 'var(--green)' : d === 'SELL' ? 'var(--red)' : 'white') : 'var(--foreground-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {d === 'ALL' ? 'Both' : d === 'BUY' ? '▲ Buy' : '▼ Sell'}
            </button>
          ))}
        </div>

        {/* Scan button */}
        <button
          id="scan-all-btn"
          onClick={handleScan}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #a855f7)',
            color: 'white',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Scanning...' : 'Scan All Coins'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Watching', value: settings.watchlist.length + ' coins', color: 'var(--foreground)' },
          { label: 'A-Grade Signals', value: aCount.toString(), color: 'var(--grade-a)' },
          { label: 'B-Grade Signals', value: bCount.toString(), color: 'var(--grade-b)' },
          { label: 'Last Scan', value: lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : 'Never', color: 'var(--foreground-muted)' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-3">
            <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>{stat.label}</div>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Signal Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--background-tertiary)' }}>
              <Search size={32} style={{ color: 'var(--foreground-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              No signals found. Click &quot;Scan All Coins&quot; to start scanning.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(signal => (
              <ScannerSignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScannerSignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === 'BUY';
  const dirColor = isBuy ? 'var(--green)' : 'var(--red)';
  const gradeColor = signal.grade === 'A' ? 'var(--grade-a)' : signal.grade === 'B' ? 'var(--grade-b)' : 'var(--grade-c)';

  const timeAgo = (() => {
    const diff = Date.now() - signal.timestamp;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  })();

  return (
    <div
      className="glass-card p-4 animate-fade-in transition-all hover:scale-[1.01]"
      style={{ borderLeft: `3px solid ${dirColor}`, cursor: 'default' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`grade-badge grade-${signal.grade}`}>{signal.grade}</span>
          <div>
            <div className="font-bold text-sm">{signal.coin.replace('USDT', '/USDT')}</div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{signal.timeframe} · {timeAgo}</div>
          </div>
        </div>
        <div className="text-right">
          <span className={isBuy ? 'direction-buy' : 'direction-sell'}>
            {isBuy ? '▲ BUY' : '▼ SELL'}
          </span>
          <div className="text-xs mt-1" style={{ color: gradeColor }}>
            {signal.layersAgreed}/12 layers
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: 'var(--foreground-muted)' }}>Confidence</span>
          <span style={{ color: gradeColor }}>{signal.confidence}%</span>
        </div>
        <div className="confidence-bar">
          <div className="fill" style={{
            width: `${signal.confidence}%`,
            background: `linear-gradient(90deg, ${gradeColor}88, ${gradeColor})`,
          }} />
        </div>
      </div>

      {/* Key levels */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="rounded-md p-1.5 text-center" style={{ background: 'var(--blue-bg)' }}>
          <div style={{ color: 'var(--foreground-muted)' }}>Entry</div>
          <div style={{ color: 'var(--blue)', fontWeight: 600 }}>${signal.entryPriceLow.toLocaleString()}</div>
        </div>
        <div className="rounded-md p-1.5 text-center" style={{ background: 'var(--green-bg)' }}>
          <div style={{ color: 'var(--foreground-muted)' }}>TP2</div>
          <div style={{ color: 'var(--green)', fontWeight: 600 }}>${signal.tp2.toLocaleString()}</div>
        </div>
        <div className="rounded-md p-1.5 text-center" style={{ background: 'var(--red-bg)' }}>
          <div style={{ color: 'var(--foreground-muted)' }}>SL</div>
          <div style={{ color: 'var(--red)', fontWeight: 600 }}>${signal.stopLoss.toLocaleString()}</div>
        </div>
      </div>

      {/* R:R */}
      <div className="flex justify-end mt-2">
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--background-tertiary)', color: 'var(--foreground-muted)' }}>
          R:R 1:{signal.riskRewardRatio}
        </span>
      </div>
    </div>
  );
}
