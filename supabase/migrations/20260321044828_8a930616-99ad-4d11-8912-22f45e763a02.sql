
-- Singleton table for polling offset
CREATE TABLE public.telegram_bot_state (
  id integer PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table
CREATE POLICY "Service role only" ON public.telegram_bot_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Chat context: maps chat_id to current auction
CREATE TABLE public.telegram_chat_context (
  chat_id bigint PRIMARY KEY,
  auction_id uuid NOT NULL,
  telegram_user_id bigint,
  telegram_username text,
  telegram_first_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_chat_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.telegram_chat_context
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
