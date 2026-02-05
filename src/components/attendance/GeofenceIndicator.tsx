import { MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GeofenceIndicatorProps {
  isInside: boolean | null;
  distance: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function GeofenceIndicator({
  isInside,
  distance,
  accuracy,
  loading,
  error,
  onRefresh,
}: GeofenceIndicatorProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary animate-pulse">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Obteniendo ubicación...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-3">
          <MapPinOff className="h-5 w-5 text-destructive" />
          <span className="text-destructive font-medium">Error de ubicación</span>
        </div>
        <p className="text-sm text-destructive/80">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (isInside === null) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-secondary">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">Ubicación no verificada</span>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Verificar ubicación
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 p-4 rounded-xl transition-all',
        isInside ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MapPin className={cn('h-6 w-6', isInside ? 'text-success' : 'text-destructive')} />
            {isInside && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success animate-ping" />
            )}
          </div>
          <div>
            <p className={cn('font-semibold', isInside ? 'text-success' : 'text-destructive')}>
              {isInside ? 'Dentro de la zona' : 'Fuera de la zona'}
            </p>
            <p className="text-sm text-muted-foreground">
              Distancia: {distance}m | Precisión: ±{accuracy}m
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
