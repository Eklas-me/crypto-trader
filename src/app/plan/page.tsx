'use client';

import { useState } from 'react';
import { ClipboardList, CheckCircle, Circle, Calendar, Target, Brain } from 'lucide-react';

const DEFAULT_CHECKLIST = [
  { id: 'structure', label: 'Check HTF market structure (Daily/4H)' },
  { id: 'trend', label: 'Identify current trend direction' },
  { id: 'levels', label: 'Mark key S/R levels for today' },
  { id: 'news', label: 'Check for major news events today' },
  { id: 'ftg', label: 'Check Fear & Greed Index' },
  { id: 'btcd', label: 'Check BTC dominance trend' },
  { id: 'funding', label: 'Check futures funding rates' },
  { id: 'bias', label: 'Define daily bias (Bullish/Bearish/Neutral)' },
  { id: 'session', label: 'Plan which sessions to trade' },
  { id: 'maxloss', label: 'Set max daily loss limit' },
  { id: 'risk', label: 'Calculate position sizes for setups' },
  { id: 'journal', label: 'Review yesterday\'s trades' },
  { id: 'psychology', label: 'Psychology check: calm & disciplined?' },
];

const PSYCHOLOGY_RULES = [
  '❌ No FOMO — wait for clean signal',
  '❌ No revenge trading after a loss',
  '❌ No overtrading — max 5 trades/day',
  '❌ Never move stop loss to loss side',
  '✅ Only A/B grade signals',
  '✅ Close screen if emotional',
  '✅ Log every trade with reason',
  '✅ Review once per week minimum',
];

export default function PlanPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST.map(i => ({ ...i, done: false })));
  const [bias, setBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('NEUTRAL');
  const [notes, setNotes] = useState('');
  const [keyLevels, setKeyLevels] = useState('');

  const completedCount = checklist.filter(i => i.done).length;
  const completionPct = Math.round((completedCount / checklist.length) * 100);

  const toggle = (id: string) =>
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Trading Plan</h1>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          <Calendar size={14} />
          {today}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Daily Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Daily Pre-Market Checklist</h2>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold" style={{ color: completionPct === 100 ? 'var(--green)' : 'var(--foreground-muted)' }}>
                  {completedCount}/{checklist.length}
                </div>
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--background-tertiary)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%`, background: completionPct === 100 ? 'var(--green)' : 'var(--accent)' }} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {checklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all"
                  style={{ background: item.done ? 'var(--green-bg)' : 'var(--background-tertiary)' }}
                >
                  {item.done
                    ? <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    : <Circle size={16} style={{ color: 'var(--foreground-muted)', flexShrink: 0 }} />}
                  <span className="text-sm" style={{
                    color: item.done ? 'var(--green)' : 'var(--foreground)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Bias */}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold mb-3">Daily Bias</h2>
            <div className="flex gap-2 mb-3">
              {(['BULLISH', 'NEUTRAL', 'BEARISH'] as const).map(b => (
                <button
                  key={b}
                  id={`bias-${b.toLowerCase()}`}
                  onClick={() => setBias(b)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: bias === b
                      ? b === 'BULLISH' ? 'var(--green-bg)' : b === 'BEARISH' ? 'var(--red-bg)' : 'var(--background-tertiary)'
                      : 'var(--background-tertiary)',
                    color: bias === b
                      ? b === 'BULLISH' ? 'var(--green)' : b === 'BEARISH' ? 'var(--red)' : 'var(--foreground)'
                      : 'var(--foreground-muted)',
                    border: `1px solid ${bias === b
                      ? b === 'BULLISH' ? 'var(--green-border)' : b === 'BEARISH' ? 'var(--red-border)' : 'var(--border)'
                      : 'var(--border)'}`,
                  }}
                >
                  {b === 'BULLISH' ? '▲ Bullish' : b === 'BEARISH' ? '▼ Bearish' : '→ Neutral'}
                </button>
              ))}
            </div>

            {/* Key Levels */}
            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                Key Price Levels (one per line)
              </label>
              <textarea
                value={keyLevels}
                onChange={e => setKeyLevels(e.target.value)}
                rows={3}
                placeholder="e.g. 65200&#10;64500&#10;66800"
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                Today&apos;s Plan / Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="What is your game plan for today? What setups are you watching?"
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </div>

        {/* Right: Psychology Rules */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} style={{ color: 'var(--purple)' }} />
              <h2 className="text-sm font-semibold">Psychology Rules</h2>
            </div>
            <div className="space-y-2">
              {PSYCHOLOGY_RULES.map((rule, i) => (
                <div
                  key={i}
                  className="text-xs p-2 rounded-lg"
                  style={{
                    background: rule.startsWith('✅') ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: rule.startsWith('✅') ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${rule.startsWith('✅') ? 'var(--green-border)' : 'var(--red-border)'}`,
                  }}
                >
                  {rule}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Stats Placeholder */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} style={{ color: 'var(--yellow)' }} />
              <h2 className="text-sm font-semibold">This Week</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Trades', value: '3' },
                { label: 'Win Rate', value: '67%', color: 'var(--green)' },
                { label: 'Net P&L', value: '+$145', color: 'var(--green)' },
                { label: 'Best Trade', value: '+$87.5', color: 'var(--green)' },
                { label: 'Worst Trade', value: '-$32', color: 'var(--red)' },
                { label: 'Discipline Score', value: '8/10', color: 'var(--accent)' },
              ].map(stat => (
                <div key={stat.label} className="flex justify-between text-xs py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--foreground-muted)' }}>{stat.label}</span>
                  <span style={{ fontWeight: 600, color: stat.color ?? 'var(--foreground)' }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
