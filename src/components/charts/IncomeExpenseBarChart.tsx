import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { MonthlyChartData } from '../../types';
import { formatCompactCurrency } from '../../utils/currency';

interface IncomeExpenseBarChartProps {
  data: MonthlyChartData[];
}

export function IncomeExpenseBarChart({ data }: IncomeExpenseBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-slate-400">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barGap={2}>
        <XAxis
          dataKey="month"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatCompactCurrency(value)}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            color: '#0f172a',
          }}
          formatter={(value) => [formatCompactCurrency(value as number), '']}
          labelStyle={{ color: '#64748b' }}
        />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
      </BarChart>
    </ResponsiveContainer>
  );
}
