import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { timeAgo } from '@/lib/formatters';
import { ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/types';
import { Activity, Gavel, DollarSign, Users, Car } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const entityIcons: Record<string, typeof Activity> = {
  auction: Gavel,
  bid: DollarSign,
  lead: Users,
  vehicle: Car,
};

export default function ActivityLog() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');

  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const filtered = activity?.filter((entry) => {
    if (entityFilter !== 'all' && entry.entity_type !== entityFilter) return false;
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    if (dateFrom && new Date(entry.created_at) < new Date(dateFrom)) return false;
    return true;
  });

  // Unique actions from data
  const uniqueActions = [...new Set(activity?.map((e) => e.action) || [])];

  return (
    <AppLayout>
      <PageHeader title="Actividad" description="Historial de acciones del sistema" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(ENTITY_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{ACTIVITY_ACTIONS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[160px] h-9 text-sm"
        />
      </div>

      <div className="rounded-lg border bg-card shadow-card">
        <div className="divide-y">
          {isLoading && <p className="p-6 text-center text-muted-foreground">Cargando...</p>}
          {filtered?.map((entry) => {
            const Icon = entityIcons[entry.entity_type] || Activity;
            return (
              <div key={entry.id} className="p-3 flex items-start gap-3 sm:p-4">
                <div className="mt-0.5 h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(entry.created_at)}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{ENTITY_TYPES[entry.entity_type] || entry.entity_type}</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{ACTIVITY_ACTIONS[entry.action] || entry.action}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered?.length === 0 && !isLoading && (
            <p className="p-6 text-center text-muted-foreground">Sin resultados</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
