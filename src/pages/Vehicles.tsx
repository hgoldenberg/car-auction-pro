import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VehicleStatus } from '@/lib/types';

export default function Vehicles() {
  const navigate = useNavigate();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AppLayout>
      <PageHeader
        title="Vehículos"
        description="Gestión del inventario de vehículos"
        actions={
          <Button onClick={() => navigate('/vehiculos/nuevo')}>
            <Plus className="h-4 w-4 mr-1" /> Agregar vehículo
          </Button>
        }
      />

      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehículo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>KM</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Precio reserva</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
            {vehicles?.map((v) => (
              <TableRow
                key={v.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                onClick={() => navigate(`/vehiculos/${v.id}`)}
              >
                <TableCell className="font-medium">{v.make} {v.model} {v.trim}</TableCell>
                <TableCell className="tabular-nums">{v.year}</TableCell>
                <TableCell className="tabular-nums">{v.km?.toLocaleString('es-AR')} km</TableCell>
                <TableCell>{v.color}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(v.reserve_price)}</TableCell>
                <TableCell><StatusBadge status={v.status as VehicleStatus} /></TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{formatDate(v.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
