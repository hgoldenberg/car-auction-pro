
-- Drop any existing permissive policies on vehicle-images
DROP POLICY IF EXISTS "Anyone can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete vehicle images" ON storage.objects;

-- Public read (for gallery)
CREATE POLICY "Public can view vehicle images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vehicle-images');

-- Admin-only writes
CREATE POLICY "Admins can upload vehicle images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update vehicle images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'vehicle-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete vehicle images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-images' AND public.is_admin(auth.uid()));
