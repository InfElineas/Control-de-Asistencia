-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix permissive RLS policy on audit_log - restrict to authenticated users inserting their own logs
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;

CREATE POLICY "Authenticated users can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'global_manager'));