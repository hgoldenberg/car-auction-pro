import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function KPICard({ title, value, icon, description, className, children }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-3 shadow-card transition-shadow hover:shadow-elevated sm:p-4 min-w-0 overflow-hidden',
      className
    )}>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider sm:text-[11px] truncate">{title}</p>
        <div className="text-muted-foreground/60 shrink-0 ml-1">{icon}</div>
      </div>
      <p className="text-lg font-bold tracking-tight tabular-nums sm:text-xl truncate leading-tight">{value}</p>
      {description && <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-[11px] truncate">{description}</p>}
      {children}
    </div>
  );
}
