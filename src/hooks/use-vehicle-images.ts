import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';

const BUCKET = 'vehicle-images';

export type VehicleImage = {
  id: string;
  vehicle_id: string;
  storage_path: string;
  is_main: boolean;
  display_order: number;
  created_at: string;
};

export function getVehicleImageUrl(storagePath: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function useVehicleImages(vehicleId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['vehicle-images', vehicleId];

  const { data: images = [], isLoading } = useQuery({
    queryKey,
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_images')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('is_main', { ascending: false })
        .order('display_order');
      return (data || []) as VehicleImage[];
    },
  });

  const mainImage = images.find((i) => i.is_main) || images[0];

  const uploadMutation = useMutation({
    mutationFn: async ({ file, isMain }: { file: File; isMain: boolean }) => {
      if (!vehicleId) throw new Error('Vehicle ID required');
      const ext = file.name.split('.').pop();
      const path = `${vehicleId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) throw uploadErr;

      // If setting as main, unset others
      if (isMain) {
        await supabase
          .from('vehicle_images')
          .update({ is_main: false })
          .eq('vehicle_id', vehicleId);
      }

      const { error: dbErr } = await supabase.from('vehicle_images').insert({
        vehicle_id: vehicleId,
        storage_path: path,
        is_main: isMain,
        display_order: images.length,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Imagen subida');
    },
    onError: () => toast.error('Error al subir imagen'),
  });

  const setMainMutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!vehicleId) return;
      await supabase
        .from('vehicle_images')
        .update({ is_main: false })
        .eq('vehicle_id', vehicleId);
      const { error } = await supabase
        .from('vehicle_images')
        .update({ is_main: true })
        .eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Foto principal actualizada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: VehicleImage) => {
      await supabase.storage.from(BUCKET).remove([image.storage_path]);
      const { error } = await supabase.from('vehicle_images').delete().eq('id', image.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Imagen eliminada');
    },
  });

  return {
    images,
    mainImage,
    isLoading,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    setMain: setMainMutation.mutate,
    deleteImage: deleteMutation.mutate,
  };
}

/** Lightweight hook just for main image URL by vehicle ID */
export function useVehicleMainImage(vehicleId?: string) {
  const { data } = useQuery({
    queryKey: ['vehicle-main-image', vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data: img } = await supabase
        .from('vehicle_images')
        .select('storage_path')
        .eq('vehicle_id', vehicleId!)
        .eq('is_main', true)
        .maybeSingle();
      if (img) return getVehicleImageUrl(img.storage_path);
      // Fallback: first image
      const { data: first } = await supabase
        .from('vehicle_images')
        .select('storage_path')
        .eq('vehicle_id', vehicleId!)
        .order('display_order')
        .limit(1)
        .maybeSingle();
      return first ? getVehicleImageUrl(first.storage_path) : null;
    },
  });
  return data;
}
