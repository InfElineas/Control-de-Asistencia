import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trash2, Loader2 } from 'lucide-react';
import { useAppReleasesAdmin } from '@/hooks/useAppReleases';

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppReleasesSection() {
  const { releases, loading, uploading, publishRelease, deleteRelease } = useAppReleasesAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const canPublish = Boolean(file) && versionName.trim().length > 0 && Number(versionCode) > 0 && !uploading;

  const handlePublish = async () => {
    if (!file) return;
    const { error } = await publishRelease(file, versionName.trim(), Number(versionCode), releaseNotes.trim());
    if (!error) {
      setFile(null);
      setVersionName('');
      setVersionCode('');
      setReleaseNotes('');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" /> App móvil (Android)</CardTitle>
        <CardDescription>Publica una nueva APK para que quede disponible como descarga desde la web.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Archivo APK</Label>
            <Input
              type="file"
              accept=".apk"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Versión (ej. 1.4.0)</Label>
              <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="1.4.0" />
            </div>
            <div className="space-y-2">
              <Label>Version code</Label>
              <Input type="number" min={1} value={versionCode} onChange={(e) => setVersionCode(e.target.value)} placeholder="14" />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas de la versión (opcional)</Label>
            <Textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} placeholder="Qué cambió en esta versión" className="min-h-[70px]" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handlePublish} disabled={!canPublish}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {uploading ? 'Publicando...' : 'Publicar versión'}
          </Button>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground">Cargando versiones...</p>
          ) : releases.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no se ha publicado ninguna versión.</p>
          ) : (
            releases.map((item) => (
              <div key={item.id} className="rounded-md border p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    v{item.version_name}
                    <Badge variant="outline">code {item.version_code}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(item.created_at).toLocaleString()} · {formatSize(item.file_size_bytes)}
                    {item.release_notes ? ` · ${item.release_notes}` : ''}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => deleteRelease(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
