import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { KPICard } from '@/components/KPICard';
import { formatCurrency, formatDateTime, timeRemaining, timeAgo } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardRow } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { DollarSign, Clock, Users, Send, Edit } from 'lucide-react';
import type { AuctionStatus, BidStatus, PublicationStatus } from '@/lib/types';

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: auction } = useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, vehicles(make, model, year, trim, color, km, status)')
        .eq('id', id!)
        .single();
      return data;
    },
  });

  const { data: bids } = useQuery({
    queryKey: ['auction-bids', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bids')
        .select('*, leads(full_name, telegram_username)')
        .eq('auction_id', id!)
        .order('amount', { ascending: false });
      return data || [];
    },
  });

  const { data: publications } = useQuery({
    queryKey: ['auction-publications', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('auction_group_publications')
        .select('*, telegram_groups(name)')
        .eq('auction_id', id!);
      return data || [];
    },
  });

  if (!auction) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  const vehicle = (auction as any).vehicles;
  const uniqueBidders = new Set(bids?.map(b => b.lead_id)).size;

  return (
    <AppLayout>
      <PageHeader
        title={auction.title}
        description={`${vehicle?.make} ${vehicle?.model} ${vehicle?.year} · ${vehicle?.color} · ${vehicle?.km?.toLocaleString('es-AR')} km`}
        actions={
          <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => navigate(`/subastas/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-4 sm:gap-4 md:grid-cols-4 md:mb-6">
        <KPICard title="Estado" value={auction.status.toUpperCase()} icon={<StatusBadge status={auction.status as AuctionStatus} />} />
        <KPICard title="Oferta líder" value={formatCurrency(auction.current_high_bid)} icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Ofertas" value={auction.bid_count || 0} icon={<Users className="h-4 w-4" />} description={`${uniqueBidders} únicos`} />
        <KPICard title="Cierre" value={timeRemaining(auction.end_date)} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Bids */}
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="p-3 border-b sm:p-4">
            <h2 className="text-sm font-semibold">Historial de ofertas</h2>
          </div>
          {isMobile ? (
            <div className="divide-y">
              {bids?.map((bid) => {
                const lead = (bid as any).leads;
                return (
                  <div key={bid.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lead?.telegram_username}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(bid.amount)}</p>
                      <StatusBadge status={bid.status as BidStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ofertante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids?.map((bid) => {
                  const lead = (bid as any).leads;
                  return (
                    <TableRow key={bid.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{lead?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{lead?.telegram_username}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatCurrency(bid.amount)}</TableCell>
                      <TableCell><StatusBadge status={bid.status as BidStatus} /></TableCell>
                      <TableCell className="tabular-nums text-muted-foreground text-sm">{timeAgo(bid.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Publications */}
        <div className="rounded-lg border bg-card shadow-card">
          <div className="p-3 border-b sm:p-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4" /> Publicaciones
            </h2>
          </div>
          <div className="divide-y">
            {publications?.map((pub) => {
              const group = (pub as any).telegram_groups;
              return (
                <div key={pub.id} className="p-3 flex items-center justify-between sm:p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{group?.name}</p>
                    <p className="text-xs text-muted-foreground">{pub.published_at ? formatDateTime(pub.published_at) : 'Sin publicar'}</p>
                  </div>
                  <StatusBadge status={pub.status as PublicationStatus} />
                </div>
              );
            })}
            {publications?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Sin publicaciones</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
