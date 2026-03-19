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
import type { AuctionStatus } from '@/lib/types';

export default function Auctions() {
  const navigate = useNavigate();

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
          <Button onClick={() => navigate('/subastas/nueva')}>
            <Plus className="h-4 w-4 mr-1" /> Nueva subasta
          </Button>
        }
      />
      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehículo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Oferta líder</TableHead>
              <TableHead className="text-right">Precio reserva</TableHead>
              <TableHead className="text-center">Ofertas</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead>Restante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
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
                  <TableCell className="text-right tabular-nums">{formatCurrency(a.reserve_price)}</TableCell>
                  <TableCell className="text-center tabular-nums">{a.bid_count}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{formatDateTime(a.end_date)}</TableCell>
                  <TableCell className="tabular-nums">{a.status === 'active' ? timeRemaining(a.end_date) : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
