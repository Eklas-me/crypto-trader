'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { fetchKlines, fetchTicker, fetchFuturesSentiment, fetchOrderBook } from '@/services/binance-api';
import { fetchFearGreedIndex, fetchGlobalMarketData } from '@/services/sentiment-api';
import { generateSignal, getMarketDirection } from '@/engine/signal-engine';
import { DEFAULT_SETTINGS } from '@/engine/types';
import type { Timeframe } from '@/engine/types';

// ─── Main Data Hook ──────────────────────────────────────────────────────────

export function useDataFeed() {
  const {
    selectedCoin, selectedTimeframe, settings,
    setCandles, setTicker, setLivePrice,
    setFearGreed, setCorrelation, setFutures,
    addSignal, setMarketDirection, setLastScanTime,
    fearGreed, correlation, futures, addNotification,
  } = useAppStore();

  // ── Init Global Data ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
      try {
        const [settingsRes, signalsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/signals')
        ]);
        
        if (mounted && settingsRes.ok) {
          const s = await settingsRes.json();
          useAppStore.getState().setSettings(s);
          if (s.watchlist && s.watchlist.length > 0) {
            useAppStore.getState().setWatchlist(s.watchlist);
          }
        }
        if (mounted && signalsRes.ok) {
          const sigs = await signalsRes.json();
          useAppStore.getState().setSignals(sigs);
        }
      } catch (err) {
        console.error('[App] Failed to load data from DB:', err);
      }
    };
    initData();
    return () => { mounted = false; };
  }, []);

  // ── Fetch candle data + run full analysis ────────────────────────────────
  const runAnalysis = useCallback(async (coin: string, tf: Timeframe) => {
    try {
      const [candles, ticker, fearGreedData] = await Promise.all([
        fetchKlines(coin, tf, 500),
        fetchTicker(coin),
        fearGreed ? Promise.resolve(fearGreed) : fetchFearGreedIndex(),
      ]);

      setCandles(coin, tf, candles);
      setTicker(coin, ticker);
      setLivePrice(coin, ticker.lastPrice);
      if (!fearGreed) setFearGreed(fearGreedData);

      // Futures data (non-blocking)
      const futuresData = await fetchFuturesSentiment(coin).catch(() => undefined);
      if (futuresData) setFutures(coin, futuresData);

      // Generate signal
      const signal = generateSignal({
        candles,
        coin,
        timeframe: tf,
        fearGreed: fearGreedData,
        futures: futuresData,
        correlation: correlation ?? undefined,
        riskSettings: settings.riskSettings,
      });

      if (signal && (signal.grade === 'A' || signal.grade === 'B')) {
        addSignal(signal);
        addNotification({
          title: `${signal.grade}-Grade ${signal.direction} Signal`,
          message: `${coin} ${tf} — ${signal.layersAgreed}/12 layers agree | R:R 1:${signal.riskRewardRatio}`,
          type: 'signal',
        });
      }

      // Market direction
      const direction = getMarketDirection({
        candles,
        coin,
        timeframe: tf,
        fearGreed: fearGreedData,
        futures: futuresData,
        correlation: correlation ?? undefined,
        riskSettings: settings.riskSettings,
      });
      setMarketDirection(direction);
      setLastScanTime(Date.now());
    } catch (err) {
      console.error(`Analysis error for ${coin}:`, err);
    }
  }, [fearGreed, correlation, settings, setCandles, setTicker, setLivePrice,
      setFearGreed, setFutures, addSignal, setMarketDirection, setLastScanTime, addNotification]);

  // ── Fetch global market data (runs once) ─────────────────────────────────
  const fetchGlobal = useCallback(async () => {
    try {
      const [fg, corr] = await Promise.all([
        fetchFearGreedIndex(),
        fetchGlobalMarketData(),
      ]);
      setFearGreed(fg);
      setCorrelation(corr);
    } catch (err) {
      console.error('Global data error:', err);
    }
  }, [setFearGreed, setCorrelation]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchGlobal();
  }, [fetchGlobal]);

  // ── Run analysis on coin/tf change ────────────────────────────────────────
  useEffect(() => {
    runAnalysis(selectedCoin, selectedTimeframe);
  }, [selectedCoin, selectedTimeframe, runAnalysis]);

  // ── Auto-refresh every 2 minutes ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      runAnalysis(selectedCoin, selectedTimeframe);
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCoin, selectedTimeframe, runAnalysis]);

  // ── Live price WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    const symbol = selectedCoin.toLowerCase();
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`,
    );

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setLivePrice(selectedCoin, parseFloat(data.c));
      } catch { /* ignore */ }
    };

    ws.onerror = () => ws.close();

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [selectedCoin, setLivePrice]);

  return { runAnalysis };
}

// ─── Scanner Hook ────────────────────────────────────────────────────────────

export function useScanner() {
  const { settings, addSignal, setLastScanTime, addNotification, fearGreed, correlation } = useAppStore();

  const scanAll = useCallback(async () => {
    const coins = settings.watchlist.slice(0, 10); // Limit to avoid rate limits
    const timeframes: Timeframe[] = ['1h', '4h'];

    for (const coin of coins) {
      for (const tf of timeframes) {
        try {
          const candles = await fetchKlines(coin, tf, 300);
          const signal = generateSignal({
            candles, coin, timeframe: tf,
            fearGreed: fearGreed ?? undefined,
            correlation: correlation ?? undefined,
            riskSettings: settings.riskSettings,
          });
          if (signal && signal.grade !== 'NONE') {
            addSignal(signal);
            if (signal.grade === 'A') {
              addNotification({
                title: `🔥 A-Grade ${signal.direction} — ${coin}`,
                message: `${tf} | ${signal.layersAgreed}/12 layers | R:R 1:${signal.riskRewardRatio}`,
                type: 'signal',
              });
            }
          }
          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 300));
        } catch { /* continue scanning */ }
      }
    }
    setLastScanTime(Date.now());
  }, [settings, fearGreed, correlation, addSignal, setLastScanTime, addNotification]);

  return { scanAll };
}
