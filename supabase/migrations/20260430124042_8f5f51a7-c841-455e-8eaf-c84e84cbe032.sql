
-- 1) Helper: is_admin() security definer to avoid RLS recursion on admin_users
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- 2) Lock down admin_users: deny INSERT/UPDATE/DELETE for authenticated (only service_role can manage)
CREATE POLICY "No self-promotion to admin"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No admin updates from clients"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No admin deletes from clients"
ON public.admin_users
FOR DELETE
TO authenticated
USING (false);

-- 3) Replace permissive write/read policies with admin-scoped ones
-- VEHICLES
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;

CREATE POLICY "Admins can read vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Restrict sensitive columns from anon role (column-level grant)
REVOKE SELECT ON public.vehicles FROM anon;
GRANT SELECT (id, make, model, year, trim, color, km, fuel_type, transmission, doors, description, status, created_at, updated_at)
  ON public.vehicles TO anon;

-- VEHICLE_IMAGES
DROP POLICY IF EXISTS "Authenticated users can manage vehicle images" ON public.vehicle_images;
CREATE POLICY "Admins can manage vehicle images" ON public.vehicle_images
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- AUCTIONS
DROP POLICY IF EXISTS "Authenticated users can read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can insert auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can update auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can delete auctions" ON public.auctions;

CREATE POLICY "Admins can read auctions" ON public.auctions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert auctions" ON public.auctions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update auctions" ON public.auctions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete auctions" ON public.auctions
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Restrict reserve_price from anon
REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (id, vehicle_id, title, status, starting_price, current_high_bid, bid_count, start_date, end_date, created_at, updated_at)
  ON public.auctions TO anon;

-- LEADS
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Admins can read leads" ON public.leads
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- BIDS
DROP POLICY IF EXISTS "Authenticated users can read bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can insert bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can update bids" ON public.bids;

CREATE POLICY "Admins can read bids" ON public.bids
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert bids" ON public.bids
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update bids" ON public.bids
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete bids" ON public.bids
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- LEAD_NOTES
DROP POLICY IF EXISTS "Authenticated users can read lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Authenticated users can insert lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Authenticated users can update lead notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Authenticated users can delete lead notes" ON public.lead_notes;

CREATE POLICY "Admins can read lead notes" ON public.lead_notes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert lead notes" ON public.lead_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update lead notes" ON public.lead_notes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete lead notes" ON public.lead_notes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ACTIVITY_LOG
DROP POLICY IF EXISTS "Authenticated users can read activity" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can update activity" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can delete activity" ON public.activity_log;

CREATE POLICY "Admins can read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update activity" ON public.activity_log
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete activity" ON public.activity_log
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- AUCTION_GROUP_PUBLICATIONS
DROP POLICY IF EXISTS "Authenticated users can manage publications" ON public.auction_group_publications;
DROP POLICY IF EXISTS "Authenticated users can read publications" ON public.auction_group_publications;

CREATE POLICY "Admins can manage publications" ON public.auction_group_publications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- TELEGRAM_GROUPS
DROP POLICY IF EXISTS "Authenticated users can manage groups" ON public.telegram_groups;
DROP POLICY IF EXISTS "Authenticated users can read groups" ON public.telegram_groups;

CREATE POLICY "Admins can manage groups" ON public.telegram_groups
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- GALLERY_VIEWS
DROP POLICY IF EXISTS "Authenticated users can read gallery views" ON public.gallery_views;
CREATE POLICY "Admins can read gallery views" ON public.gallery_views
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
-- Keep "Anyone can insert gallery views" (intentional anon view tracking)
