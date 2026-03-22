
-- Replace overly permissive anon policy on auctions
DROP POLICY "Anon can read auctions" ON public.auctions;
CREATE POLICY "Anon can read public auctions"
ON public.auctions FOR SELECT
TO anon
USING (status IN ('active', 'closed', 'awarded'));

-- Replace overly permissive anon policy on vehicles
DROP POLICY "Anon can read vehicles" ON public.vehicles;
CREATE POLICY "Anon can read vehicles with public auction"
ON public.vehicles FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.auctions
    WHERE auctions.vehicle_id = vehicles.id
      AND auctions.status IN ('active', 'closed', 'awarded')
  )
);
