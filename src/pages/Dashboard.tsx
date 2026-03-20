import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, timeAgo, timeRemaining } from '@/lib/formatters';
import { Gavel, DollarSign, Users, Clock, Activity } from 'lucide-react';
import type { AuctionStatus } from '@/lib/types';

export default function Dashboard() {
  const { data: auctions } = useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, vehicles(make, model, year, trim)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['bids-count'],
    queryFn: async () => {
      const { count } = await supabase.from('bids').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-summary'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('status');
      return data || [];
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['activity-recent'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const activeAuctions = auctions?.filter(a => a.status === 'active') || [];
  const closedAuctions = auctions?.filter(a => a.status === 'closed' || a.status === 'awarded') || [];
  const pendingLeads = leads?.filter(l => l.status === 'new' || l.status === 'interested') || [];
  const closingAuctions = activeAuctions
    .filter(a => a.end_date)
    .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="Panel de control de subastas" />

      <div className="grid grid-cols-2 gap-3 mb-6 sm:gap-4 lg:grid-cols-4 lg:mb-8">
        <KPICard title="Activas" value={activeAuctions.length} icon={<Gavel className="h-4 w-4" />} />
        <KPICard title="Cerradas" value={closedAuctions.length} icon={<Clock className="h-4 w-4" />} />
        <KPICard title="Ofertas" value={bids || 0} icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Leads" value={pendingLeads.length} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Próximos cierres */}
        <div className="rounded-lg border bg-card shadow-card">
          <div className="p-3 border-b sm:p-4">
            <h2 className="text-sm font-semibold">Próximos cierres</h2>
          </div>
          <div className="divide-y">
            {closingAuctions.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Sin subastas próximas a cerrar</p>
            )}
            {closingAuctions.map((auction) => {
              const vehicle = (auction as any).vehicles;
              return (
                <div key={auction.id} className="p-3 flex items-center justify-between gap-2 sm:p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {vehicle?.make} {vehicle?.model} {vehicle?.year}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Líder: {formatCurrency(auction.current_high_bid)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium tabular-nums text-primary">
                      {timeRemaining(auction.end_date)}
                    </p>
                    <StatusBadge status={auction.status as AuctionStatus} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-lg border bg-card shadow-card">
          <div className="p-3 border-b sm:p-4">
            <h2 className="text-sm font-semibold">Actividad reciente</h2>
          </div>
          <div className="divide-y">
            {activity?.map((entry) => (
              <div key={entry.id} className="p-3 flex items-start gap-3 sm:p-4">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm">{entry.description}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
