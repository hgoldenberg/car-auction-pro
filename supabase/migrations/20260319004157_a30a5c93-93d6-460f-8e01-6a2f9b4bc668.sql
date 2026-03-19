
-- Enums
CREATE TYPE public.vehicle_status AS ENUM ('draft', 'ready', 'published', 'sold', 'archived');
CREATE TYPE public.auction_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'closed', 'awarded', 'cancelled');
CREATE TYPE public.bid_status AS ENUM ('submitted', 'valid', 'rejected', 'leading', 'outbid', 'winning', 'cancelled');
CREATE TYPE public.lead_status AS ENUM ('new', 'interested', 'bid_once', 'active_bidder', 'finalist', 'winner', 'lost', 'follow_up', 'closed');
CREATE TYPE public.publication_status AS ENUM ('pending', 'posted', 'failed');

-- Admin users (profile for admin)
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read own profile" ON public.admin_users FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Vehicles
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  trim text,
  vin text UNIQUE,
  km integer,
  color text,
  transmission text,
  fuel_type text,
  doors integer,
  description text,
  reserve_price numeric(12,2),
  status public.vehicle_status DEFAULT 'draft' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Telegram groups
CREATE TABLE public.telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  chat_id text UNIQUE,
  description text,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read groups" ON public.telegram_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage groups" ON public.telegram_groups FOR ALL TO authenticated USING (true);

-- Auctions
CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  reserve_price numeric(12,2),
  starting_price numeric(12,2) DEFAULT 0,
  current_high_bid numeric(12,2) DEFAULT 0,
  bid_count integer DEFAULT 0,
  status public.auction_status DEFAULT 'draft' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read auctions" ON public.auctions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert auctions" ON public.auctions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update auctions" ON public.auctions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete auctions" ON public.auctions FOR DELETE TO authenticated USING (true);

-- Auction group publications
CREATE TABLE public.auction_group_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.telegram_groups(id) ON DELETE CASCADE NOT NULL,
  status public.publication_status DEFAULT 'pending' NOT NULL,
  message_id text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(auction_id, group_id)
);
ALTER TABLE public.auction_group_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read publications" ON public.auction_group_publications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage publications" ON public.auction_group_publications FOR ALL TO authenticated USING (true);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  telegram_username text,
  city text,
  status public.lead_status DEFAULT 'new' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- Bids
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  status public.bid_status DEFAULT 'submitted' NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read bids" ON public.bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bids" ON public.bids FOR UPDATE TO authenticated USING (true);

-- Lead notes
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read lead notes" ON public.lead_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lead notes" ON public.lead_notes FOR INSERT TO authenticated WITH CHECK (true);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_auctions_vehicle_id ON public.auctions(vehicle_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX idx_bids_lead_id ON public.bids(lead_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_leads_status ON public.leads(status);
