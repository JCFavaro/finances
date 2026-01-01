import type { Transaction } from '../../types';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  emptyMessage = 'Sin transacciones'
}: TransactionListProps) {
  if (!transactions) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
