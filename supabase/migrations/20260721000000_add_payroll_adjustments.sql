-- Payroll adjustments: manual and automatic monetary discounts/adjustments for vacations and absences.

ALTER TABLE public.profiles
  ADD COLUMN monthly_salary NUMERIC(12,2);

CREATE TABLE public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('unjustified_absence', 'vacation', 'other')),
  reason TEXT,
  source_type TEXT,
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reverted')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_by UUID REFERENCES auth.users(id),
  reverted_at TIMESTAMPTZ
);

CREATE INDEX idx_payroll_adjustments_user ON public.payroll_adjustments(user_id, created_at DESC);
CREATE INDEX idx_payroll_adjustments_source ON public.payroll_adjustments(source_type, source_id);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global managers manage payroll adjustments"
  ON public.payroll_adjustments FOR ALL
  USING (has_role(auth.uid(), 'global_manager') OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'global_manager') OR has_role(auth.uid(), 'superadmin'));

-- Auto-generate a payroll discount when an absence is marked unjustified (runs as SECURITY DEFINER
-- because department_head, who can review absences, has no direct write access to payroll_adjustments).
-- Auto-reverts the discount if the review is later reclassified as justified.
CREATE OR REPLACE FUNCTION public.handle_absence_review_payroll_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_salary NUMERIC(12,2);
  v_daily_rate NUMERIC(12,2);
BEGIN
  IF NEW.is_justified = false AND (TG_OP = 'INSERT' OR OLD.is_justified IS DISTINCT FROM false) THEN
    SELECT monthly_salary INTO v_monthly_salary FROM public.profiles WHERE user_id = NEW.user_id;

    IF v_monthly_salary IS NOT NULL THEN
      v_daily_rate := round(v_monthly_salary / 30, 2);

      INSERT INTO public.payroll_adjustments (
        user_id, amount, category, reason, source_type, source_id, created_by
      ) VALUES (
        NEW.user_id,
        -v_daily_rate,
        'unjustified_absence',
        'Descuento automático por ausencia no justificada del ' || NEW.date::text,
        'absence_review',
        NEW.id,
        NEW.reviewed_by
      );
    END IF;
  ELSIF NEW.is_justified = true AND TG_OP = 'UPDATE' AND OLD.is_justified IS DISTINCT FROM true THEN
    UPDATE public.payroll_adjustments
    SET status = 'reverted', reverted_by = NEW.reviewed_by, reverted_at = now()
    WHERE source_type = 'absence_review' AND source_id = NEW.id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_absence_review_payroll_impact
AFTER INSERT OR UPDATE OF is_justified ON public.attendance_absence_reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_absence_review_payroll_impact();
