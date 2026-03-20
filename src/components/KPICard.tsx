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
    <div className={cn('rounded-lg border bg-card p-3 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-2xl">{value}</p>
      {description && <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{description}</p>}
    </div>
  );
}
