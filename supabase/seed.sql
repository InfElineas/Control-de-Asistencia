-- Seed departments
INSERT INTO public.departments (name)
VALUES
  ('Picker and Packer'),
  ('Expedición'),
  ('Transporte'),
  ('Inventario'),
  ('Estibadores')
ON CONFLICT (name) DO NOTHING;

-- Seed global manager user
WITH manager_dept AS (
  SELECT id FROM public.departments WHERE name = 'Inventario' LIMIT 1
)
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'global.manager@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', 'Global Manager', 'department_id', manager_dept.id),
  now(),
  now()
FROM manager_dept
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'global_manager'::public.app_role
FROM auth.users
WHERE email = 'global.manager@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed department head user
WITH head_dept AS (
  SELECT id FROM public.departments WHERE name = 'Expedición' LIMIT 1
)
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'dept.head@example.com',
  crypt('Password123!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', 'Departamento Jefe', 'department_id', head_dept.id),
  now(),
  now()
FROM head_dept
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'department_head'::public.app_role
FROM auth.users
WHERE email = 'dept.head@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
