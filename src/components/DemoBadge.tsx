import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoBadgeProps {
  className?: string;
  variant?: 'default' | 'dark';
}

/**
 * Etiqueta sobria y permanente que aclara que la app es una demo
 * con datos ficticios. Debe estar visible en todas las pantallas.
 */
export function DemoBadge({ className, variant = 'default' }: DemoBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        variant === 'dark'
          ? 'border-white/15 bg-white/10 text-white/70'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>Demo funcional · datos 100% ficticios</span>
    </div>
  );
}
