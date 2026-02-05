-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

-- Create a permissive policy that allows anyone (including anonymous users) to read departments
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
TO public
USING (true);