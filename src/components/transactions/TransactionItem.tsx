import type { Transaction } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatShortDate } from '../../utils/date';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/constants';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const categoryInfo = allCategories.find(c => c.value === transaction.category);

  const formattedDate = formatShortDate(new Date(transaction.date));
  const isExpense = transaction.type === 'expense';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Category icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${categoryInfo?.color}15` }}
      >
        {categoryInfo?.icon || '💰'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">
            {transaction.description || categoryInfo?.label || transaction.category}
          </span>
          {transaction.currency === 'USD' && (
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded shrink-0">
              USD
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500">{formattedDate}</div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className={`font-semibold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
          {isExpense ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}
        </div>
        {transaction.currency === 'USD' && (
          <div className="text-xs text-slate-400">
            {formatCurrency(transaction.amountARS, 'ARS')}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="flex items-center shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction.id!)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id!)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
