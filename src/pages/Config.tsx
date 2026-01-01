import { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { useApp } from '../context/AppContext';
import { useRecurringIncomes, addRecurringIncome, deleteRecurringIncome, toggleRecurringIncomeActive } from '../db/hooks/useRecurringIncome';
import { useAssets, addAsset, updateAsset, deleteAsset, ASSET_TYPES } from '../db/hooks/useAssets';
import { exportData, importData, downloadAsFile } from '../services/exportImport';
import { clearAllData } from '../db/database';
import { formatNumber, formatCurrency } from '../utils/currency';
import { INCOME_CATEGORIES } from '../utils/constants';
import type { Currency, IncomeCategory, AssetType } from '../types';

export function Config() {
  const { exchangeRate, refreshExchangeRate } = useApp();
  const recurringIncomes = useRecurringIncomes();
  const assets = useAssets();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Form state for recurring income
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [category, setCategory] = useState<IncomeCategory>('sueldo');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  // Form state for assets
  const [assetName, setAssetName] = useState('');
  const [assetAmount, setAssetAmount] = useState('');
  const [assetCurrency, setAssetCurrency] = useState<Currency>('ARS');
  const [assetType, setAssetType] = useState<AssetType>('banco');

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

  const resetAssetForm = () => {
    setAssetName('');
    setAssetAmount('');
    setAssetCurrency('ARS');
    setAssetType('banco');
    setEditingAsset(null);
  };

  const handleAddAsset = async () => {
    if (!assetName || !assetAmount || parseFloat(assetAmount) < 0) return;

    try {
      if (editingAsset) {
        await updateAsset(editingAsset, {
          name: assetName,
          amount: parseFloat(assetAmount),
          currency: assetCurrency,
          type: assetType,
        });
      } else {
        await addAsset({
          name: assetName,
          amount: parseFloat(assetAmount),
          currency: assetCurrency,
          type: assetType,
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
    setEditingAsset(asset.id!);
    setShowAssetModal(true);
  };

  const handleDeleteAsset = async (id: number) => {
    if (confirm('¿Eliminar este activo?')) {
      await deleteAsset(id);
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

      {/* Patrimonio / Assets */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Patrimonio</h3>
          <Button size="sm" onClick={() => { resetAssetForm(); setShowAssetModal(true); }}>
            + Agregar
          </Button>
        </div>

        {assets && assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((asset) => {
              const typeInfo = ASSET_TYPES.find(t => t.value === asset.type);
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
                      <p className="text-xs text-slate-500">{typeInfo?.label || asset.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${asset.currency === 'USD' ? 'text-blue-600' : 'text-slate-900'}`}>
                      {formatCurrency(asset.amount, asset.currency)}
                    </span>
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

      {/* Add/Edit Asset Modal */}
      <Modal
        isOpen={showAssetModal}
        onClose={() => { setShowAssetModal(false); resetAssetForm(); }}
        title={editingAsset ? 'Editar Activo' : 'Agregar Activo'}
      >
        <div className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleAddAsset} className="w-full" size="lg">
            {editingAsset ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
