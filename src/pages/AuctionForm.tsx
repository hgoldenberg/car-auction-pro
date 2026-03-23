import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AUCTION_STATUS_LABELS } from '@/lib/types';
import type { AuctionStatus } from '@/lib/types';
import { CurrencyInput } from '@/components/CurrencyInput';

export default function AuctionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    vehicle_id: '', title: '', start_date: '', end_date: '',
    starting_price: '' as number | '', status: 'draft' as AuctionStatus,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, make, model, year, trim, status');
      return data || [];
    },
  });

  const { data: auction } = useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('auctions').select('*').eq('id', id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (auction) {
      setForm({
        vehicle_id: auction.vehicle_id, title: auction.title,
        start_date: auction.start_date?.slice(0, 16) || '',
        end_date: auction.end_date?.slice(0, 16) || '',
        starting_price: auction.starting_price || '',
        status: auction.status,
      });
    }
  }, [auction]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        starting_price: form.starting_price === '' ? 0 : form.starting_price,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (isEdit) {
        const { error } = await supabase.from('auctions').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('auctions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success(isEdit ? 'Subasta actualizada' : 'Subasta creada');
      navigate('/subastas');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <PageHeader
        title={isEdit ? 'Editar subasta' : 'Nueva subasta'}
        actions={<Button variant="outline" size="sm" onClick={() => navigate('/subastas')}>Cancelar</Button>}
      />
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="max-w-2xl space-y-5 rounded-lg border bg-card p-4 shadow-card sm:p-6 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Vehículo</Label>
            <Select value={form.vehicle_id} onValueChange={v => handleChange('vehicle_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
              <SelectContent>
                {vehicles
                  ?.filter(v => ['draft', 'ready', 'published'].includes(v.status) || v.id === form.vehicle_id)
                  .map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.make} {v.model} {v.year} {v.trim && ` ${v.trim}`}
                    {v.status === 'draft' ? ' (Borrador)' : v.status === 'sold' ? ' (Vendido)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Solo vehículos en estado Borrador, Listo o Publicado.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={e => handleChange('title', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Inicio</Label>
            <Input type="datetime-local" value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cierre</Label>
            <Input type="datetime-local" value={form.end_date} onChange={e => handleChange('end_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Precio inicial</Label>
            <CurrencyInput value={form.starting_price} onChange={v => handleChange('starting_price', v)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AUCTION_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear subasta')}
        </Button>
      </form>
    </AppLayout>
  );
}
