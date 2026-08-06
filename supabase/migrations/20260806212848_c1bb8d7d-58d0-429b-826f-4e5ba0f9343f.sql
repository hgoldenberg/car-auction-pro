-- 1. Fix anomalous bid amounts before anything else
UPDATE public.bids b
SET amount = sub.new_amount
FROM (
  SELECT b2.id,
         GREATEST(a.starting_price * 1.08, COALESCE(a.reserve_price, 0) * 1.12) AS new_amount
  FROM public.bids b2
  JOIN public.auctions a ON a.id = b2.auction_id
  WHERE b2.amount > 100000000
) sub
WHERE b.id = sub.id;

-- round to nearest 50.000
UPDATE public.bids SET amount = round(amount / 50000.0) * 50000 WHERE amount % 50000 <> 0;

-- 2. Anonymize leads and propagate to activity_log / lead_notes
DO $$
DECLARE
  r RECORD;
  n INT := 0;
  alias TEXT;
BEGIN
  FOR r IN SELECT id, full_name, telegram_username, email, phone FROM public.leads ORDER BY created_at, id LOOP
    n := n + 1;
    alias := 'Lead Demo ' || lpad(n::text, 2, '0');

    IF r.full_name IS NOT NULL AND length(trim(r.full_name)) > 1 THEN
      UPDATE public.activity_log SET description = replace(description, r.full_name, alias) WHERE description ILIKE '%' || r.full_name || '%';
      UPDATE public.lead_notes SET content = replace(content, r.full_name, alias) WHERE content ILIKE '%' || r.full_name || '%';
    END IF;
    IF r.telegram_username IS NOT NULL THEN
      UPDATE public.activity_log SET description = replace(description, r.telegram_username, alias) WHERE description ILIKE '%' || r.telegram_username || '%';
      UPDATE public.lead_notes SET content = replace(content, r.telegram_username, alias) WHERE content ILIKE '%' || r.telegram_username || '%';
    END IF;
    IF r.email IS NOT NULL THEN
      UPDATE public.activity_log SET description = replace(description, r.email, 'No disponible') WHERE description ILIKE '%' || r.email || '%';
      UPDATE public.lead_notes SET content = replace(content, r.email, 'No disponible') WHERE content ILIKE '%' || r.email || '%';
    END IF;
    IF r.phone IS NOT NULL THEN
      UPDATE public.activity_log SET description = replace(description, r.phone, 'No disponible') WHERE description ILIKE '%' || r.phone || '%';
      UPDATE public.lead_notes SET content = replace(content, r.phone, 'No disponible') WHERE content ILIKE '%' || r.phone || '%';
    END IF;

    UPDATE public.leads
    SET full_name = alias,
        phone = NULL,
        email = NULL,
        telegram_username = NULL
    WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Recompute derived counters
UPDATE public.auctions a
SET bid_count = COALESCE(s.cnt, 0),
    current_high_bid = COALESCE(s.maxamt, 0),
    updated_at = now()
FROM (
  SELECT auc.id, count(b.id) AS cnt, max(b.amount) FILTER (WHERE b.status <> 'rejected' AND b.status <> 'cancelled') AS maxamt
  FROM public.auctions auc LEFT JOIN public.bids b ON b.auction_id = auc.id
  GROUP BY auc.id
) s
WHERE a.id = s.id;

UPDATE public.leads l
SET latest_bid_amount = s.maxamt
FROM (SELECT lead_id, max(amount) AS maxamt FROM public.bids GROUP BY lead_id) s
WHERE l.id = s.lead_id;