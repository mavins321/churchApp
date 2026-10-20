import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  ...props
}) => {
  return (
    <div className="relative flex items-center w-full">
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900',
          'placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15',
          'transition-all duration-150',
          className
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
