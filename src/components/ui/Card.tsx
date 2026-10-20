import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'elevated' | 'glass';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  interactive = false,
  ...props
}) => {
  const variants = {
    default: 'bg-white rounded-3xl border border-slate-100 shadow-sm',
    flat: 'bg-slate-50/80 rounded-3xl border border-slate-200/60',
    elevated: 'bg-white rounded-3xl border border-slate-100/80 shadow-md',
    glass: 'bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm'
  };

  return (
    <div
      className={cn(
        variants[variant],
        interactive && 'transition-all duration-200 hover:shadow-md hover:border-slate-200 cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
