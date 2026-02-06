INSERT INTO public.app_config (key, value, description)
SELECT 'late_tolerance_minutes', '15'::jsonb, 'Minutes after check-in start considered late'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_config WHERE key = 'late_tolerance_minutes'
);
