-- Allow anonymous users to read auctions (needed for public gallery)
CREATE POLICY "Anon can read auctions"
ON public.auctions FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read vehicles (needed for public gallery)
CREATE POLICY "Anon can read vehicles"
ON public.vehicles FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read vehicle images (needed for public gallery)
CREATE POLICY "Anon can read vehicle images"
ON public.vehicle_images FOR SELECT
TO anon
USING (true);