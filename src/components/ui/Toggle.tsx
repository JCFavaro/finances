interface ToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Toggle<T extends string>({ options, value, onChange, className = '' }: ToggleProps<T>) {
  return (
    <div className={`flex bg-slate-100 rounded-xl p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
