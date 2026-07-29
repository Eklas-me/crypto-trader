'use client';

import { useAppStore } from '@/store/app-store';
import { Zap, Clock, Target, Shield, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Signal } from '@/engine/types';

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const isBuy = signal.direction === 'BUY';
  const dirColor = isBuy ? 'var(--green)' : 'var(--red)';
  const gradeColor = signal.grade === 'A' ? 'var(--grade-a)'
    : signal.grade === 'B' ? 'var(--grade-b)'
    : 'var(--grade-c)';

  const timeAgo = (() => {
    const diff = Date.now() - signal.timestamp;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  })();

  return (
    <div
      className="glass-card overflow-hidden animate-fade-in"
      style={{ borderLeft: `3px solid ${dirColor}` }}
    >
      {/* Card Header */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Grade Badge */}
            <span className={`grade-badge grade-${signal.grade}`}>{signal.grade}</span>

            {/* Direction */}
            <span className={isBuy ? 'direction-buy' : 'direction-sell'}>
              {isBuy ? '▲ BUY' : '▼ SELL'}
            </span>

            <span className="text-sm font-bold">{signal.coin.replace('USDT', '')}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--background-tertiary)', color: 'var(--foreground-muted)' }}
            >
              {signal.timeframe}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{timeAgo}</span>
            <button onClick={() => setExpanded(v => !v)} style={{ color: 'var(--foreground-muted)' }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Confidence + Layers */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--foreground-muted)' }}>Confidence</span>
              <span style={{ color: gradeColor }}>{signal.confidence}%</span>
            </div>
            <div className="confidence-bar">
              <div
                className="fill"
                style={{
                  width: `${signal.confidence}%`,
                  background: `linear-gradient(90deg, ${gradeColor}88, ${gradeColor})`,
                }}
              />
            </div>
          </div>
          <div className="text-xs text-right flex-shrink-0">
            <span style={{ color: gradeColor }}>{signal.layersAgreed}</span>
            <span style={{ color: 'var(--foreground-muted)' }}>/12 layers</span>
          </div>
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-1.5">
          <PriceBox label="Entry" value={`$${signal.entryPriceLow.toLocaleString()}`} color="var(--blue)" />
          <PriceBox label="Stop Loss" value={`$${signal.stopLoss.toLocaleString()}`} color="var(--red)" />
          <PriceBox label={`R:R 1:${signal.riskRewardRatio}`} value={`TP2: $${signal.tp2.toLocaleString()}`} color="var(--green)" />
        </div>
      </div>

      {/* Expanded: Full layer breakdown + all TPs */}
      {expanded && (
        <div
          className="px-3 pb-3 animate-fade-in"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* All TPs */}
          <div className="grid grid-cols-3 gap-1.5 mt-3 mb-3">
            <PriceBox label="TP1" value={`$${signal.tp1.toLocaleString()}`} color="var(--green)" />
            <PriceBox label="TP2 🎯" value={`$${signal.tp2.toLocaleString()}`} color="var(--green)" />
            <PriceBox label="TP3 🚀" value={`$${signal.tp3.toLocaleString()}`} color="var(--green)" />
          </div>

          {/* Patterns */}
          {signal.candlePatterns.length > 0 && (
            <div className="mb-2">
              <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Patterns</p>
              <div className="flex flex-wrap gap-1">
                {signal.candlePatterns.map((p, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: p.signal === 'BULLISH' ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: p.signal === 'BULLISH' ? 'var(--green)' : 'var(--red)',
                      border: `1px solid ${p.signal === 'BULLISH' ? 'var(--green-border)' : 'var(--red-border)'}`,
                    }}
                  >
                    {p.name.replace(/_/g, ' ')}
                  </span>
                ))}
                {signal.chartPatterns.map((p, i) => (
                  <span
                    key={`chart-${i}`}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--blue-bg)',
                      color: 'var(--blue)',
                      border: '1px solid rgba(68,138,255,0.2)',
                    }}
                  >
                    {p.name.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Layer Breakdown */}
          <p className="text-xs mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Layer Analysis</p>
          <div className="space-y-1">
            {signal.layers.map((layer, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="layer-dot flex-shrink-0"
                  style={{
                    background: layer.signal === 'BULLISH' ? 'var(--green)'
                      : layer.signal === 'BEARISH' ? 'var(--red)'
                      : 'var(--foreground-muted)',
                  }}
                />
                <span className="w-28 flex-shrink-0" style={{ color: 'var(--foreground-muted)' }}>{layer.name}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--foreground)' }}>{layer.details || '—'}</span>
                <span
                  className="flex-shrink-0 font-semibold"
                  style={{
                    color: layer.signal === 'BULLISH' ? 'var(--green)'
                      : layer.signal === 'BEARISH' ? 'var(--red)'
                      : 'var(--foreground-muted)',
                  }}
                >
                  {layer.confidence > 0 ? `${layer.confidence}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: 'var(--background-tertiary)' }}
    >
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--foreground-muted)' }}>{label}</div>
      <div className="text-xs font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

export function SignalPanel() {
  const { activeSignals, signals } = useAppStore();
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const displayed = tab === 'active' ? activeSignals : signals.slice(0, 20);

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--yellow)' }} />
          <span className="text-sm font-semibold">Signals</span>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--background-tertiary)' }}>
          {(['active', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize"
              style={{
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? 'white' : 'var(--foreground-muted)',
              }}
            >
              {t} {t === 'active' ? `(${activeSignals.length})` : `(${signals.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--background-tertiary)' }}
            >
              <Zap size={24} style={{ color: 'var(--foreground-muted)' }} />
            </div>
            <p className="text-sm text-center" style={{ color: 'var(--foreground-muted)' }}>
              No {tab === 'active' ? 'active' : ''} signals yet.<br />
              Analysis runs every 2 minutes.
            </p>
          </div>
        ) : (
          displayed.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  );
}
