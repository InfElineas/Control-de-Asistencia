-- Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('employee', 'department_head', 'global_manager');

-- Create departments table (fixed departments)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert fixed departments
INSERT INTO public.departments (name) VALUES 
  ('Picker and Packer'),
  ('Expedición'),
  ('Transporte'),
  ('Inventario'),
  ('Estibadores');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  UNIQUE(user_id, role)
);

-- Create geofence_config table
CREATE TABLE public.geofence_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_lat DOUBLE PRECISION NOT NULL DEFAULT 40.416775,
  center_lng DOUBLE PRECISION NOT NULL DEFAULT -3.703790,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  accuracy_threshold INTEGER NOT NULL DEFAULT 50,
  block_on_poor_accuracy BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default geofence config
INSERT INTO public.geofence_config (center_lat, center_lng, radius_meters, accuracy_threshold) 
VALUES (40.416775, -3.703790, 100, 50);

-- Create work_calendar table
CREATE TABLE public.work_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_workday BOOLEAN NOT NULL DEFAULT true,
  late_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, date)
);

-- Create user_rest_schedule table
CREATE TABLE public.user_rest_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{}',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create attendance_marks table
CREATE TABLE public.attendance_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mark_type TEXT NOT NULL CHECK (mark_type IN ('IN', 'OUT')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  distance_to_center DOUBLE PRECISION,
  inside_geofence BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create app_config table for general settings
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default config
INSERT INTO public.app_config (key, value, description) VALUES
  ('include_heads_in_global_reports', 'false', 'Whether to include department heads in global reports'),
  ('default_work_start_time', '"09:00"', 'Default work start time'),
  ('default_work_end_time', '"18:00"', 'Default work end time');

-- Create indexes for performance
CREATE INDEX idx_attendance_marks_user_timestamp ON public.attendance_marks(user_id, timestamp);
CREATE INDEX idx_work_calendar_dept_date ON public.work_calendar(department_id, date);
CREATE INDEX idx_user_rest_schedule_user_effective ON public.user_rest_schedule(user_id, effective_from);
CREATE INDEX idx_profiles_department ON public.profiles(department_id);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rest_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is department head of a specific department
CREATE OR REPLACE FUNCTION public.is_head_of_department(_user_id UUID, _dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id 
    AND ur.role = 'department_head'
    AND p.department_id = _dept_id
  )
$$;

-- Departments: Everyone can read
CREATE POLICY "Anyone can view departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

-- Profiles: Users can read their own, heads can read dept, managers can read all employees
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'global_manager') OR
    (public.has_role(auth.uid(), 'department_head') AND 
     department_id = public.get_user_department(auth.uid()))
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User Roles: Only managers can manage, users can view own
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'global_manager')
  );

CREATE POLICY "Managers can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'global_manager'));

-- Geofence Config: Everyone can read, only managers can update
CREATE POLICY "Anyone can view geofence config" ON public.geofence_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can update geofence config" ON public.geofence_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'global_manager'));

-- Work Calendar: Dept members can read their calendar, managers can manage all
CREATE POLICY "Users can view department calendar" ON public.work_calendar
  FOR SELECT TO authenticated
  USING (
    department_id = public.get_user_department(auth.uid()) OR
    public.has_role(auth.uid(), 'global_manager') OR
    public.has_role(auth.uid(), 'department_head')
  );

CREATE POLICY "Managers can manage calendars" ON public.work_calendar
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'global_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'global_manager'));

-- User Rest Schedule: Users manage own, heads view dept, managers view all
CREATE POLICY "Users can manage own rest schedule" ON public.user_rest_schedule
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Heads and managers can view rest schedules" ON public.user_rest_schedule
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'global_manager') OR
    (public.has_role(auth.uid(), 'department_head') AND 
     user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid())))
  );

-- Attendance Marks: Users manage own, heads view dept, managers view all
CREATE POLICY "Users can insert own attendance" ON public.attendance_marks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own attendance" ON public.attendance_marks
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'global_manager') OR
    (public.has_role(auth.uid(), 'department_head') AND 
     user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid())))
  );

-- Audit Log: Only managers can view
CREATE POLICY "Managers can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'global_manager'));

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- App Config: Everyone reads, only managers update
CREATE POLICY "Anyone can view app config" ON public.app_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can update app config" ON public.app_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'global_manager'));

-- Function to auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_dept_id UUID;
BEGIN
  -- Get first department as default
  SELECT id INTO default_dept_id FROM public.departments LIMIT 1;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'department_id')::UUID,
      default_dept_id
    )
  );
  
  -- Create default role as employee
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_geofence_updated_at
  BEFORE UPDATE ON public.geofence_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();