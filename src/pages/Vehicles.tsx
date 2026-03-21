import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Plus, ImageOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileCard, MobileCardRow } from '@/components/MobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import type { VehicleStatus } from '@/lib/types';

function VehicleThumb({ storagePath }: { storagePath?: string | null }) {
  if (!storagePath) {
    return (
      <div className="h-10 w-14 rounded bg-muted flex items-center justify-center shrink-0">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={getVehicleImageUrl(storagePath)}
      alt="Vehículo"
      className="h-10 w-14 rounded object-cover shrink-0"
    />
  );
}

export default function Vehicles() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*, vehicle_images(storage_path, is_main)')
        .order('created_at', { ascending: false });
      return (data || []).map((v: any) => {
        const mainImg = v.vehicle_images?.find((i: any) => i.is_main) || v.vehicle_images?.[0];
        return { ...v, _thumb: mainImg?.storage_path || null };
      });
    },
  });

  return (
    <AppLayout>
      <PageHeader
        title="Vehículos"
        description="Gestión del inventario de vehículos"
        actions={
          <Button onClick={() => navigate('/vehiculos/nuevo')} size={isMobile ? 'sm' : 'default'}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        }
      />

      {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando...</p>}

      {isMobile ? (
        <div className="space-y-3">
          {vehicles?.map((v: any) => (
            <MobileCard key={v.id} onClick={() => navigate(`/vehiculos/${v.id}`)}>
              <div className="flex items-start gap-3 mb-2">
                <VehicleThumb storagePath={v._thumb} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{v.make} {v.model} {v.trim}</p>
                      <p className="text-xs text-muted-foreground">{v.year} · {v.color}</p>
                    </div>
                    <StatusBadge status={v.status as VehicleStatus} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <MobileCardRow label="KM">{v.km ? `${v.km.toLocaleString('es-AR')} km` : '-'}</MobileCardRow>
              </div>
            </MobileCard>
          ))}
        </div>
      ) : (
        <div className="section-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.map((v: any) => (
                <TableRow
                  key={v.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                  onClick={() => navigate(`/vehiculos/${v.id}`)}
                >
                  <TableCell><VehicleThumb storagePath={v._thumb} /></TableCell>
                  <TableCell className="font-medium">{v.make} {v.model} {v.trim}</TableCell>
                  <TableCell className="tabular-nums">{v.year}</TableCell>
                  <TableCell className="tabular-nums">{v.km ? `${v.km.toLocaleString('es-AR')} km` : '-'}</TableCell>
                  <TableCell>{v.color || '-'}</TableCell>
                  <TableCell><StatusBadge status={v.status as VehicleStatus} /></TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
