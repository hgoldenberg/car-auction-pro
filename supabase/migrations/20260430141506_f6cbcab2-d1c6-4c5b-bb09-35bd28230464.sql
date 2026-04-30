-- Restore execute permission on is_admin for authenticated/anon so RLS policies can evaluate it
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;