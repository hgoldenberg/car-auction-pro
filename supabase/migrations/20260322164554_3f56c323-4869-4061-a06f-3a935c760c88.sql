
CREATE TABLE public.gallery_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);

CREATE INDEX idx_gallery_views_auction_id ON public.gallery_views(auction_id);

ALTER TABLE public.gallery_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public gallery, no auth required)
CREATE POLICY "Anyone can insert gallery views"
  ON public.gallery_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read view counts
CREATE POLICY "Authenticated users can read gallery views"
  ON public.gallery_views FOR SELECT
  TO authenticated
  USING (true);
