'use client';

import { useAppStore } from '@/store/app-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData } from 'lightweight-charts';
import type { Candle } from '@/engine/types';

function formatPrice(p: number) {
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return p.toFixed(6);
}

export function ChartPanel() {
  const { selectedCoin, selectedTimeframe, candles } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [ohlc, setOhlc] = useState<Candle | null>(null);

  const coinCandles: Candle[] = candles[selectedCoin]?.[selectedTimeframe] ?? [];

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8892a4',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e2736', style: LineStyle.Dotted },
        horzLines: { color: '#1e2736', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6c5ce7', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#6c5ce7', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#1e2736',
        textColor: '#8892a4',
      },
      timeScale: {
        borderColor: '#1e2736',
        textColor: '#8892a4',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00e676',
      downColor: '#ff5252',
      borderUpColor: '#00e676',
      borderDownColor: '#ff5252',
      wickUpColor: '#00e676',
      wickDownColor: '#ff5252',
    });

    // Volume histogram series
    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#1e2736',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Crosshair update OHLC display
    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setOhlc(null); return; }
      const data = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      if (data) {
        setOhlc({
          time: typeof data.time === 'number' ? data.time : 0,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: 0,
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current || coinCandles.length === 0) return;

    const sortedCandles = [...coinCandles].sort((a, b) => a.time - b.time);

    const candleData: CandlestickData[] = sortedCandles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData = sortedCandles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
    }));

    candleSeriesRef.current.setData(candleData);
    volSeriesRef.current.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [coinCandles]);

  const lastCandle = coinCandles[coinCandles.length - 1];
  const displayed = ohlc ?? lastCandle;
  const isGreen = displayed ? displayed.close >= displayed.open : true;

  return (
    <div
      className="glass-card flex flex-col overflow-hidden"
      style={{ minHeight: '340px' }}
    >
      {/* OHLC Bar */}
      <div
        className="flex items-center gap-4 px-4 py-2 text-xs flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--foreground-muted)' }}>
          {selectedCoin.replace('USDT', '/USDT')} · {selectedTimeframe}
        </span>
        {displayed && (
          <>
            <OHLCItem label="O" value={formatPrice(displayed.open)} color="var(--foreground)" />
            <OHLCItem label="H" value={formatPrice(displayed.high)} color="var(--green)" />
            <OHLCItem label="L" value={formatPrice(displayed.low)} color="var(--red)" />
            <OHLCItem
              label="C"
              value={formatPrice(displayed.close)}
              color={isGreen ? 'var(--green)' : 'var(--red)'}
            />
          </>
        )}
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: '300px' }}>
        {coinCandles.length === 0 && (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--foreground-muted)' }}>
            <div className="text-center">
              <div className="skeleton w-full h-full absolute inset-0 opacity-30" />
              <p className="text-sm relative z-10">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OHLCItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span>
      <span style={{ color: 'var(--foreground-muted)' }}>{label}: </span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </span>
  );
}
