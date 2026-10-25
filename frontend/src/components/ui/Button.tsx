import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-md whitespace-nowrap',
        'transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover',
        variant === 'secondary' && 'bg-surface text-ink-2 border border-line-strong hover:bg-[#f6f6f7] hover:text-ink',
        variant === 'danger' && 'bg-surface text-state-cancelled border border-line-strong hover:bg-[#fbedeb] hover:border-[#e3c4bf]',
        variant === 'ghost' && 'text-ink-2 hover:bg-[#f2f2f4] hover:text-ink',
        size === 'sm' && 'h-8 px-2.5 text-meta',
        size === 'md' && 'h-9 px-3.5 text-body',
        size === 'lg' && 'h-10 px-4 text-body',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
