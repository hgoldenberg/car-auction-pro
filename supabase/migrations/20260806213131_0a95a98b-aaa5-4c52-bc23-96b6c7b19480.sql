UPDATE public.activity_log SET description = 'Lead demo creado automáticamente desde Telegram'
WHERE description ILIKE 'Lead "%" creado automáticamente desde Telegram';

UPDATE public.activity_log SET description = replace(description, 'Usuario @Lead Demo', 'Usuario Lead Demo')
WHERE description LIKE 'Usuario @Lead Demo%';

UPDATE public.lead_notes SET content = replace(content, '@Lead Demo', 'Lead Demo') WHERE content LIKE '%@Lead Demo%';