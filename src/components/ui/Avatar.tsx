import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoUrl,
  size = 'md',
  className
}) => {
  const getInitials = (str: string) => {
    if (!str) return 'FT';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'w-8 h-8 text-xs font-semibold',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-extrabold'
  };

  // Consistent pleasant pastel colors based on string
  const getBgColor = (str: string) => {
    const colors = [
      'bg-emerald-100 text-emerald-800',
      'bg-indigo-100 text-indigo-800',
      'bg-amber-100 text-amber-800',
      'bg-rose-100 text-rose-800',
      'bg-sky-100 text-sky-800',
      'bg-violet-100 text-violet-800'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn('rounded-full object-cover shrink-0 border border-slate-200/80 shadow-xs', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full shrink-0 flex items-center justify-center select-none shadow-xs border border-white/50',
        sizes[size],
        getBgColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
