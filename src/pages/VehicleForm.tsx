import { useState, useEffect, useRef } from 'react';
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
import { ImagePlus, AlertTriangle, Camera } from 'lucide-react';
import type { VehicleStatus } from '@/lib/types';
import { VEHICLE_STATUS_LABELS } from '@/lib/types';
import { useVehicleImages, getVehicleImageUrl } from '@/hooks/use-vehicle-images';
import { SortableImageGrid } from '@/components/SortableImageGrid';
import { CurrencyInput } from '@/components/CurrencyInput';

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending image for create mode (before vehicle is saved)
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear(), trim: '', vin: '',
    km: '' as number | '', color: '', transmission: '', fuel_type: '', doors: 4 as number | '',
    description: '', status: 'draft' as VehicleStatus,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('vehicles').select('*').eq('id', id).single();
      return data;
    },
    enabled: isEdit,
  });

  const { images, mainImage, upload, isUploading, setMain, deleteImage, reorder } = useVehicleImages(id);

  useEffect(() => {
    if (vehicle) {
      setForm({
        make: vehicle.make, model: vehicle.model, year: vehicle.year,
        trim: vehicle.trim || '', vin: vehicle.vin || '',
        km: vehicle.km || '', color: vehicle.color || '',
        transmission: vehicle.transmission || '', fuel_type: vehicle.fuel_type || '',
        doors: vehicle.doors || 4, description: vehicle.description || '',
        status: vehicle.status,
      });
    }
  }, [vehicle]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        km: form.km === '' ? 0 : form.km,
        doors: form.doors === '' ? 4 : form.doors,
      };
      if (isEdit) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('vehicles').insert(payload).select('id').single();
        if (error) throw error;
        // Upload pending image after vehicle creation
        if (pendingImage && data) {
          const ext = pendingImage.name.split('.').pop() || 'jpg';
          const path = `${data.id}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('vehicle-images').upload(path, pendingImage, {
            contentType: pendingImage.type || 'image/jpeg',
          });
          if (uploadErr) {
            console.error('Image upload error:', uploadErr);
            toast.error('Vehículo creado pero falló la subida de imagen');
          } else {
            const { error: imgErr } = await supabase.from('vehicle_images').insert({
              vehicle_id: data.id,
              storage_path: path,
              is_main: true,
              display_order: 0,
            });
            if (imgErr) {
              console.error('Image record error:', imgErr);
              toast.error('Imagen subida pero falló el registro');
            }
          }
        }
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (isEdit) {
        toast.success('Vehículo actualizado');
        navigate('/vehiculos');
      } else if (data) {
        toast.success(pendingImage ? 'Vehículo creado con foto principal' : 'Vehículo creado');
        navigate(`/vehiculos/${data.id}`);
      }
    },
    onError: (error: any) => {
      const msg = error?.message || '';
      if (msg.includes('violates not-null') || msg.includes('null value')) {
        toast.error('Completá los campos obligatorios.');
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Ya existe un vehículo con estos datos.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        toast.error('Error de conexión. Verificá tu internet y probá nuevamente.');
      } else {
        toast.error('No pudimos guardar el vehículo. Probá nuevamente.');
      }
      console.error('Vehicle save error:', error);
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !id) return;
    const hasMain = !!mainImage;
    Array.from(files).forEach((file, idx) => {
      upload({ file, isMain: !hasMain && idx === 0 });
    });
  };

  const handlePendingImage = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.make.trim()) errors.make = 'La marca es obligatoria';
    if (!form.model.trim()) errors.model = 'El modelo es obligatorio';
    if (!form.year || form.year < 1900 || form.year > new Date().getFullYear() + 2) errors.year = 'Ingresá un año válido';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Completá los campos obligatorios.');
      return false;
    }
    return true;
  };

  const noMainImage = isEdit && !mainImage && !isUploading;

  return (
    <AppLayout>
      <PageHeader
        title={isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
        actions={<Button variant="outline" size="sm" onClick={() => navigate('/vehiculos')}>Cancelar</Button>}
      />

      {/* Warning: no main image */}
      {noMainImage && (
        <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning/10 px-4 py-3 mb-4 text-sm text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>Este vehículo no tiene foto principal. Subí al menos una imagen para poder publicar correctamente una subasta.</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (validate()) mutation.mutate(); }}
        className="max-w-2xl space-y-5 rounded-lg border bg-card p-4 shadow-card sm:p-6 sm:space-y-6">

        {/* Image section - EDIT mode */}
        {isEdit && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> Imágenes del vehículo
            </Label>

            {/* Main image highlight */}
            {mainImage && (
              <div className="relative rounded-lg overflow-hidden border-2 border-primary/30 aspect-video bg-muted">
                <img
                  src={getVehicleImageUrl(mainImage.storage_path)}
                  alt="Foto principal"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                  Foto principal
                </span>
              </div>
            )}

            {/* Sortable grid of images */}
            {images.length > 0 && (
              <SortableImageGrid
                images={images}
                onSetMain={setMain}
                onDelete={deleteImage}
                onReorder={(activeId, overId) => reorder({ activeId, overId })}
              />
            )}

            {/* Upload buttons - mobile friendly */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelect(e.target.files)} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="default" className="flex-1 sm:flex-none sm:size-sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" />
                {isUploading ? 'Subiendo...' : 'Galería'}
              </Button>
              <Button type="button" variant="outline" size="default" className="flex-1 sm:hidden" disabled={isUploading} onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
                input.click();
              }}>
                <Camera className="h-4 w-4 mr-2" />
                Cámara
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Arrastrá las fotos para reordenar. Usá los íconos para cambiar la principal o eliminar.</p>
          </div>
        )}

        {/* Image section - CREATE mode */}
        {!isEdit && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> Foto principal
            </Label>
            {pendingPreview ? (
              <div className="relative rounded-lg overflow-hidden border-2 border-primary/30 aspect-video bg-muted">
                <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                  Foto principal
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2"
                  onClick={() => { setPendingImage(null); setPendingPreview(null); }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div
                className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Tocá para agregar la foto principal</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Podés agregar más fotos después de guardar</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handlePendingImage(e.target.files)}
            />
            {!pendingPreview && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="default" className="flex-1 sm:flex-none" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4 mr-2" /> Galería
                </Button>
                <Button type="button" variant="outline" size="default" className="flex-1 sm:hidden" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.capture = 'environment';
                  input.onchange = (e) => handlePendingImage((e.target as HTMLInputElement).files);
                  input.click();
                }}>
                  <Camera className="h-4 w-4 mr-2" /> Cámara
                </Button>
              </div>
            )}
          </div>
        )}

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
            <CurrencyInput placeholder="Ej: 45000" value={form.km} onChange={v => handleChange('km', v)} />
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
            <Input type="number" placeholder="Ej: 4" value={form.doors} onChange={e => handleChange('doors', e.target.value === '' ? '' : +e.target.value)} />
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
