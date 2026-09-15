DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.leads;
DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.telegram_groups;
DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.auction_group_publications;
DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.gallery_views;

REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.telegram_groups FROM anon;
REVOKE ALL ON public.auction_group_publications FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.gallery_views FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_group_publications TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.telegram_groups TO service_role;
GRANT ALL ON public.auction_group_publications TO service_role;
GRANT ALL ON public.gallery_views TO service_role;