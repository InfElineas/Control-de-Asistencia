-- 1. Create "Administración" department if it doesn't exist
INSERT INTO public.departments (name)
SELECT 'Administración'
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments WHERE name = 'Administración'
);

-- 2. Create department_schedules table for check-in time windows
CREATE TABLE public.department_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  checkin_start_time TIME NOT NULL DEFAULT '08:00:00',
  checkin_end_time TIME NOT NULL DEFAULT '09:00:00',
  checkout_start_time TIME DEFAULT '17:00:00',
  checkout_end_time TIME DEFAULT '19:00:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  allow_early_checkin BOOLEAN NOT NULL DEFAULT false,
  allow_late_checkout BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id)
);

-- 3. Enable RLS
ALTER TABLE public.department_schedules ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Anyone can view department schedules"
ON public.department_schedules
FOR SELECT
USING (true);

CREATE POLICY "Managers can manage department schedules"
ON public.department_schedules
FOR ALL
USING (has_role(auth.uid(), 'global_manager'))
WITH CHECK (has_role(auth.uid(), 'global_manager'));

-- 5. Create function to check if user is a global manager
CREATE OR REPLACE FUNCTION public.is_global_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'global_manager'
  )
$$;

-- 6. Create function to validate attendance marking
CREATE OR REPLACE FUNCTION public.validate_attendance_mark(_user_id UUID, _mark_type TEXT)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  department_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_department_id UUID;
  v_is_gm BOOLEAN;
  v_schedule RECORD;
  v_current_time TIME;
  v_timezone TEXT;
BEGIN
  -- Check if user is global manager
  v_is_gm := is_global_manager(_user_id);
  
  IF v_is_gm THEN
    RETURN QUERY SELECT false, 'No autorizado para registrar asistencia o descansos.'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get user's department
  SELECT p.department_id INTO v_department_id
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  IF v_department_id IS NULL THEN
    RETURN QUERY SELECT false, 'Usuario sin departamento asignado.'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get department schedule
  SELECT * INTO v_schedule
  FROM public.department_schedules ds
  WHERE ds.department_id = v_department_id;
  
  -- If no schedule configured, block with explicit error
  IF v_schedule IS NULL THEN
    RETURN QUERY SELECT false, 'Departamento sin horario configurado. Contacte al administrador.'::TEXT, v_department_id;
    RETURN;
  END IF;
  
  -- Get current time in department timezone
  v_current_time := (now() AT TIME ZONE v_schedule.timezone)::TIME;
  
  -- Validate based on mark type
  IF _mark_type = 'IN' THEN
    IF v_current_time < v_schedule.checkin_start_time AND NOT v_schedule.allow_early_checkin THEN
      RETURN QUERY SELECT false, 
        format('Entrada anticipada no permitida. Horario: %s - %s', 
          v_schedule.checkin_start_time::TEXT, v_schedule.checkin_end_time::TEXT)::TEXT, 
        v_department_id;
      RETURN;
    END IF;
    
    IF v_current_time > v_schedule.checkin_end_time THEN
      RETURN QUERY SELECT false, 
        format('Hora de entrada excedida. Horario permitido: %s - %s', 
          v_schedule.checkin_start_time::TEXT, v_schedule.checkin_end_time::TEXT)::TEXT, 
        v_department_id;
      RETURN;
    END IF;
  ELSIF _mark_type = 'OUT' THEN
    IF v_schedule.checkout_start_time IS NOT NULL AND v_current_time < v_schedule.checkout_start_time THEN
      RETURN QUERY SELECT false, 
        format('Salida anticipada no permitida. Horario mínimo: %s', 
          v_schedule.checkout_start_time::TEXT)::TEXT, 
        v_department_id;
      RETURN;
    END IF;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT true, NULL::TEXT, v_department_id;
END;
$$;

-- 7. Migrate existing global managers to Administración department
UPDATE public.profiles
SET department_id = (SELECT id FROM public.departments WHERE name = 'Administración' LIMIT 1)
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'global_manager'
)
AND department_id != (SELECT id FROM public.departments WHERE name = 'Administración' LIMIT 1);

-- 8. Create trigger to auto-assign Administración to new global managers
CREATE OR REPLACE FUNCTION public.enforce_gm_department()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_dept_id UUID;
BEGIN
  IF NEW.role = 'global_manager' THEN
    SELECT id INTO v_admin_dept_id FROM public.departments WHERE name = 'Administración' LIMIT 1;
    
    IF v_admin_dept_id IS NOT NULL THEN
      UPDATE public.profiles
      SET department_id = v_admin_dept_id
      WHERE user_id = NEW.user_id
      AND department_id != v_admin_dept_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_gm_department_trigger
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_gm_department();

-- 9. Add trigger for updated_at on department_schedules
CREATE TRIGGER update_department_schedules_updated_at
BEFORE UPDATE ON public.department_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 10. Insert default schedules for existing departments (except Administración)
INSERT INTO public.department_schedules (department_id, checkin_start_time, checkin_end_time)
SELECT d.id, '07:00:00'::TIME, '09:00:00'::TIME
FROM public.departments d
WHERE d.name != 'Administración'
AND NOT EXISTS (
  SELECT 1 FROM public.department_schedules ds WHERE ds.department_id = d.id
);