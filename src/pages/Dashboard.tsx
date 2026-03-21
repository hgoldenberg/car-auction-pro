import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, timeAgo, timeRemaining } from '@/lib/formatters';
import { Gavel, DollarSign, Users, Clock, Activity } from 'lucide-react';
import type { AuctionStatus } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

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

      <div className="grid grid-cols-2 gap-3 mb-7 sm:gap-4 lg:grid-cols-4 lg:mb-8">
        <KPICard title="Activas" value={activeAuctions.length} icon={<Gavel className="h-4 w-4" />} />
        <KPICard title="Cerradas" value={closedAuctions.length} icon={<Clock className="h-4 w-4" />} />
        <KPICard title="Ofertas" value={bids || 0} icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Leads" value={pendingLeads.length} icon={<Users className="h-4 w-4" />} description="Pendientes de gestión" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Próximos cierres */}
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Próximos cierres
            </h2>
          </div>
          <div className="divide-y">
            {closingAuctions.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">Sin subastas próximas a cerrar</p>
            )}
            {closingAuctions.map((auction) => {
              const vehicle = (auction as any).vehicles;
              return (
                <div
                  key={auction.id}
                  className="px-4 py-3.5 flex items-center justify-between gap-3 sm:px-5 hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/subastas/${auction.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {vehicle?.make} {vehicle?.model} {vehicle?.year}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      Líder: {formatCurrency(auction.current_high_bid)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-sm font-bold tabular-nums text-primary">
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
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Actividad reciente
            </h2>
          </div>
          <div className="divide-y">
            {activity?.map((entry) => (
              <div key={entry.id} className="px-4 py-3.5 flex items-start gap-3 sm:px-5">
                <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center mt-0.5 shrink-0">
                  <Activity className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{entry.description}</p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-1">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}