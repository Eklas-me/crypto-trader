'use client';

import { useState } from 'react';
import { BookOpen, Plus, TrendingUp, TrendingDown, X } from 'lucide-react';

interface TradeEntry {
  id: string;
  coin: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: string;
  exitTime: string | null;
  status: 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  notes: string;
  pnl: number | null;
}

const SAMPLE_TRADES: TradeEntry[] = [
  {
    id: '1', coin: 'ETHUSDT', direction: 'BUY', entryPrice: 1895, exitPrice: 1950,
    quantity: 0.5, stopLoss: 1860, takeProfit: 1950, entryTime: '2026-07-28 14:30',
    exitTime: '2026-07-29 09:15', status: 'CLOSED_TP', notes: 'Bullish OB + Golden Zone',
    pnl: 27.5,
  },
  {
    id: '2', coin: 'BTCUSDT', direction: 'BUY', entryPrice: 65200, exitPrice: null,
    quantity: 0.01, stopLoss: 63800, takeProfit: 68500, entryTime: '2026-07-29 11:00',
    exitTime: null, status: 'OPEN', notes: 'BOS confirmed + SMC demand zone', pnl: null,
  },
];

export default function JournalPage() {
  const [trades, setTrades] = useState<TradeEntry[]>(SAMPLE_TRADES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    coin: 'ETHUSDT', direction: 'BUY' as 'BUY' | 'SELL',
    entryPrice: '', stopLoss: '', takeProfit: '', quantity: '', notes: '',
  });

  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  const openTrades = trades.filter(t => t.status === 'OPEN');
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  const addTrade = () => {
    if (!form.entryPrice || !form.quantity) return;
    const ep = parseFloat(form.entryPrice);
    const sl = parseFloat(form.stopLoss);
    const tp = parseFloat(form.takeProfit);
    const qty = parseFloat(form.quantity);
    const newTrade: TradeEntry = {
      id: Date.now().toString(), coin: form.coin,
      direction: form.direction, entryPrice: ep, exitPrice: null,
      quantity: qty, stopLoss: sl, takeProfit: tp,
      entryTime: new Date().toLocaleString(), exitTime: null,
      status: 'OPEN', notes: form.notes, pnl: null,
    };
    setTrades(prev => [newTrade, ...prev]);
    setShowAddForm(false);
    setForm({ coin: 'ETHUSDT', direction: 'BUY', entryPrice: '', stopLoss: '', takeProfit: '', quantity: '', notes: '' });
  };

  const removeTrade = (id: string) => setTrades(prev => prev.filter(t => t.id !== id));

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Trade Journal</h1>
        </div>
        <button
          id="add-trade-btn"
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, var(--accent), #a855f7)', color: 'white' }}
        >
          <Plus size={14} />
          Add Trade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' },
          { label: 'Total Trades', value: closedTrades.length.toString(), color: 'var(--foreground)' },
          { label: 'Open Positions', value: openTrades.length.toString(), color: 'var(--yellow)' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-3">
            <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>{stat.label}</div>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Add Trade Form */}
      {showAddForm && (
        <div className="glass-card p-4 flex-shrink-0 animate-fade-in">
          <h3 className="text-sm font-semibold mb-3">New Trade Entry</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Coin</label>
              <input
                value={form.coin}
                onChange={e => setForm(p => ({ ...p, coin: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                placeholder="ETHUSDT"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Direction</label>
              <select
                value={form.direction}
                onChange={e => setForm(p => ({ ...p, direction: e.target.value as 'BUY' | 'SELL' }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                <option value="BUY">▲ BUY</option>
                <option value="SELL">▼ SELL</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Entry Price</label>
              <input type="number" value={form.entryPrice} onChange={e => setForm(p => ({ ...p, entryPrice: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm" placeholder="1895"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Stop Loss</label>
              <input type="number" value={form.stopLoss} onChange={e => setForm(p => ({ ...p, stopLoss: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm" placeholder="1860"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Take Profit</label>
              <input type="number" value={form.takeProfit} onChange={e => setForm(p => ({ ...p, takeProfit: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm" placeholder="1950"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm" placeholder="0.5"
                style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Notes / Reason</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Why did you take this trade?"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addTrade}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Save Trade
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--background-tertiary)', color: 'var(--foreground-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Trade Table */}
      <div className="flex-1 overflow-auto glass-card">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Coin', 'Dir', 'Entry', 'Exit', 'Qty', 'SL', 'TP', 'P&L', 'Status', 'Time', 'Notes', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--background-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td className="px-3 py-2 font-bold">{t.coin.replace('USDT', '')}</td>
                <td className="px-3 py-2">
                  <span className={t.direction === 'BUY' ? 'direction-buy' : 'direction-sell'}>{t.direction === 'BUY' ? '▲' : '▼'} {t.direction}</span>
                </td>
                <td className="px-3 py-2 tabular-nums">${t.entryPrice.toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">{t.exitPrice ? `$${t.exitPrice.toLocaleString()}` : '—'}</td>
                <td className="px-3 py-2 tabular-nums">{t.quantity}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--red)' }}>${t.stopLoss.toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--green)' }}>${t.takeProfit.toLocaleString()}</td>
                <td className="px-3 py-2 font-bold tabular-nums" style={{ color: t.pnl === null ? 'var(--foreground-muted)' : t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {t.pnl === null ? '—' : `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}`}
                </td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: t.status === 'OPEN' ? 'var(--yellow-bg)' : t.status === 'CLOSED_TP' ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: t.status === 'OPEN' ? 'var(--yellow)' : t.status === 'CLOSED_TP' ? 'var(--green)' : 'var(--red)',
                    }}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>{t.entryTime}</td>
                <td className="px-3 py-2 max-w-[150px] truncate" style={{ color: 'var(--foreground-muted)' }}>{t.notes}</td>
                <td className="px-3 py-2">
                  <button onClick={() => removeTrade(t.id)} style={{ color: 'var(--foreground-muted)' }}>
                    <X size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
