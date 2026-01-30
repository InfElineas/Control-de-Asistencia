DO $$
DECLARE
  name_col int2[];
BEGIN
  SELECT ARRAY(
    SELECT attnum
    FROM pg_attribute
    WHERE attrelid = 'public.departments'::regclass
      AND attname = 'name'
    ORDER BY attnum
  ) INTO name_col;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.departments'::regclass
      AND contype = 'u'
      AND conkey = name_col
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_name_key UNIQUE (name);
  END IF;
END
$$;

DO $$
DECLARE
  role_cols int2[];
BEGIN
  SELECT ARRAY(
    SELECT attnum
    FROM pg_attribute
    WHERE attrelid = 'public.user_roles'::regclass
      AND attname IN ('user_id', 'role')
    ORDER BY attnum
  ) INTO role_cols;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND contype = 'u'
      AND conkey = role_cols
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END
$$;

DO $$
DECLARE
  email_cols int2[];
BEGIN
  SELECT ARRAY(
    SELECT attnum
    FROM pg_attribute
    WHERE attrelid = 'auth.users'::regclass
      AND attname = 'email'
    ORDER BY attnum
  ) INTO email_cols;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    WHERE t.oid = 'auth.users'::regclass
      AND i.indisunique
      AND i.indkey::int2[] = email_cols
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_key ON auth.users (email)';
  END IF;
END
$$;
