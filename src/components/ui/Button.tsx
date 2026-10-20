import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow focus:ring-emerald-500',
    secondary: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 focus:ring-emerald-400 border border-emerald-200/60',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-emerald-500 shadow-xs',
    ghost: 'text-slate-600 hover:bg-slate-100/80 active:bg-slate-200/70 focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400 shadow-sm'
  };

  const sizes = {
    sm: 'text-xs px-3 py-2 rounded-xl gap-1.5 min-h-[38px]',
    md: 'text-sm px-4 py-2.5 rounded-2xl gap-2 min-h-[46px]',
    lg: 'text-base px-6 py-3.5 rounded-2xl gap-2.5 min-h-[52px]'
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
};
