'use client';

import { useAppStore } from '@/store/app-store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MarketDirectionMeter } from '@/components/dashboard/MarketDirectionMeter';
import { SignalPanel } from '@/components/dashboard/SignalPanel';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { RiskPanel } from '@/components/dashboard/RiskPanel';
import { useDataFeed } from '@/hooks/use-data-feed';
import { useEffect } from 'react';

// ── Lazy page imports ────────────────────────────────────────────────────────
import dynamic from 'next/dynamic';
const ScannerPage = dynamic(() => import('@/app/scanner/page'), { ssr: false });
const JournalPage = dynamic(() => import('@/app/journal/page'), { ssr: false });
const TrackerPage = dynamic(() => import('@/app/tracker/page'), { ssr: false });
const PlanPage    = dynamic(() => import('@/app/plan/page'), { ssr: false });
const SettingsPage = dynamic(() => import('@/app/settings/page'), { ssr: false });

export default function Home() {
  const { activeTab, clearOldSignals } = useAppStore();
  const { runAnalysis } = useDataFeed();
  const { selectedCoin, selectedTimeframe } = useAppStore();

  // Periodically expire old signals
  useEffect(() => {
    const t = setInterval(clearOldSignals, 60_000);
    return () => clearInterval(t);
  }, [clearOldSignals]);

  const handleRefresh = () => runAnalysis(selectedCoin, selectedTimeframe);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onRefresh={handleRefresh} />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {activeTab === 'dashboard' && <DashboardLayout />}
          {activeTab === 'scanner'   && <ScannerPage />}
          {activeTab === 'journal'   && <JournalPage />}
          {activeTab === 'tracker'   && <TrackerPage />}
          {activeTab === 'plan'      && <PlanPage />}
          {activeTab === 'settings'  && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard 3-Column Layout ───────────────────────────────────────────────

function DashboardLayout() {
  return (
    <div
      className="grid h-full gap-3 p-3"
      style={{
        gridTemplateColumns: '300px 1fr 300px',
        gridTemplateRows: '1fr',
        overflow: 'hidden',
      }}
    >
      {/* Left Column: Market Direction + Risk */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <MarketDirectionMeter />
        <RiskPanel />
      </div>

      {/* Center Column: Chart */}
      <div className="overflow-hidden flex flex-col gap-3">
        <ChartPanel />
      </div>

      {/* Right Column: Signals */}
      <div className="overflow-hidden">
        <SignalPanel />
      </div>
    </div>
  );
}
