import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  className?: string;
}

export function KPICard({ title, value, icon, description, className }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-3.5 shadow-card transition-shadow hover:shadow-elevated sm:p-5',
      className
    )}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider sm:text-[11px]">{title}</p>
        <div className="text-muted-foreground/60">{icon}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {description && <p className="mt-1 text-[11px] text-muted-foreground sm:mt-1.5 sm:text-xs">{description}</p>}
    </div>
  );
}