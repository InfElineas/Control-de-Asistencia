import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mapGenericActionError } from '@/lib/error-messages';
import { toast } from 'sonner';

const BUCKET = 'app-releases';

export interface AppRelease {
  id: string;
  version_name: string;
  version_code: number;
  apk_path: string;
  file_size_bytes: number | null;
  release_notes: string | null;
  created_at: string;
  downloadUrl: string;
}

function toAppRelease(row: {
  id: string;
  version_name: string;
  version_code: number;
  apk_path: string;
  file_size_bytes: number | null;
  release_notes: string | null;
  created_at: string;
}): AppRelease {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(row.apk_path);
  return { ...row, downloadUrl: data.publicUrl };
}

export function useLatestAppRelease() {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('app_releases')
        .select('id, version_name, version_code, apk_path, file_size_bytes, release_notes, created_at')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setRelease(data ? toAppRelease(data) : null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { release, loading };
}

export function useAppReleasesAdmin() {
  const { user } = useAuth();
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_releases')
      .select('id, version_name, version_code, apk_path, file_size_bytes, release_notes, created_at')
      .order('version_code', { ascending: false });

    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudieron cargar las versiones publicadas.'));
      setReleases([]);
    } else {
      setReleases((data || []).map(toAppRelease));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const publishRelease = useCallback(async (
    file: File,
    versionName: string,
    versionCode: number,
    releaseNotes: string,
  ) => {
    setUploading(true);

    try {
      const apkPath = `${versionCode}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(apkPath, file, { upsert: true, contentType: 'application/vnd.android.package-archive' });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('app_releases').insert({
        version_name: versionName,
        version_code: versionCode,
        apk_path: apkPath,
        file_size_bytes: file.size,
        release_notes: releaseNotes || null,
        created_by: user?.id,
      });

      if (insertError) throw insertError;

      await fetchReleases();
      toast.success('Versión publicada correctamente.');
      return { error: null };
    } catch (err: unknown) {
      const message = mapGenericActionError(err, 'No se pudo publicar la nueva versión.');
      toast.error(message);
      return { error: message };
    } finally {
      setUploading(false);
    }
  }, [fetchReleases, user?.id]);

  const deleteRelease = useCallback(async (release: AppRelease) => {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([release.apk_path]);
    if (storageError) {
      toast.error(mapGenericActionError(storageError, 'No se pudo eliminar el archivo APK.'));
      return;
    }

    const { error: deleteError } = await supabase.from('app_releases').delete().eq('id', release.id);
    if (deleteError) {
      toast.error(mapGenericActionError(deleteError, 'No se pudo eliminar la versión.'));
      return;
    }

    await fetchReleases();
    toast.success('Versión eliminada.');
  }, [fetchReleases]);

  return { releases, loading, uploading, publishRelease, deleteRelease };
}
