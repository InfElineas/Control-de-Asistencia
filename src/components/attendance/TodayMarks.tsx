import { Clock } from 'lucide-react';

interface TodayMarksProps {
  marks: Array<{
    id: string;
    mark_type: 'IN' | 'OUT';
    timestamp: string;
    inside_geofence: boolean;
  }>;
}

export function TodayMarks({ marks }: TodayMarksProps) {
  if (marks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No hay marcajes hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-muted-foreground mb-3">Marcajes de hoy</h3>
      <div className="space-y-2">
        {marks.map((mark) => (
          <div
            key={mark.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  mark.mark_type === 'IN'
                    ? 'bg-success/20 text-success'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {mark.mark_type === 'IN' ? 'Entrada' : 'Salida'}
              </span>
              <span className="font-medium">
                {new Date(mark.timestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <span className={`text-xs ${mark.inside_geofence ? 'text-success' : 'text-destructive'}`}>
              {mark.inside_geofence ? '✓ Dentro' : '✗ Fuera'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
