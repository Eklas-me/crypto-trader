'use client';

import { useAppStore } from '@/store/app-store';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_WATCHLIST } from '@/engine/types';

export default function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState(settings);

  const save = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local)
      });
      if (res.ok) {
        setSettings(local);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Failed to save settings to database');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    }
  };

  const reset = () => setLocal(DEFAULT_SETTINGS);

  const updateRisk = (key: keyof typeof local.riskSettings, value: number) =>
    setLocal(p => ({ ...p, riskSettings: { ...p.riskSettings, [key]: value } }));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={save} id="settings-save-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: saved ? 'var(--green)' : 'linear-gradient(135deg, var(--accent), #a855f7)', color: 'white' }}>
            <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Management */}
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold mb-4">💰 Risk Management</h2>
          <div className="space-y-4">
            {[
              { key: 'totalCapital', label: 'Total Capital ($)', min: 100, max: 1000000, step: 100 },
              { key: 'riskPerTrade', label: 'Risk Per Trade (%)', min: 0.5, max: 10, step: 0.5 },
              { key: 'maxDailyLoss', label: 'Max Daily Loss (%)', min: 1, max: 20, step: 1 },
              { key: 'maxWeeklyLoss', label: 'Max Weekly Loss (%)', min: 5, max: 30, step: 1 },
              { key: 'minRiskReward', label: 'Min Risk:Reward (1:X)', min: 1, max: 5, step: 0.5 },
              { key: 'maxTradesPerDay', label: 'Max Trades Per Day', min: 1, max: 20, step: 1 },
              { key: 'maxConcurrentPositions', label: 'Max Open Positions', min: 1, max: 10, step: 1 },
              { key: 'cooldownMinutes', label: 'Cooldown After Loss (min)', min: 0, max: 240, step: 15 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <label style={{ color: 'var(--foreground-muted)' }}>{label}</label>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {local.riskSettings[key as keyof typeof local.riskSettings]}
                    {key === 'totalCapital' ? ' USDT' : key.includes('Loss') || key === 'riskPerTrade' ? '%' : key === 'cooldownMinutes' ? 'min' : ''}
                  </span>
                </div>
                <input
                  type="range" min={min} max={max} step={step}
                  value={local.riskSettings[key as keyof typeof local.riskSettings]}
                  onChange={e => updateRisk(key as keyof typeof local.riskSettings, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent)', background: 'var(--background-tertiary)' }}
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                  <span>{min}</span><span>{max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Watchlist */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold mb-3">📋 Watchlist</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
              Coins to monitor in scanner (one per line, e.g. ETHUSDT)
            </p>
            <textarea
              rows={8}
              value={local.watchlist.join('\n')}
              onChange={e => setLocal(p => ({
                ...p,
                watchlist: e.target.value.split('\n').map(s => s.trim().toUpperCase()).filter(Boolean),
              }))}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none"
              style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <button
              onClick={() => setLocal(p => ({ ...p, watchlist: [...DEFAULT_WATCHLIST] }))}
              className="mt-2 text-xs px-3 py-1 rounded-lg"
              style={{ background: 'var(--background-tertiary)', color: 'var(--foreground-muted)', border: '1px solid var(--border)' }}
            >
              Reset to defaults ({DEFAULT_WATCHLIST.length} coins)
            </button>
          </div>

          {/* Signal Settings */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold mb-3">🎯 Signal Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                  Minimum Signal Grade
                </label>
                <div className="flex gap-2">
                  {(['A', 'B', 'C'] as const).map(g => (
                    <button key={g} onClick={() => setLocal(p => ({ ...p, signalSettings: { ...p.signalSettings, minGrade: g } }))}
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: local.signalSettings.minGrade === g ? 'var(--accent)' : 'var(--background-tertiary)',
                        color: local.signalSettings.minGrade === g ? 'white'
                          : g === 'A' ? 'var(--grade-a)' : g === 'B' ? 'var(--grade-b)' : 'var(--grade-c)',
                        border: '1px solid var(--border)',
                      }}>
                      Grade {g}+
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'requireVolumeConfirmation', label: 'Require Volume Confirmation' },
                { key: 'requireMTFAlignment', label: 'Require Multi-Timeframe Alignment' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>{label}</span>
                  <button
                    onClick={() => setLocal(p => ({
                      ...p,
                      signalSettings: {
                        ...p.signalSettings,
                        [key]: !p.signalSettings[key as keyof typeof p.signalSettings],
                      },
                    }))}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{
                      background: local.signalSettings[key as keyof typeof local.signalSettings]
                        ? 'var(--accent)' : 'var(--background-tertiary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: local.signalSettings[key as keyof typeof local.signalSettings] ? '24px' : '3px' }} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Telegram */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold mb-3">📱 Telegram Notifications</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
              Get signal alerts on your phone. Create a bot via @BotFather on Telegram.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Bot Token</label>
                <input
                  type="password"
                  value={local.telegramBotToken}
                  onChange={e => setLocal(p => ({ ...p, telegramBotToken: e.target.value }))}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Chat ID</label>
                <input
                  type="text"
                  value={local.telegramChatId}
                  onChange={e => setLocal(p => ({ ...p, telegramChatId: e.target.value }))}
                  placeholder="Your Telegram chat ID"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
