import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDateTime, timeRemaining } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardRow } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AuctionStatus } from '@/lib/types';

export default function Auctions() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('*, vehicles(make, model, year, trim)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AppLayout>
      <PageHeader
        title="Subastas"
        description="Gestión de subastas de vehículos"
        actions={
          <Button onClick={() => navigate('/subastas/nueva')} size={isMobile ? 'sm' : 'default'}>
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        }
      />

      {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}

      {isMobile ? (
        <div className="space-y-3">
          {auctions?.map((a) => {
            const v = (a as any).vehicles;
            return (
              <MobileCard key={a.id} onClick={() => navigate(`/subastas/${a.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-sm">{v?.make} {v?.model} {v?.year}</p>
                  <StatusBadge status={a.status as AuctionStatus} />
                </div>
                <div className="space-y-1.5">
                  <MobileCardRow label="Oferta líder">{formatCurrency(a.current_high_bid)}</MobileCardRow>
                  <MobileCardRow label="Ofertas">{a.bid_count || '-'}</MobileCardRow>
                  {a.status === 'active' && (
                    <MobileCardRow label="Restante">
                      <span className="text-primary font-medium">{timeRemaining(a.end_date)}</span>
                    </MobileCardRow>
                  )}
                </div>
              </MobileCard>
            );
          })}
        </div>
      ) : (
        <div className="section-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Oferta líder</TableHead>
                <TableHead className="text-center">Ofertas</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions?.map((a) => {
                const v = (a as any).vehicles;
                return (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                    onClick={() => navigate(`/subastas/${a.id}`)}
                  >
                    <TableCell className="font-medium">{v?.make} {v?.model} {v?.year}</TableCell>
                    <TableCell><StatusBadge status={a.status as AuctionStatus} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(a.current_high_bid)}</TableCell>
                    <TableCell className="text-center tabular-nums">{a.bid_count || '-'}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatDateTime(a.end_date)}</TableCell>
                    <TableCell className="tabular-nums">{a.status === 'active' ? timeRemaining(a.end_date) : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
