'use client';

import { useAppStore } from '@/store/app-store';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import { calculateATR } from '@/engine/indicators';

export function RiskPanel() {
  const { selectedCoin, selectedTimeframe, candles, settings, livePrices } = useAppStore();
  const coinCandles = candles[selectedCoin]?.[selectedTimeframe] ?? [];
  const { riskSettings } = settings;
  const price = livePrices[selectedCoin] ?? coinCandles[coinCandles.length - 1]?.close ?? 0;

  const calc = useMemo(() => {
    if (coinCandles.length < 20 || price === 0) return null;
    const atr = calculateATR(coinCandles);
    const atrVal = atr.current;
    const stopDist = atrVal * 1.5;
    const riskDollars = riskSettings.totalCapital * (riskSettings.riskPerTrade / 100);
    const positionSizeCoins = stopDist > 0 ? riskDollars / stopDist : 0;
    const positionSizeDollars = positionSizeCoins * price;
    const suggestedBuyStop = price - stopDist;
    const suggestedSellStop = price + stopDist;
    const maxLoss = riskSettings.totalCapital * (riskSettings.maxDailyLoss / 100);

    return {
      atrVal, stopDist, riskDollars, positionSizeCoins,
      positionSizeDollars, suggestedBuyStop, suggestedSellStop, maxLoss,
    };
  }, [coinCandles, price, riskSettings]);

  const rules = [
    { label: `Max ${riskSettings.riskPerTrade}% per trade`, met: true },
    { label: `Max ${riskSettings.maxDailyLoss}% daily loss`, met: true },
    { label: `Min 1:${riskSettings.minRiskReward} R:R`, met: true },
    { label: `Max ${riskSettings.maxConcurrentPositions} positions`, met: true },
    { label: `Max ${riskSettings.maxTradesPerDay} trades/day`, met: true },
  ];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} style={{ color: 'var(--blue)' }} />
        <span className="text-sm font-semibold">Risk Management</span>
      </div>

      {/* Capital overview */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <InfoBox label="Capital" value={`$${riskSettings.totalCapital.toLocaleString()}`} />
        <InfoBox label="Risk/Trade" value={`$${calc?.riskDollars.toFixed(0) ?? '—'}`} color="var(--yellow)" />
        <InfoBox label="Position Size" value={calc ? `$${calc.positionSizeDollars.toFixed(0)}` : '—'} />
        <InfoBox label="Max Daily Loss" value={calc ? `-$${calc.maxLoss.toFixed(0)}` : '—'} color="var(--red)" />
      </div>

      {/* ATR-based stops */}
      {calc && (
        <div className="rounded-lg p-2 mb-3" style={{ background: 'var(--background-tertiary)' }}>
          <p className="text-xs mb-1.5" style={{ color: 'var(--foreground-muted)' }}>
            ATR-Based Levels (ATR = ${calc.atrVal.toFixed(2)})
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div>
              <span style={{ color: 'var(--foreground-muted)' }}>Buy SL: </span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>${calc.suggestedBuyStop.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)' }}>Sell SL: </span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>${calc.suggestedSellStop.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)' }}>Coins: </span>
              <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{calc.positionSizeCoins.toFixed(4)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)' }}>Stop Dist: </span>
              <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>${calc.stopDist.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Rules checklist */}
      <div className="space-y-1.5">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <CheckCircle size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span style={{ color: 'var(--foreground-muted)' }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ label, value, color = 'var(--foreground)' }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--background-tertiary)' }}>
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--foreground-muted)' }}>{label}</div>
      <div className="text-sm font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}
