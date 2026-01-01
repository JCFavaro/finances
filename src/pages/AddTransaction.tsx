import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { addTransaction, updateTransaction } from '../db/hooks/useTransactions';
import { useApp } from '../context/AppContext';
import { convertToARS } from '../services/exchangeRate';
import { triggerHaptic } from '../services/haptics';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants';
import { parseLocalDate, toInputDate } from '../utils/date';
import { db } from '../db/database';
import type { TransactionType, Currency, Category } from '../types';

export function AddTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { exchangeRate } = useApp();

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toInputDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Load transaction for editing
  useEffect(() => {
    if (editId) {
      db.transactions.get(Number(editId)).then((tx) => {
        if (tx) {
          setType(tx.type);
          setAmount(String(tx.amount));
          setCurrency(tx.currency);
          setCategory(tx.category);
          setDescription(tx.description || '');
          setDate(toInputDate(new Date(tx.date)));
          if (tx.description) setShowDescription(true);
        }
      });
    }
  }, [editId]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !category || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      const rate = exchangeRate || { compra: 1, venta: 1 };
      const amountARS = convertToARS(parsedAmount, currency, rate);
      const parsedDate = parseLocalDate(date);

      if (isEditMode && editId) {
        await updateTransaction(Number(editId), {
          type,
          amount: parsedAmount,
          currency,
          amountARS,
          category,
          description: description.trim() || undefined,
          date: parsedDate,
          exchangeRateUsed: currency === 'USD' ? rate.venta : undefined,
        });
      } else {
        await addTransaction({
          type,
          amount: parsedAmount,
          currency,
          amountARS,
          category,
          description: description.trim() || undefined,
          date: parsedDate,
          exchangeRateUsed: currency === 'USD' ? rate.venta : undefined,
        });
      }

      triggerHaptic('success');
      navigate(-1);
    } catch (error) {
      console.error('Error saving transaction:', error);
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-5 py-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900">
          {isEditMode ? 'Editar' : 'Nueva'} transacción
        </h2>
      </div>

      {/* Type Toggle */}
      <Toggle
        options={[
          { value: 'expense', label: 'Gasto' },
          { value: 'income', label: 'Ingreso' },
        ]}
        value={type}
        onChange={(v) => {
          setType(v);
          setCategory(null);
        }}
      />

      {/* Amount Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-slate-400">
              {currency === 'ARS' ? '$' : 'US$'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-16 pr-4 py-4 text-3xl font-bold bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <Toggle
            options={[
              { value: 'ARS', label: 'ARS' },
              { value: 'USD', label: 'USD' },
            ]}
            value={currency}
            onChange={setCurrency}
            className="flex-col"
          />
        </div>

        {currency === 'USD' && exchangeRate && amount && (
          <p className="text-sm text-slate-500 text-center">
            ≈ ${(parseFloat(amount || '0') * exchangeRate.venta).toLocaleString('es-AR')} ARS
          </p>
        )}
      </div>

      {/* Category Grid */}
      <div>
        <p className="text-sm font-medium text-slate-600 mb-3">Categoría</p>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`
                p-4 rounded-2xl border-2 transition-all duration-200
                flex flex-col items-center gap-2
                ${category === cat.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className={`text-xs font-medium ${category === cat.value ? 'text-blue-600' : 'text-slate-600'}`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-3">
        {/* Date */}
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          label="Fecha"
        />

        {/* Description toggle */}
        {!showDescription ? (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Agregar nota
          </button>
        ) : (
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional..."
            label="Nota"
          />
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!amount || !category || parseFloat(amount) <= 0 || isSubmitting}
        className="w-full py-4 text-base"
        size="lg"
      >
        {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
      </Button>
    </div>
  );
}
