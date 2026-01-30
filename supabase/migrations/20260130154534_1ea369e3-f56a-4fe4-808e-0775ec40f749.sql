-- Allow global managers to update roles (need to delete old and insert new)
CREATE POLICY "Managers can delete roles to update" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'global_manager'::app_role));

-- Allow global managers to update roles directly
CREATE POLICY "Managers can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'global_manager'::app_role));

-- Allow global managers to view all user_roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view roles" 
ON public.user_roles 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'global_manager'::app_role)
);

-- Allow global managers to update any profile department
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'global_manager'::app_role)
);

-- Allow global managers to view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'global_manager'::app_role) 
  OR (has_role(auth.uid(), 'department_head'::app_role) AND department_id = get_user_department(auth.uid()))
);