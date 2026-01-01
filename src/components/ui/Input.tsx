import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-xl
          bg-slate-50 border border-slate-200
          text-slate-900 placeholder-slate-400
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
          transition-all duration-200
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
