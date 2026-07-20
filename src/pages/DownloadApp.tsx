import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Smartphone, ArrowLeft } from 'lucide-react';
import { useLatestAppRelease } from '@/hooks/useAppReleases';

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadApp() {
  const { release, loading } = useLatestAppRelease();

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden p-3 sm:p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#173B72] via-[#2A59A1] to-[#61B5E4]" />
      <Card className="relative z-10 w-full max-w-[520px] rounded-md border border-white/20 bg-[#f4f6fd] shadow-[0_8px_40px_rgba(18,56,125,0.35)]">
        <CardHeader className="text-center pt-6 pb-2">
          <div className="flex justify-center mb-3">
            <img
              src="/logo-control-asistencia.svg"
              alt="Control de Asistencia ELINEAS"
              className="h-20 w-20 rounded bg-black p-2 object-contain shadow-sm"
            />
          </div>
          <CardTitle className="text-2xl text-slate-800 flex items-center justify-center gap-2">
            <Smartphone className="h-5 w-5" /> App para Android
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">
            Descarga la última versión de Control de Asistencia ELINEAS para tu teléfono.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !release ? (
            <p className="text-center text-sm text-slate-500 py-8">
              Todavía no hay una versión publicada. Vuelve a intentarlo más tarde.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Versión {release.version_name}
                  {formatSize(release.file_size_bytes) && (
                    <span className="text-slate-400 font-normal"> · {formatSize(release.file_size_bytes)}</span>
                  )}
                </p>
                {release.release_notes && (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{release.release_notes}</p>
                )}
              </div>

              <a href={release.downloadUrl} download>
                <Button className="w-full h-11 rounded bg-[#1D3F75] text-lg font-semibold hover:bg-[#183664]">
                  <Download className="h-4 w-4 mr-2" /> Descargar APK
                </Button>
              </a>

              <div className="text-xs text-slate-500 space-y-1 rounded-lg border border-dashed border-slate-300 p-3">
                <p className="font-medium text-slate-600">Para instalarla en tu teléfono:</p>
                <p>1. Abre el archivo descargado desde las notificaciones o el gestor de archivos.</p>
                <p>2. Si Android lo pide, permite instalar aplicaciones de esta fuente.</p>
                <p>3. Sigue los pasos de instalación y abre la app.</p>
              </div>
            </>
          )}

          <div className="text-center">
            <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-[#1D3F75] font-semibold hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver a iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
