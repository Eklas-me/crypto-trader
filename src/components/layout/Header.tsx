'use client';

import { useAppStore } from '@/store/app-store';
import { RefreshCw, Bell, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Timeframe } from '@/engine/types';

const TIMEFRAMES: Timeframe[] = ['15m', '1h', '4h', '1d'];
const TF_LABELS: Record<Timeframe, string> = {
  '1m': '1M', '5m': '5M', '15m': '15M', '1h': '1H',
  '4h': '4H', '1d': '1D', '1w': '1W',
};

const TOP_COINS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'AVAXUSDT', 'ADAUSDT', 'LINKUSDT', 'DOTUSDT', 'INJUSDT',
];

export function Header({ onRefresh }: { onRefresh: () => void }) {
  const {
    selectedCoin, selectedTimeframe, livePrices, tickers,
    setSelectedCoin, setSelectedTimeframe, lastScanTime,
    notifications, dismissNotification, isLoading,
  } = useAppStore();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);

  const price = livePrices[selectedCoin] ?? tickers[selectedCoin]?.lastPrice ?? 0;
  const ticker = tickers[selectedCoin];
  const change24h = ticker?.priceChangePercent ?? 0;
  const isPositive = change24h >= 0;
  const unread = notifications.length;

  const lastScanStr = lastScanTime
    ? new Date(lastScanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Never';

  return (
    <header
      className="flex items-center gap-3 px-4 flex-shrink-0 z-40"
      style={{
        height: 'var(--header-height)',
        background: 'var(--background-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Coin Selector */}
      <div className="relative">
        <button
          id="coin-selector-btn"
          onClick={() => setShowCoinDrop(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)' }}
        >
          <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
            {selectedCoin.replace('USDT', '/USDT')}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--foreground-muted)' }} />
        </button>

        {showCoinDrop && (
          <div
            className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden animate-fade-in"
            style={{
              background: 'var(--background-secondary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '160px',
            }}
          >
            {TOP_COINS.map(coin => (
              <button
                key={coin}
                onClick={() => { setSelectedCoin(coin); setShowCoinDrop(false); }}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:brightness-110"
                style={{
                  background: coin === selectedCoin ? 'var(--background-tertiary)' : 'transparent',
                  color: coin === selectedCoin ? 'var(--accent)' : 'var(--foreground)',
                }}
              >
                {coin.replace('USDT', '/USDT')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
          ${price > 0 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 6 : 2 }) : '---'}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: isPositive ? 'var(--green)' : 'var(--red)' }}
        >
          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
        </span>
      </div>

      {/* Timeframe Selector */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg ml-2"
        style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)' }}
      >
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            id={`tf-${tf}`}
            onClick={() => setSelectedTimeframe(tf)}
            className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
            style={{
              background: tf === selectedTimeframe ? 'var(--accent)' : 'transparent',
              color: tf === selectedTimeframe ? 'white' : 'var(--foreground-muted)',
            }}
          >
            {TF_LABELS[tf]}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Last scan */}
      <span className="text-xs hidden md:block" style={{ color: 'var(--foreground-muted)' }}>
        Last scan: {lastScanStr}
      </span>

      {/* Refresh */}
      <button
        id="refresh-btn"
        onClick={onRefresh}
        className="p-2 rounded-lg transition-colors"
        style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)' }}
        title="Refresh Analysis"
      >
        <RefreshCw
          size={16}
          className={isLoading ? 'animate-spin' : ''}
          style={{ color: 'var(--foreground-muted)' }}
        />
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          id="notifications-btn"
          onClick={() => setShowNotifs(v => !v)}
          className="p-2 rounded-lg relative transition-colors"
          style={{ background: 'var(--background-tertiary)', border: '1px solid var(--border)' }}
        >
          <Bell size={16} style={{ color: 'var(--foreground-muted)' }} />
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: 'var(--red)', color: 'white' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden animate-fade-in"
            style={{
              width: '320px',
              background: 'var(--background-secondary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                No new notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="px-4 py-3 flex gap-3 items-start transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: n.type === 'signal' ? 'var(--green)'
                          : n.type === 'warning' ? 'var(--yellow)'
                            : n.type === 'error' ? 'var(--red)'
                              : 'var(--blue)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{n.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--foreground-muted)' }}>{n.message}</p>
                    </div>
                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="text-xs flex-shrink-0"
                      style={{ color: 'var(--foreground-muted)' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
