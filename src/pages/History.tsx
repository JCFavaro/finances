import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { TransactionList } from '../components/transactions/TransactionList';
import { useTransactions, useMonthSummary, deleteTransaction } from '../db/supabase/useTransactions';
import { formatCurrency } from '../utils/currency';
import type { MonthYearFilter } from '../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function History() {
  const navigate = useNavigate();
  const now = new Date();
  const [filter, setFilter] = useState<MonthYearFilter>({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const transactions = useTransactions(filter);
  const summary = useMonthSummary(filter);

  const handleEdit = (id: number) => {
    navigate(`/add?edit=${id}`);
  };

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

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta transacción?')) {
      await deleteTransaction(id);
    }
  };

  const isCurrentMonth = filter.month === now.getMonth() && filter.year === now.getFullYear();

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

      {/* Summary */}
      <Card>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Ingresos</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(summary?.income ?? 0)}
            </p>
          </div>
          <div className="w-px bg-slate-100" />
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Gastos</p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(summary?.expenses ?? 0)}
            </p>
          </div>
          <div className="w-px bg-slate-100" />
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Balance</p>
            <p className={`text-lg font-bold ${
              (summary?.balance ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatCurrency(summary?.balance ?? 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Transactions */}
      <Card>
        <TransactionList
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Sin transacciones este mes"
        />
      </Card>
    </div>
  );
}
