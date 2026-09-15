DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.activity_log;
DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.bids;
DROP POLICY IF EXISTS "Demo publica: lectura anonima" ON public.lead_notes;

REVOKE ALL ON public.activity_log FROM anon;
REVOKE ALL ON public.bids FROM anon;
REVOKE ALL ON public.lead_notes FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
GRANT ALL ON public.bids TO service_role;
GRANT ALL ON public.lead_notes TO service_role;