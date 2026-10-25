import { type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-meta font-medium text-ink-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-9 rounded-md border border-line-strong bg-surface px-3 text-body text-ink',
          'placeholder:text-ink-4 transition-colors duration-150',
          'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent-ring',
          error && 'border-state-cancelled focus:border-state-cancelled focus:ring-[#e3c4bf]',
          className
        )}
        {...props}
      />
      {error && <span className="text-meta text-state-cancelled">{error}</span>}
    </div>
  );
}
