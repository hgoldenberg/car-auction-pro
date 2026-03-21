
-- Vehicle images table
CREATE TABLE public.vehicle_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_main boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage vehicle images"
  ON public.vehicle_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-images', 'vehicle-images', true);

-- Storage RLS: authenticated users can upload/manage
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can update vehicle images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can delete vehicle images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'vehicle-images');
