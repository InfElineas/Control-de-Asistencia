import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import type { AttendanceImportSummary } from '@/hooks/useGeneralConfig';

interface Props {
  importingHistory: boolean;
  importSummary: AttendanceImportSummary | null;
  onImport: (file: File) => Promise<void>;
}

export function ImportHistorySection({ importingHistory, importSummary, onImport }: Props) {
  return (
    <Card className="border-dashed">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Importar asistencia histórica (Excel)
        </CardTitle>
        <CardDescription>
          Carga datos anteriores para recalcular métricas anuales y vacaciones acumuladas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Formato recomendado (una fila por día trabajado):</p>
          <p>Columnas obligatorias: <strong>email</strong> (o <strong>correo</strong>) y <strong>fecha</strong> (o <strong>date</strong>).</p>
          <p>Fecha admitida: <strong>YYYY-MM-DD</strong> o fecha válida de Excel.</p>
          <p>Columnas opcionales (se ignoran): nombre, departamento, estado, observaciones.</p>
        </div>

        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={importingHistory}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onImport(file);
            e.currentTarget.value = '';
          }}
        />

        {importingHistory && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Importando histórico...
          </p>
        )}

        {importSummary && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p><strong>Marcajes importados:</strong> {importSummary.imported_marks}</p>
            <p><strong>Correos no encontrados:</strong> {importSummary.missing_emails.length}</p>
            {importSummary.missing_emails.length > 0 && (
              <p className="text-xs text-muted-foreground break-words">
                {importSummary.missing_emails.slice(0, 20).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-start gap-2">
          <Upload className="h-3.5 w-3.5 mt-0.5" />
          <span>
            Si tu Excel está en formato anual por columnas (ene-dic), primero conviértelo a filas
            <strong> (email + fecha)</strong> para una importación compatible.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
