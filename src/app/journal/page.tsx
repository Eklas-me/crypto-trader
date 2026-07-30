'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, TrendingUp, TrendingDown, X, Trash2, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Trade } from '@/engine/types';

export default function JournalPage() {
  const { settings } = useAppStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJournal = async () => {
    try {
      const res = await fetch('/api/journal');
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } catch (e) {
      console.error('Failed to fetch journal', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
    // Auto refresh every 10s
    const t = setInterval(fetchJournal, 10000);
    return () => clearInterval(t);
  }, []);

  const clearJournal = async () => {
    if (!confirm('Are you sure you want to clear all paper-trading history?')) return;
    try {
      await fetch('/api/journal', { method: 'DELETE' });
      setTrades([]);
    } catch (e) {
      console.error('Failed to clear journal', e);
    }
  };

  const closedTrades = trades.filter(t => t.status !== 'OPEN');
  const openTrades = trades.filter(t => t.status === 'OPEN');
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;
  
  const balance = settings.riskSettings.totalCapital;

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-lg font-bold">Paper Trading Journal</h1>
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Live Auto-Execution</span>
        </div>
        <button
          onClick={clearJournal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-red-500/20 text-red-500"
        >
          <Trash2 size={14} />
          Clear History
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        <div className="glass-card p-3" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--foreground-muted)' }}>
             <Wallet size={12} /> Account Balance
          </div>
          <div className="text-xl font-bold">${balance.toFixed(2)}</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Total P&L</div>
          <div className="text-xl font-bold" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Win Rate</div>
          <div className="text-xl font-bold" style={{ color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
            {winRate}%
          </div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Total Trades</div>
          <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{closedTrades.length}</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Open Positions</div>
          <div className="text-xl font-bold" style={{ color: 'var(--yellow)' }}>{openTrades.length}</div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="flex-1 overflow-auto glass-card">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Coin', 'Dir', 'Entry', 'Exit', 'Qty', 'SL', 'TP', 'P&L', 'Status', 'Time', 'Notes'].map(h => (
                <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && trades.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-gray-500">Loading trades...</td></tr>
            )}
            {!loading && trades.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-gray-500">No trades yet. Waiting for automated signals...</td></tr>
            )}
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
                <td className="px-3 py-2 tabular-nums">{t.quantity.toFixed(4)}</td>
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
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>
                  {new Date(t.entryTime).toLocaleString()}
                </td>
                <td className="px-3 py-2 max-w-[150px] truncate" style={{ color: 'var(--foreground-muted)' }}>{t.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
