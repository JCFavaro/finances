import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  const clickable = onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : '';

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm
        border border-slate-100
        transition-all duration-200
        ${paddings[padding]}
        ${clickable}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
