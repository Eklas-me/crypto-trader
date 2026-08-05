// ============================================================================
// CryptoTrader Pro — Global State Store (Zustand)
// ============================================================================

'use client';

import { create } from 'zustand';
import type {
  Signal, Candle, Timeframe, FearGreedData, FuturesSentiment,
  MarketCorrelation, WatchlistCoin, AppSettings, DEFAULT_SETTINGS,
} from '@/engine/types';
import { DEFAULT_SETTINGS as DS } from '@/engine/types';
import type { TickerData } from '@/services/binance-api';
import type { MarketDirection } from '@/engine/signal-engine';

// ─── Store Shape ────────────────────────────────────────────────────────────

interface AppState {
  // ── Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // ── Selected Coin & Timeframe
  selectedCoin: string;
  selectedTimeframe: Timeframe;
  setSelectedCoin: (coin: string) => void;
  setSelectedTimeframe: (tf: Timeframe) => void;

  // ── Candle Data
  candles: Record<string, Record<Timeframe, Candle[]>>;
  setCandles: (coin: string, tf: Timeframe, candles: Candle[]) => void;

  // ── Live Price
  livePrices: Record<string, number>;
  setLivePrice: (coin: string, price: number) => void;

  // ── Ticker Data
  tickers: Record<string, TickerData>;
  setTicker: (coin: string, ticker: TickerData) => void;

  // ── Signals
  signals: Signal[];
  activeSignals: Signal[];
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  updateSignalStatus: (id: string, status: Signal['status']) => void;
  clearOldSignals: () => void;

  // ── Market Direction
  marketDirection: MarketDirection | null;
  setMarketDirection: (dir: MarketDirection) => void;

  // ── Watchlist
  watchlist: WatchlistCoin[];
  setWatchlist: (coins: WatchlistCoin[]) => void;

  // ── External Data
  fearGreed: FearGreedData | null;
  setFearGreed: (data: FearGreedData) => void;

  futures: Record<string, FuturesSentiment>;
  setFutures: (coin: string, data: FuturesSentiment) => void;

  correlation: MarketCorrelation | null;
  setCorrelation: (data: MarketCorrelation) => void;

  // ── UI State
  activeTab: 'dashboard' | 'scanner' | 'journal' | 'plan' | 'settings' | 'tracker';
  setActiveTab: (tab: AppState['activeTab']) => void;

  isLoading: boolean;
  setIsLoading: (v: boolean) => void;

  lastScanTime: number | null;
  setLastScanTime: (t: number) => void;

  // ── Notification
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'signal' | 'info' | 'warning' | 'error';
  timestamp: number;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // ── Settings
  settings: DS,
  setSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),

  // ── Coin & Timeframe
  selectedCoin: 'BTCUSDT',
  selectedTimeframe: '1h',
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),

  // ── Candles
  candles: {},
  setCandles: (coin, tf, candles) => set(state => ({
    candles: {
      ...state.candles,
      [coin]: { ...(state.candles[coin] || {}), [tf]: candles },
    },
  })),

  // ── Live Prices
  livePrices: {},
  setLivePrice: (coin, price) => set(state => ({
    livePrices: { ...state.livePrices, [coin]: price },
  })),

  // ── Tickers
  tickers: {},
  setTicker: (coin, ticker) => set(state => ({
    tickers: { ...state.tickers, [coin]: ticker },
  })),

  // ── Signals
  signals: [],
  activeSignals: [],
  setSignals: (signals) => set({ 
    signals,
    activeSignals: signals.filter((s: Signal) => s.status === 'ACTIVE').slice(0, 50)
  }),
  addSignal: (signal) => set(state => ({
    signals: [signal, ...state.signals].slice(0, 200),
    activeSignals: [signal, ...state.activeSignals.filter(s => s.status === 'ACTIVE')].slice(0, 50),
  })),
  updateSignalStatus: (id, status) => set(state => ({
    signals: state.signals.map(s => s.id === id ? { ...s, status } : s),
    activeSignals: state.activeSignals.map(s => s.id === id ? { ...s, status } : s),
  })),
  clearOldSignals: () => {
    const now = Date.now();
    set(state => ({
      activeSignals: state.activeSignals.filter(
        s => s.expiresAt > now && s.status === 'ACTIVE',
      ),
    }));
  },

  // ── Market Direction
  marketDirection: null,
  setMarketDirection: (dir) => set({ marketDirection: dir }),

  // ── Watchlist
  watchlist: [],
  setWatchlist: (coins) => set({ watchlist: coins }),

  // ── External Data
  fearGreed: null,
  setFearGreed: (data) => set({ fearGreed: data }),

  futures: {},
  setFutures: (coin, data) => set(state => ({
    futures: { ...state.futures, [coin]: data },
  })),

  correlation: null,
  setCorrelation: (data) => set({ correlation: data }),

  // ── UI State
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),

  lastScanTime: null,
  setLastScanTime: (t) => set({ lastScanTime: t }),

  // ── Notifications
  notifications: [],
  addNotification: (n) => set(state => ({
    notifications: [
      { ...n, id: `notif-${Date.now()}`, timestamp: Date.now() },
      ...state.notifications,
    ].slice(0, 20),
  })),
  dismissNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
}));
