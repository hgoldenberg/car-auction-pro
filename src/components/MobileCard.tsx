import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function MobileCard({ onClick, children, className }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card p-4 shadow-card active:scale-[0.98] transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-elevated',
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileCardRow({ label, children, className }: MobileCardRowProps) {
  return (
    <div className={cn('flex items-center justify-between text-sm py-0.5', className)}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}