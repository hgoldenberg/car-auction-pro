
-- Add columns to telegram_groups
ALTER TABLE public.telegram_groups ADD COLUMN IF NOT EXISTS is_real_group boolean NOT NULL DEFAULT false;
ALTER TABLE public.telegram_groups ADD COLUMN IF NOT EXISTS notes text;

-- Add columns to auction_group_publications
ALTER TABLE public.auction_group_publications ADD COLUMN IF NOT EXISTS external_message_id text;
ALTER TABLE public.auction_group_publications ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.auction_group_publications ADD COLUMN IF NOT EXISTS publication_type text NOT NULL DEFAULT 'demo';
