import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useRecurringIncomes, addRecurringIncome, deleteRecurringIncome, toggleRecurringIncomeActive } from '../db/supabase/useRecurringIncomes';
import { useRecurringExpenses, addRecurringExpense, deleteRecurringExpense, toggleRecurringExpenseActive } from '../db/supabase/useRecurringExpenses';
import { useShortcuts, addShortcut, updateShortcut, deleteShortcut } from '../db/supabase/useShortcuts';
import { useBudgets, addBudget, updateBudget, deleteBudget, toggleBudgetActive } from '../db/supabase/useBudgets';
import { useAssets, addAsset, updateAsset, deleteAsset, ASSET_TYPES, useAssetPrices } from '../db/supabase/useAssets';
import { searchCrypto, getCryptoPrices, type CoinInfo } from '../services/cryptoPrices';
import { searchCedear, validateCedear } from '../services/cedearPrices';
import { formatNumber, formatCurrency } from '../utils/currency';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, COMMON_ICONS } from '../utils/constants';
import type { Currency, IncomeCategory, ExpenseCategory, AssetType } from '../types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function Config() {
  const { exchangeRate, refreshExchangeRate } = useApp();
  const { user, signOut } = useAuth();
  const recurringIncomes = useRecurringIncomes();
  const recurringExpenses = useRecurringExpenses();
  const shortcuts = useShortcuts();
  const budgets = useBudgets();
  const assets = useAssets();
  const { cryptoPrices, cedearPrices, isLoadingPrices } = useAssetPrices(assets);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<number | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<number | null>(null);
  const [editingBudget, setEditingBudget] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Form state for recurring income
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [category, setCategory] = useState<IncomeCategory>('sueldo');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  // Form state for recurring expense
  const [expenseName, setExpenseName] = useState('');
  const [expenseIcon, setExpenseIcon] = useState('📺');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>('ARS');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('suscripciones');
  const [expenseDayOfMonth, setExpenseDayOfMonth] = useState('1');

  // Form state for shortcuts
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutIcon, setShortcutIcon] = useState('☕');
  const [shortcutAmount, setShortcutAmount] = useState('');
  const [shortcutCurrency, setShortcutCurrency] = useState<Currency>('ARS');
  const [shortcutCategory, setShortcutCategory] = useState<ExpenseCategory>('comida');

  // Form state for budgets
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategory>('comida');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>('ARS');

  // Form state for assets
  const [assetName, setAssetName] = useState('');
  const [assetAmount, setAssetAmount] = useState('');
  const [assetCurrency, setAssetCurrency] = useState<Currency>('ARS');
  const [assetType, setAssetType] = useState<AssetType>('banco');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetPurchasePrice, setAssetPurchasePrice] = useState('');

  // Ticker search state
  const [tickerSearch, setTickerSearch] = useState('');
  const [tickerSearchResults, setTickerSearchResults] = useState<CoinInfo[]>([]);
  const [cedearSearchResults, setCedearSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<{ id: string; symbol: string; name: string } | null>(null);
  const [selectedCedear, setSelectedCedear] = useState<{ symbol: string; name: string; currency: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);

  const debouncedTickerSearch = useDebounce(tickerSearch, 300);

  // Search crypto when input changes
  useEffect(() => {
    if (assetType !== 'crypto') return;
    if (!debouncedTickerSearch || debouncedTickerSearch.length < 2) {
      setTickerSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchCrypto(debouncedTickerSearch)
      .then(results => {
        setTickerSearchResults(results);
      })
      .finally(() => setIsSearching(false));
  }, [debouncedTickerSearch, assetType]);

  // Search CEDEAR when input changes
  useEffect(() => {
    if (assetType !== 'cedear') return;
    const results = searchCedear(debouncedTickerSearch);
    setCedearSearchResults(results);
  }, [debouncedTickerSearch, assetType]);

  // Fetch price preview when ticker is selected
  useEffect(() => {
    if (selectedTicker && assetQuantity) {
      getCryptoPrices([selectedTicker.id]).then(prices => {
        const price = prices[selectedTicker.id];
        if (price) {
          setPreviewPrice(price * parseFloat(assetQuantity || '0'));
        }
      });
    } else {
      setPreviewPrice(null);
    }
  }, [selectedTicker, assetQuantity]);

  const handleSelectCrypto = useCallback(async (coin: CoinInfo) => {
    setSelectedTicker({ id: coin.id, symbol: coin.symbol, name: coin.name });
    setTickerSearch(coin.symbol);
    setTickerSearchResults([]);
    setValidationError(null);
  }, []);

  const handleSelectCedear = useCallback(async (cedear: { symbol: string; name: string }) => {
    setIsValidating(true);
    setValidationError(null);

    const result = await validateCedear(cedear.symbol);
    setIsValidating(false);

    if (result) {
      setSelectedCedear({ symbol: result.symbol, name: result.name, currency: result.currency });
      setTickerSearch(cedear.symbol.replace('.BA', ''));
      setCedearSearchResults([]);
      setPreviewPrice(result.price);
    } else {
      setValidationError('No se encontró. Verificá el símbolo.');
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddRecurring = async () => {
    if (!name || !amount || parseFloat(amount) <= 0 || !user) return;

    try {
      await addRecurringIncome(user.id, {
        name,
        amount: parseFloat(amount),
        currency,
        category,
        dayOfMonth: parseInt(dayOfMonth),
        isActive: true,
      });

      setShowAddModal(false);
      setName('');
      setAmount('');
      setCurrency('ARS');
      setCategory('sueldo');
      setDayOfMonth('1');
    } catch (error) {
      console.error('Error adding recurring income:', error);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (confirm('¿Eliminar este ingreso recurrente?')) {
      await deleteRecurringIncome(id);
    }
  };

  // Recurring Expense handlers
  const resetExpenseForm = () => {
    setExpenseName('');
    setExpenseIcon('📺');
    setExpenseAmount('');
    setExpenseCurrency('ARS');
    setExpenseCategory('suscripciones');
    setExpenseDayOfMonth('1');
  };

  const handleAddRecurringExpense = async () => {
    if (!expenseName || !expenseAmount || parseFloat(expenseAmount) <= 0 || !user) return;

    try {
      await addRecurringExpense(user.id, {
        name: expenseName,
        icon: expenseIcon,
        amount: parseFloat(expenseAmount),
        currency: expenseCurrency,
        category: expenseCategory,
        dayOfMonth: parseInt(expenseDayOfMonth),
        isActive: true,
      });

      setShowExpenseModal(false);
      resetExpenseForm();
    } catch (error) {
      console.error('Error adding recurring expense:', error);
    }
  };

  const handleDeleteRecurringExpense = async (id: number) => {
    if (confirm('¿Eliminar este gasto recurrente?')) {
      await deleteRecurringExpense(id);
    }
  };

  // Shortcut handlers
  const resetShortcutForm = () => {
    setShortcutName('');
    setShortcutIcon('☕');
    setShortcutAmount('');
    setShortcutCurrency('ARS');
    setShortcutCategory('comida');
    setEditingShortcut(null);
  };

  const handleAddShortcut = async () => {
    if (!shortcutName || !shortcutAmount || parseFloat(shortcutAmount) <= 0 || !user) return;

    try {
      if (editingShortcut) {
        await updateShortcut(editingShortcut, {
          name: shortcutName,
          icon: shortcutIcon,
          amount: parseFloat(shortcutAmount),
          currency: shortcutCurrency,
          category: shortcutCategory,
        });
      } else {
        await addShortcut(user.id, {
          name: shortcutName,
          icon: shortcutIcon,
          amount: parseFloat(shortcutAmount),
          currency: shortcutCurrency,
          category: shortcutCategory,
        });
      }

      setShowShortcutModal(false);
      resetShortcutForm();
    } catch (error) {
      console.error('Error saving shortcut:', error);
    }
  };

  const handleEditShortcut = (shortcut: NonNullable<typeof shortcuts>[0]) => {
    setShortcutName(shortcut.name);
    setShortcutIcon(shortcut.icon);
    setShortcutAmount(String(shortcut.amount));
    setShortcutCurrency(shortcut.currency);
    setShortcutCategory(shortcut.category);
    setEditingShortcut(shortcut.id!);
    setShowShortcutModal(true);
  };

  const handleDeleteShortcut = async (id: number) => {
    if (confirm('¿Eliminar este acceso rápido?')) {
      await deleteShortcut(id);
    }
  };

  // Budget handlers
  const resetBudgetForm = () => {
    setBudgetCategory('comida');
    setBudgetAmount('');
    setBudgetCurrency('ARS');
    setEditingBudget(null);
  };

  const handleAddBudget = async () => {
    if (!budgetAmount || parseFloat(budgetAmount) <= 0 || !user) return;

    try {
      if (editingBudget) {
        await updateBudget(editingBudget, {
          category: budgetCategory,
          amount: parseFloat(budgetAmount),
          currency: budgetCurrency,
        });
      } else {
        await addBudget(user.id, {
          category: budgetCategory,
          amount: parseFloat(budgetAmount),
          currency: budgetCurrency,
          isActive: true,
        });
      }

      setShowBudgetModal(false);
      resetBudgetForm();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleEditBudget = (budget: NonNullable<typeof budgets>[0]) => {
    setBudgetCategory(budget.category);
    setBudgetAmount(String(budget.amount));
    setBudgetCurrency(budget.currency);
    setEditingBudget(budget.id!);
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = async (id: number) => {
    if (confirm('¿Eliminar este presupuesto?')) {
      await deleteBudget(id);
    }
  };

  const resetAssetForm = () => {
    setAssetName('');
    setAssetAmount('');
    setAssetCurrency('ARS');
    setAssetType('banco');
    setAssetQuantity('');
    setAssetPurchasePrice('');
    setTickerSearch('');
    setSelectedTicker(null);
    setSelectedCedear(null);
    setTickerSearchResults([]);
    setCedearSearchResults([]);
    setValidationError(null);
    setPreviewPrice(null);
    setEditingAsset(null);
  };

  const handleAddAsset = async () => {
    if (!user) return;

    // Validate based on type
    if (assetType === 'crypto') {
      if (!selectedTicker || !assetQuantity || parseFloat(assetQuantity) <= 0) {
        setValidationError('Seleccioná una crypto y cantidad válida');
        return;
      }
    } else if (assetType === 'cedear') {
      if (!selectedCedear || !assetQuantity || parseFloat(assetQuantity) <= 0) {
        setValidationError('Seleccioná un CEDEAR y cantidad válida');
        return;
      }
    } else {
      if (!assetName || !assetAmount || parseFloat(assetAmount) < 0) return;
    }

    try {
      const isCrypto = assetType === 'crypto';
      const isCedear = assetType === 'cedear';

      const cedearCurrency = selectedCedear?.currency === 'ARS' ? 'ARS' : 'USD';

      const purchasePrice = assetPurchasePrice ? parseFloat(assetPurchasePrice) : undefined;

      if (editingAsset) {
        await updateAsset(editingAsset, {
          name: isCrypto ? selectedTicker!.name : isCedear ? selectedCedear!.name : assetName,
          amount: isCrypto || isCedear ? 0 : parseFloat(assetAmount),
          currency: isCrypto ? 'USD' : isCedear ? cedearCurrency : assetCurrency,
          type: assetType,
          ticker: isCrypto ? selectedTicker!.id : isCedear ? selectedCedear!.symbol : undefined,
          quantity: isCrypto || isCedear ? parseFloat(assetQuantity) : undefined,
          purchasePrice: isCrypto || isCedear ? purchasePrice : undefined,
        });
      } else {
        await addAsset(user.id, {
          name: isCrypto ? selectedTicker!.name : isCedear ? selectedCedear!.name : assetName,
          amount: isCrypto || isCedear ? 0 : parseFloat(assetAmount),
          currency: isCrypto ? 'USD' : isCedear ? cedearCurrency : assetCurrency,
          type: assetType,
          ticker: isCrypto ? selectedTicker!.id : isCedear ? selectedCedear!.symbol : undefined,
          quantity: isCrypto || isCedear ? parseFloat(assetQuantity) : undefined,
          purchasePrice: isCrypto || isCedear ? purchasePrice : undefined,
        });
      }

      setShowAssetModal(false);
      resetAssetForm();
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  const handleEditAsset = (asset: NonNullable<typeof assets>[0]) => {
    setAssetName(asset.name);
    setAssetAmount(String(asset.amount));
    setAssetCurrency(asset.currency);
    setAssetType(asset.type);
    setAssetQuantity(asset.quantity ? String(asset.quantity) : '');
    setAssetPurchasePrice(asset.purchasePrice ? String(asset.purchasePrice) : '');

    if (asset.type === 'crypto' && asset.ticker) {
      setSelectedTicker({ id: asset.ticker, symbol: asset.ticker.toUpperCase(), name: asset.name });
      setTickerSearch(asset.ticker);
    } else if (asset.type === 'cedear' && asset.ticker) {
      setSelectedCedear({ symbol: asset.ticker, name: asset.name, currency: asset.currency });
      setTickerSearch(asset.ticker.replace('.BA', ''));
    }

    setEditingAsset(asset.id!);
    setShowAssetModal(true);
  };

  const handleDeleteAsset = async (id: number) => {
    if (confirm('¿Eliminar este activo?')) {
      await deleteAsset(id);
    }
  };

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Exchange Rate */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">Dólar Blue</h3>
              {exchangeRate === null && (
                <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
            {exchangeRate ? (
              <div className="text-sm text-slate-500 mt-1">
                <span>Compra: ${formatNumber(exchangeRate.compra)}</span>
                <span className="mx-2">|</span>
                <span>Venta: ${formatNumber(exchangeRate.venta)}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Cargando...</p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={refreshExchangeRate}>
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Patrimonio / Assets */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Patrimonio</h3>
            {(assets === undefined || isLoadingPrices) && (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <Button size="sm" onClick={() => { resetAssetForm(); setShowAssetModal(true); }}>
            + Agregar
          </Button>
        </div>

        {assets && assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((asset) => {
              const typeInfo = ASSET_TYPES.find(t => t.value === asset.type);
              const isCrypto = asset.type === 'crypto' && asset.ticker && asset.quantity;
              const isCedear = asset.type === 'cedear' && asset.ticker && asset.quantity;
              const currentPrice = isCrypto
                ? (cryptoPrices[asset.ticker!] || 0)
                : isCedear
                ? (cedearPrices[asset.ticker!] || 0)
                : 0;
              const currentValue = isCrypto || isCedear
                ? asset.quantity! * currentPrice
                : asset.amount;
              const isLoadingPrice = (isCrypto || isCedear) && isLoadingPrices;

              // Calculate gain/loss if purchasePrice exists
              const hasPurchasePrice = (isCrypto || isCedear) && asset.purchasePrice && asset.purchasePrice > 0;
              const costBasis = hasPurchasePrice ? asset.quantity! * asset.purchasePrice! : 0;
              const gainLoss = hasPurchasePrice ? currentValue - costBasis : 0;
              const gainLossPercent = hasPurchasePrice && costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
              const isGain = gainLoss >= 0;

              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                      {typeInfo?.icon || '💰'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{asset.name}</p>
                      <p className="text-xs text-slate-500">
                        {isCrypto
                          ? `${asset.quantity} ${asset.ticker?.toUpperCase()}`
                          : isCedear
                          ? `${asset.quantity} ${asset.ticker?.replace('.BA', '')}`
                          : typeInfo?.label || asset.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoadingPrice && (
                      <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <div className="text-right">
                      <span className={`font-semibold ${isCrypto || asset.currency === 'USD' ? 'text-blue-600' : 'text-slate-900'}`}>
                        {isCrypto
                          ? formatCurrency(currentValue, 'USD')
                          : isCedear
                          ? formatCurrency(currentValue, asset.currency)
                          : formatCurrency(asset.amount, asset.currency)
                        }
                      </span>
                      {hasPurchasePrice && currentPrice > 0 && (
                        <p className={`text-xs font-medium ${isGain ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isGain ? '+' : ''}{formatCurrency(gainLoss, isCrypto ? 'USD' : asset.currency)} ({isGain ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id!)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay activos cargados
          </p>
        )}
      </Card>

      {/* Recurring Incomes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Ingresos Recurrentes</h3>
            {recurringIncomes === undefined && (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Agregar
          </Button>
        </div>

        {recurringIncomes && recurringIncomes.length > 0 ? (
          <div className="space-y-3">
            {recurringIncomes.map((income) => (
              <div
                key={income.id}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRecurringIncomeActive(income.id!, !income.isActive)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      income.isActive
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {income.isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <p className={`font-medium ${income.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                      {income.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Día {income.dayOfMonth} de cada mes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-semibold">
                    {formatCurrency(income.amount, income.currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteRecurring(income.id!)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay ingresos recurrentes configurados
          </p>
        )}
      </Card>

      {/* Recurring Expenses */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Gastos Recurrentes</h3>
            {recurringExpenses === undefined && (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <Button size="sm" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
            + Agregar
          </Button>
        </div>

        {recurringExpenses && recurringExpenses.length > 0 ? (
          <div className="space-y-3">
            {recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRecurringExpenseActive(expense.id!, !expense.isActive)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      expense.isActive
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {expense.isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                    {expense.icon}
                  </div>
                  <div>
                    <p className={`font-medium ${expense.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                      {expense.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Día {expense.dayOfMonth} de cada mes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-semibold">
                    -{formatCurrency(expense.amount, expense.currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteRecurringExpense(expense.id!)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay gastos recurrentes configurados
          </p>
        )}
      </Card>

      {/* Quick Shortcuts */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Accesos Rápidos</h3>
            {shortcuts === undefined && (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <Button size="sm" onClick={() => { resetShortcutForm(); setShowShortcutModal(true); }}>
            + Agregar
          </Button>
        </div>

        {shortcuts && shortcuts.length > 0 ? (
          <div className="space-y-3">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                    {shortcut.icon}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{shortcut.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(shortcut.amount, shortcut.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditShortcut(shortcut)}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteShortcut(shortcut.id!)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay accesos rápidos configurados
          </p>
        )}
      </Card>

      {/* Budgets */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Presupuestos</h3>
            {budgets === undefined && (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <Button size="sm" onClick={() => { resetBudgetForm(); setShowBudgetModal(true); }}>
            + Agregar
          </Button>
        </div>

        {budgets && budgets.length > 0 ? (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const catInfo = EXPENSE_CATEGORIES.find(c => c.value === budget.category);
              return (
                <div
                  key={budget.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBudgetActive(budget.id!, !budget.isActive)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        budget.isActive
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {budget.isActive && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                      {catInfo?.icon || '📦'}
                    </div>
                    <div>
                      <p className={`font-medium ${budget.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                        {catInfo?.label || budget.category}
                      </p>
                      <p className="text-xs text-slate-500">
                        Límite mensual
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(budget.amount, budget.currency)}
                    </span>
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id!)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay presupuestos configurados
          </p>
        )}
      </Card>

      {/* Account */}
      <Card>
        <h3 className="font-semibold text-slate-900 mb-4">Cuenta</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">Email</span>
            <span className="text-sm font-medium text-slate-900">{user?.email}</span>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </div>
      </Card>

      {/* Add Recurring Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar Ingreso Recurrente"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sueldo"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Monto"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Moneda</label>
              <Toggle
                options={[
                  { value: 'ARS', label: 'ARS' },
                  { value: 'USD', label: 'USD' },
                ]}
                value={currency}
                onChange={setCurrency}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncomeCategory)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Día del mes"
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />

          <Button onClick={handleAddRecurring} className="w-full" size="lg">
            Guardar
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Asset Modal */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => { setShowAssetModal(false); resetAssetForm(); }}
        title={editingAsset ? 'Editar Activo' : 'Agregar Activo'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo</label>
            <select
              value={assetType}
              onChange={(e) => {
                setAssetType(e.target.value as AssetType);
                setTickerSearch('');
                setSelectedTicker(null);
                setSelectedCedear(null);
                setTickerSearchResults([]);
                setCedearSearchResults([]);
                setValidationError(null);
                setPreviewPrice(null);
              }}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {assetType === 'crypto' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Buscar Crypto</label>
                <Input
                  value={tickerSearch}
                  onChange={(e) => {
                    setTickerSearch(e.target.value);
                    setSelectedTicker(null);
                    setValidationError(null);
                  }}
                  placeholder="Ej: bitcoin, eth, solana..."
                />
                {isSearching && (
                  <p className="text-xs text-slate-400 mt-1">Buscando...</p>
                )}
                {tickerSearchResults.length > 0 && !selectedTicker && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {tickerSearchResults.map((coin) => (
                      <button
                        key={coin.id}
                        type="button"
                        onClick={() => handleSelectCrypto(coin)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <span className="font-medium text-slate-900">{coin.symbol}</span>
                        <span className="text-slate-500 ml-2">{coin.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedTicker && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-900">{selectedTicker.symbol}</span>
                      <span className="text-blue-600 ml-2">{selectedTicker.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicker(null);
                        setTickerSearch('');
                        setPreviewPrice(null);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <Input
                label="Cantidad"
                type="number"
                step="0.00000001"
                value={assetQuantity}
                onChange={(e) => setAssetQuantity(e.target.value)}
                placeholder="0.00000000"
              />

              <Input
                label="Precio de compra (USD por unidad)"
                type="number"
                step="0.01"
                value={assetPurchasePrice}
                onChange={(e) => setAssetPurchasePrice(e.target.value)}
                placeholder="Opcional - para calcular ganancia"
              />

              {selectedTicker && previewPrice !== null && parseFloat(assetQuantity || '0') > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Valor actual</p>
                  <p className="text-lg font-semibold text-slate-900">
                    ${formatNumber(previewPrice)} USD
                  </p>
                </div>
              )}
            </>
          )}

          {assetType === 'cedear' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Buscar CEDEAR</label>
                <Input
                  value={tickerSearch}
                  onChange={(e) => {
                    setTickerSearch(e.target.value);
                    setSelectedCedear(null);
                    setValidationError(null);
                    setPreviewPrice(null);
                  }}
                  placeholder="Ej: AAPL, GOOGL, MELI..."
                />
                {isValidating && (
                  <p className="text-xs text-slate-400 mt-1">Validando...</p>
                )}
                {cedearSearchResults.length > 0 && !selectedCedear && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {cedearSearchResults.map((cedear) => (
                      <button
                        key={cedear.symbol}
                        type="button"
                        onClick={() => handleSelectCedear(cedear)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <span className="font-medium text-slate-900">{cedear.symbol.replace('.BA', '')}</span>
                        <span className="text-slate-500 ml-2">{cedear.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCedear && (
                  <div className="mt-2 p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-medium text-emerald-900">{selectedCedear.symbol.replace('.BA', '')}</span>
                      <span className="text-emerald-600 ml-2">{selectedCedear.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCedear(null);
                        setTickerSearch('');
                        setPreviewPrice(null);
                      }}
                      className="text-emerald-500 hover:text-emerald-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <Input
                label="Cantidad"
                type="number"
                step="1"
                value={assetQuantity}
                onChange={(e) => setAssetQuantity(e.target.value)}
                placeholder="0"
              />

              <Input
                label={`Precio de compra (${selectedCedear?.currency || 'USD'} por unidad)`}
                type="number"
                step="0.01"
                value={assetPurchasePrice}
                onChange={(e) => setAssetPurchasePrice(e.target.value)}
                placeholder="Opcional - para calcular ganancia"
              />

              {selectedCedear && previewPrice !== null && parseFloat(assetQuantity || '0') > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Valor actual</p>
                  <p className="text-lg font-semibold text-slate-900">
                    ${formatNumber(previewPrice * parseFloat(assetQuantity || '0'))} {selectedCedear.currency}
                  </p>
                  <p className="text-xs text-slate-400">
                    1 {selectedCedear.symbol.replace('.BA', '')} = ${formatNumber(previewPrice)} {selectedCedear.currency}
                  </p>
                </div>
              )}
            </>
          )}

          {assetType !== 'crypto' && assetType !== 'cedear' && (
            <>
              <Input
                label="Nombre"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Ej: Cuenta Banco Galicia"
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="Monto"
                    type="number"
                    value={assetAmount}
                    onChange={(e) => setAssetAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Moneda</label>
                  <Toggle
                    options={[
                      { value: 'ARS', label: 'ARS' },
                      { value: 'USD', label: 'USD' },
                    ]}
                    value={assetCurrency}
                    onChange={setAssetCurrency}
                  />
                </div>
              </div>
            </>
          )}

          {validationError && (
            <p className="text-sm text-red-500">{validationError}</p>
          )}

          <Button onClick={handleAddAsset} className="w-full" size="lg">
            {editingAsset ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </Modal>

      {/* Add Recurring Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); resetExpenseForm(); }}
        title="Agregar Gasto Recurrente"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="Ej: Netflix, Alquiler"
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Icono</label>
            <div className="grid grid-cols-8 gap-2">
              {COMMON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setExpenseIcon(icon)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                    expenseIcon === icon
                      ? 'bg-blue-500 ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Monto"
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Moneda</label>
              <Toggle
                options={[
                  { value: 'ARS', label: 'ARS' },
                  { value: 'USD', label: 'USD' },
                ]}
                value={expenseCurrency}
                onChange={setExpenseCurrency}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Categoría</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Día del mes"
            type="number"
            min="1"
            max="31"
            value={expenseDayOfMonth}
            onChange={(e) => setExpenseDayOfMonth(e.target.value)}
          />

          <Button onClick={handleAddRecurringExpense} className="w-full" size="lg">
            Guardar
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Shortcut Modal */}
      <Modal
        isOpen={showShortcutModal}
        onClose={() => { setShowShortcutModal(false); resetShortcutForm(); }}
        title={editingShortcut ? 'Editar Acceso Rápido' : 'Agregar Acceso Rápido'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={shortcutName}
            onChange={(e) => setShortcutName(e.target.value)}
            placeholder="Ej: Café, Almuerzo"
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Icono</label>
            <div className="grid grid-cols-8 gap-2">
              {COMMON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setShortcutIcon(icon)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                    shortcutIcon === icon
                      ? 'bg-blue-500 ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Monto"
                type="number"
                value={shortcutAmount}
                onChange={(e) => setShortcutAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Moneda</label>
              <Toggle
                options={[
                  { value: 'ARS', label: 'ARS' },
                  { value: 'USD', label: 'USD' },
                ]}
                value={shortcutCurrency}
                onChange={setShortcutCurrency}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Categoría</label>
            <select
              value={shortcutCategory}
              onChange={(e) => setShortcutCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleAddShortcut} className="w-full" size="lg">
            {editingShortcut ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Budget Modal */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => { setShowBudgetModal(false); resetBudgetForm(); }}
        title={editingBudget ? 'Editar Presupuesto' : 'Agregar Presupuesto'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Categoría</label>
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Límite mensual"
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Moneda</label>
              <Toggle
                options={[
                  { value: 'ARS', label: 'ARS' },
                  { value: 'USD', label: 'USD' },
                ]}
                value={budgetCurrency}
                onChange={setBudgetCurrency}
              />
            </div>
          </div>

          <Button onClick={handleAddBudget} className="w-full" size="lg">
            {editingBudget ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
