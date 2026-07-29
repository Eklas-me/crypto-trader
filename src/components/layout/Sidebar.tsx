'use client';

import { useAppStore } from '@/store/app-store';
import {
  LayoutDashboard, Search, BookOpen, ClipboardList,
  Settings, TrendingUp, Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'scanner', icon: Search, label: 'Scanner' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'plan', icon: ClipboardList, label: 'Trading Plan' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

export function Sidebar() {
  const { activeTab, setActiveTab, activeSignals } = useAppStore();

  return (
    <aside className="sidebar h-full flex-shrink-0">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center gap-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent), #a855f7)' }}
        >
          <TrendingUp size={20} color="white" />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 w-full px-3">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`sidebar-${id}`}
            onClick={() => setActiveTab(id)}
            className={`sidebar-item w-full relative ${activeTab === id ? 'active' : ''}`}
            title={label}
          >
            <Icon size={20} />
            {/* Signal count badge */}
            {id === 'scanner' && activeSignals.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: 'var(--red)', color: 'white' }}
              >
                {activeSignals.length > 9 ? '9+' : activeSignals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom: live indicator */}
      <div className="mt-auto mb-2 flex flex-col items-center gap-1">
        <div className="live-dot" />
        <span className="text-[9px]" style={{ color: 'var(--foreground-muted)' }}>LIVE</span>
      </div>
    </aside>
  );
}
