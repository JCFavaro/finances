import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { IncomeExpenseBarChart } from '../components/charts/IncomeExpenseBarChart';
import { TransactionList } from '../components/transactions/TransactionList';
import { useMonthSummary, useCategoryStats, useTransactions, useMonthlyStats } from '../db/hooks/useTransactions';
import { useAssetsSummary } from '../db/hooks/useAssets';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import { CATEGORY_COLORS } from '../utils/constants';
import type { MonthYearFilter } from '../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function Dashboard() {
  const navigate = useNavigate();
  const { exchangeRate } = useApp();
  const now = new Date();
  const [filter, setFilter] = useState<MonthYearFilter>({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const summary = useMonthSummary(filter);
  const categoryStats = useCategoryStats(filter);
  const transactions = useTransactions(filter);
  const monthlyStats = useMonthlyStats(6);
  const assetsSummary = useAssetsSummary(exchangeRate ?? undefined);

  const handlePrevMonth = () => {
    setFilter(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setFilter(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const isCurrentMonth = filter.month === now.getMonth() && filter.year === now.getFullYear();

  const categoryChartData = categoryStats
    ? Object.entries(categoryStats).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: CATEGORY_COLORS[name] || '#94a3b8',
      }))
    : [];

  const balance = summary?.balance ?? 0;
  const isPositive = balance >= 0;

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">
            {MONTHS[filter.month]} {filter.year}
          </p>
        </div>

        <button
          onClick={handleNextMonth}
          disabled={isCurrentMonth}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isCurrentMonth
              ? 'text-slate-200 cursor-not-allowed'
              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Balance Card - Hero */}
      <Card padding="lg">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500 mb-2">Balance del mes</p>
          <p className={`text-4xl font-bold tracking-tight ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </p>
        </div>

        <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-slate-500">Ingresos</span>
            </div>
            <p className="text-xl font-semibold text-slate-900">
              {formatCurrency(summary?.income ?? 0)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-xs font-medium text-slate-500">Gastos</span>
            </div>
            <p className="text-xl font-semibold text-slate-900">
              {formatCurrency(summary?.expenses ?? 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500 mb-1">Transacciones</p>
          <p className="text-2xl font-bold text-slate-900">{transactions?.length ?? 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500 mb-1">Promedio/día</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency((summary?.expenses ?? 0) / 30)}
          </p>
        </Card>
      </div>

      {/* Patrimony Card */}
      {assetsSummary && assetsSummary.count > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Patrimonio</h3>
            <button
              onClick={() => navigate('/config')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Editar
            </button>
          </div>
          <div className="space-y-2">
            {assetsSummary.totalARS > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Pesos</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(assetsSummary.totalARS, 'ARS')}
                </span>
              </div>
            )}
            {assetsSummary.totalUSD > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Dólares</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(assetsSummary.totalUSD, 'USD')}
                </span>
              </div>
            )}
            {assetsSummary.totalARS > 0 && assetsSummary.totalUSD > 0 && (
              <>
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Total (en ARS)</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(assetsSummary.totalUnifiedARS, 'ARS')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Category Pie Chart */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Gastos por categoría
        </h3>
        <CategoryPieChart data={categoryChartData} />
      </Card>

      {/* Monthly Bar Chart */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Últimos 6 meses
        </h3>
        <IncomeExpenseBarChart data={monthlyStats ?? []} />
      </Card>

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Transacciones recientes
          </h3>
          {transactions && transactions.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todas
            </button>
          )}
        </div>
        <TransactionList
          transactions={transactions?.slice(0, 5)}
          onEdit={(id) => navigate(`/add?edit=${id}`)}
          emptyMessage="Sin transacciones este mes"
        />
      </Card>
    </div>
  );
}
