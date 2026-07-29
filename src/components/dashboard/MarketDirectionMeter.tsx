'use client';

import { useAppStore } from '@/store/app-store';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export function MarketDirectionMeter() {
  const { marketDirection, fearGreed, correlation } = useAppStore();

  if (!marketDirection) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }

  const { direction, probability, summary, layerBreakdown } = marketDirection;

  const bullishCount = layerBreakdown.filter(l => l.signal === 'BULLISH').length;
  const bearishCount = layerBreakdown.filter(l => l.signal === 'BEARISH').length;
  const neutralCount = layerBreakdown.filter(l => l.signal === 'NEUTRAL').length;
  const total = layerBreakdown.length;

  const dirColor = direction === 'BULLISH' ? 'var(--green)'
    : direction === 'BEARISH' ? 'var(--red)'
      : 'var(--foreground-muted)';

  const Icon = direction === 'BULLISH' ? TrendingUp
    : direction === 'BEARISH' ? TrendingDown
      : Minus;

  return (
    <div className="glass-card p-4 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
          Market Direction
        </span>
        <Activity size={14} style={{ color: 'var(--foreground-muted)' }} />
      </div>

      {/* Direction + Probability */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${dirColor}18`, border: `1px solid ${dirColor}44` }}
        >
          <Icon size={20} style={{ color: dirColor }} />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight" style={{ color: dirColor }}>
            {direction} {probability}%
          </div>
          <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {summary}
          </div>
        </div>
      </div>

      {/* Layer Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>
          <span>Layer Consensus ({total} active)</span>
          <span>{bullishCount}↑ {bearishCount}↓ {neutralCount}→</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-2" style={{ background: 'var(--background-tertiary)' }}>
          <div style={{ width: `${(bullishCount / total) * 100}%`, background: 'var(--green)', transition: 'width 0.6s ease' }} />
          <div style={{ width: `${(neutralCount / total) * 100}%`, background: 'var(--border)' }} />
          <div style={{ width: `${(bearishCount / total) * 100}%`, background: 'var(--red)', transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Layer Dots */}
      <div className="flex flex-wrap gap-1.5">
        {layerBreakdown.map((layer, i) => (
          <div
            key={i}
            title={`${layer.name}: ${layer.signal} (${layer.confidence}%)`}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ background: 'var(--background-tertiary)', cursor: 'default' }}
          >
            <span
              className="layer-dot"
              style={{
                background: layer.signal === 'BULLISH' ? 'var(--green)'
                  : layer.signal === 'BEARISH' ? 'var(--red)'
                    : 'var(--foreground-muted)',
              }}
            />
            <span style={{ color: 'var(--foreground-muted)' }}>{layer.name}</span>
          </div>
        ))}
      </div>

      {/* Fear & Greed + Correlation */}
      <div className="flex gap-2 mt-3">
        {fearGreed && (
          <div
            className="flex-1 rounded-lg p-2 text-center"
            style={{ background: 'var(--background-tertiary)' }}
          >
            <div className="text-lg font-bold" style={{
              color: fearGreed.value <= 25 ? 'var(--green)'
                : fearGreed.value >= 75 ? 'var(--red)'
                  : 'var(--foreground)',
            }}>
              {fearGreed.value}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
              {fearGreed.classification.replace('_', ' ')}
            </div>
          </div>
        )}
        {correlation && (
          <div
            className="flex-1 rounded-lg p-2 text-center"
            style={{ background: 'var(--background-tertiary)' }}
          >
            <div className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {correlation.btcDominance.toFixed(1)}%
            </div>
            <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
              BTC.D {correlation.isAltseason ? '🚀 Altseason' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
