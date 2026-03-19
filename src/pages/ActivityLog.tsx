import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { timeAgo } from '@/lib/formatters';
import { Activity, Gavel, DollarSign, Users, Car } from 'lucide-react';

const entityIcons: Record<string, typeof Activity> = {
  auction: Gavel,
  bid: DollarSign,
  lead: Users,
  vehicle: Car,
};

export default function ActivityLog() {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  return (
    <AppLayout>
      <PageHeader title="Registro de actividad" description="Historial de acciones del sistema" />

      <div className="rounded-lg border bg-card shadow-card">
        <div className="divide-y">
          {isLoading && <p className="p-6 text-center text-muted-foreground">Cargando...</p>}
          {activity?.map((entry) => {
            const Icon = entityIcons[entry.entity_type] || Activity;
            return (
              <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-accent/30 transition-colors duration-150">
                <div className="mt-0.5 h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(entry.created_at)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{entry.action.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
