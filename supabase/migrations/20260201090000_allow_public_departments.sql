DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments"
  ON public.departments
  FOR SELECT
  TO public
  USING (true);
