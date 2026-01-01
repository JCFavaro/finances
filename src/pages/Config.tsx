import { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { useApp } from '../context/AppContext';
import { useRecurringIncomes, addRecurringIncome, deleteRecurringIncome, toggleRecurringIncomeActive } from '../db/hooks/useRecurringIncome';
import { exportData, importData, downloadAsFile } from '../services/exportImport';
import { clearAllData } from '../db/database';
import { formatNumber, formatCurrency } from '../utils/currency';
import { INCOME_CATEGORIES } from '../utils/constants';
import type { Currency, IncomeCategory } from '../types';

export function Config() {
  const { exchangeRate, refreshExchangeRate } = useApp();
  const recurringIncomes = useRecurringIncomes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Form state for recurring income
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [category, setCategory] = useState<IncomeCategory>('sueldo');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      const filename = `finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
      downloadAsFile(data, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error al exportar datos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      await importData(text);
      alert('Datos importados correctamente');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert('Error al importar datos. Verifica el formato del archivo.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddRecurring = async () => {
    if (!name || !amount || parseFloat(amount) <= 0) return;

    try {
      await addRecurringIncome({
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

  const handleClearAll = async () => {
    if (confirm('¿Estás seguro? Se eliminarán TODOS los datos. Esta acción no se puede deshacer.')) {
      if (confirm('¿CONFIRMAR eliminación de todos los datos?')) {
        await clearAllData();
        window.location.reload();
      }
    }
  };

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Exchange Rate */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Dólar Blue</h3>
            {exchangeRate ? (
              <div className="text-sm text-slate-500 mt-1">
                <span>Compra: ${formatNumber(exchangeRate.compra)}</span>
                <span className="mx-2">|</span>
                <span>Venta: ${formatNumber(exchangeRate.venta)}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No disponible</p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={refreshExchangeRate}>
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Recurring Incomes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Ingresos Recurrentes</h3>
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

      {/* Backup */}
      <Card>
        <h3 className="font-semibold text-slate-900 mb-4">Backup</h3>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? 'Exportando...' : 'Exportar JSON'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importando...' : 'Importar JSON'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="!border-red-200 !bg-red-50/50">
        <h3 className="font-semibold text-red-600 mb-4">Zona de peligro</h3>
        <Button variant="danger" onClick={handleClearAll} className="w-full">
          Eliminar todos los datos
        </Button>
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
    </div>
  );
}
