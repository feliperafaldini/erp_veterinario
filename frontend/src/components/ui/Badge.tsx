import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-[#f2f2f4] text-ink-2',
  success: 'bg-accent-soft text-state-done',
  warning: 'bg-[#fdf3e3] text-state-progress',
  danger: 'bg-[#fbedeb] text-state-cancelled',
  info: 'bg-[#eef1f5] text-ink-2',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium leading-4',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
