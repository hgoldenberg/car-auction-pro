
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS latest_bid_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();
