-- App releases: lets superadmins publish the Android APK and lets anyone download the latest build from the web.
CREATE TABLE public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  apk_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  release_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app releases"
  ON public.app_releases FOR SELECT
  USING (true);

CREATE POLICY "Superadmins manage app releases"
  ON public.app_releases FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'app-releases',
  'app-releases',
  true,
  209715200,
  ARRAY['application/vnd.android.package-archive']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'app-releases'
);

CREATE POLICY "Public can read app release files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-releases');

CREATE POLICY "Superadmins can upload app release files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'app-releases' AND has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update app release files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'app-releases' AND has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete app release files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'app-releases' AND has_role(auth.uid(), 'superadmin'));
