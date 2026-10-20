import React from 'react';
import { cn } from '../../lib/utils';
import { Check, Clock, XCircle, AlertCircle } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className
}) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-lg gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 rounded-xl gap-1.5 font-semibold'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border tracking-tight',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export const PresentBadge: React.FC<{ time?: string }> = ({ time }) => (
  <Badge variant="success" icon={<Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}>
    ✓ Present {time ? `• ${time}` : ''}
  </Badge>
);

export const UpcomingBadge: React.FC<{ label?: string }> = ({ label = 'Upcoming' }) => (
  <Badge variant="info" icon={<Clock className="w-3.5 h-3.5 text-sky-600" />}>
    {label}
  </Badge>
);

export const ActiveBadge: React.FC<{ label?: string }> = ({ label = 'Active' }) => (
  <Badge variant="success" icon={<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}>
    {label}
  </Badge>
);
