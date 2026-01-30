-- 1) departments.name debe ser unique porque lo usas en ON CONFLICT(name)
alter table public.departments
  add constraint departments_name_key unique (name);

-- 2) user_roles debe evitar duplicados por (user_id, role)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_name_key'
      and conrelid = 'public.departments'::regclass
  ) then
    alter table public.departments
      add constraint departments_name_key unique (name);
  end if;
end $$;


-- 3) auth.users(email) normalmente YA es unique, pero si en tu entorno no lo está:
-- (en Supabase casi siempre existe, pero lo dejo como "seguro" vía índice)
create unique index if not exists users_email_unique_idx
  on auth.users (email);
