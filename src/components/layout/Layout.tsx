import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/currency';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { exchangeRate, isOnline } = useApp();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100 safe-top">
        <div className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Finanzas</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isOnline && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                Offline
              </span>
            )}
            {exchangeRate && (
              <div className="text-right">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Dólar Blue</div>
                <div className="text-sm font-semibold text-slate-700">
                  ${formatNumber(exchangeRate.venta)}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-28 max-w-lg mx-auto">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
