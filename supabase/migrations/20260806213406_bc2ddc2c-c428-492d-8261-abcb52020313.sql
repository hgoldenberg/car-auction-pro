-- Public read-only demo access for anonymous visitors (all data is fictitious)

-- vehicles / auctions previously had column-level grants for anon: normalize to full SELECT
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.auctions TO anon;
GRANT SELECT ON public.vehicle_images TO anon;
GRANT SELECT ON public.bids TO anon;
GRANT SELECT ON public.leads TO anon;
GRANT SELECT ON public.lead_notes TO anon;
GRANT SELECT ON public.activity_log TO anon;
GRANT SELECT ON public.telegram_groups TO anon;
GRANT SELECT ON public.auction_group_publications TO anon;
GRANT SELECT ON public.gallery_views TO anon;

DROP POLICY IF EXISTS "Anon can read public auctions" ON public.auctions;
DROP POLICY IF EXISTS "Anon can read vehicles with public auction" ON public.vehicles;
DROP POLICY IF EXISTS "Anon can read vehicle images" ON public.vehicle_images;

CREATE POLICY "Demo publica: lectura anonima" ON public.auctions FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.vehicles FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.vehicle_images FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.bids FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.leads FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.lead_notes FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.activity_log FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.telegram_groups FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.auction_group_publications FOR SELECT TO anon USING (true);
CREATE POLICY "Demo publica: lectura anonima" ON public.gallery_views FOR SELECT TO anon USING (true);