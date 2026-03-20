import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { VehicleStatus } from '@/lib/types';
import { VEHICLE_STATUS_LABELS } from '@/lib/types';

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear(), trim: '', vin: '',
    km: 0, color: '', transmission: '', fuel_type: '', doors: 4,
    description: '', reserve_price: 0, status: 'draft' as VehicleStatus,
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('vehicles').select('*').eq('id', id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (vehicle) {
      setForm({
        make: vehicle.make, model: vehicle.model, year: vehicle.year,
        trim: vehicle.trim || '', vin: vehicle.vin || '',
        km: vehicle.km || 0, color: vehicle.color || '',
        transmission: vehicle.transmission || '', fuel_type: vehicle.fuel_type || '',
        doors: vehicle.doors || 4, description: vehicle.description || '',
        reserve_price: vehicle.reserve_price || 0, status: vehicle.status,
      });
    }
  }, [vehicle]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase.from('vehicles').update(form).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(isEdit ? 'Vehículo actualizado' : 'Vehículo creado');
      navigate('/vehiculos');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <PageHeader
        title={isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
        actions={<Button variant="outline" size="sm" onClick={() => navigate('/vehiculos')}>Cancelar</Button>}
      />
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="max-w-2xl space-y-5 rounded-lg border bg-card p-4 shadow-card sm:p-6 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Input value={form.make} onChange={e => handleChange('make', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input value={form.model} onChange={e => handleChange('model', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Año</Label>
            <Input type="number" value={form.year} onChange={e => handleChange('year', +e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Versión</Label>
            <Input value={form.trim} onChange={e => handleChange('trim', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>VIN</Label>
            <Input value={form.vin} onChange={e => handleChange('vin', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kilómetros</Label>
            <Input type="number" value={form.km} onChange={e => handleChange('km', +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input value={form.color} onChange={e => handleChange('color', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Transmisión</Label>
            <Input value={form.transmission} onChange={e => handleChange('transmission', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Combustible</Label>
            <Input value={form.fuel_type} onChange={e => handleChange('fuel_type', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Puertas</Label>
            <Input type="number" value={form.doors} onChange={e => handleChange('doors', +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Precio reserva</Label>
            <Input type="number" value={form.reserve_price} onChange={e => handleChange('reserve_price', +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} />
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear vehículo')}
        </Button>
      </form>
    </AppLayout>
  );
}
