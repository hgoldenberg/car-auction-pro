UPDATE public.activity_log
SET description = replace(replace(description, '$900.000.000', '$24.650.000'), '$ 900.000.000', '$ 24.650.000')
WHERE description LIKE '%900.000.000%';

UPDATE public.activity_log
SET description = replace(replace(description, '$340.000.000', '$34.000.000'), '$ 340.000.000', '$ 34.000.000')
WHERE description LIKE '%340.000.000%';