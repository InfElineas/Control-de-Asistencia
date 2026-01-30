import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useGeofenceConfig } from '@/hooks/useGeofenceConfig';
import { useAttendance } from '@/hooks/useAttendance';
import { useRestSchedule } from '@/hooks/useRestSchedule';
import { AppLayout } from '@/components/layout/AppLayout';
import { GeofenceIndicator } from '@/components/attendance/GeofenceIndicator';
import { AttendanceButton } from '@/components/attendance/AttendanceButton';
import { TodayMarks } from '@/components/attendance/TodayMarks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Attendance() {
  const { profile } = useAuth();
  const { isRestDay } = useRestSchedule();
  const { config, loading: configLoading } = useGeofenceConfig();
  const {
    latitude,
    longitude,
    accuracy,
    error: geoError,
    loading: geoLoading,
    getCurrentPosition,
    checkGeofence,
  } = useGeolocation();
  const {
    todayMarks,
    canMarkIn,
    canMarkOut,
    loading: attendanceLoading,
    markAttendance,
  } = useAttendance();

  const [marking, setMarking] = useState(false);
  const [geofenceResult, setGeofenceResult] = useState<{
    isInside: boolean;
    distance: number;
    accuracyOk: boolean;
  } | null>(null);

  // Check geofence when location updates
  useEffect(() => {
    if (config && latitude && longitude) {
      const result = checkGeofence({
        centerLat: config.center_lat,
        centerLng: config.center_lng,
        radiusMeters: config.radius_meters,
        accuracyThreshold: config.accuracy_threshold,
      });
      setGeofenceResult(result);
    }
  }, [config, latitude, longitude, accuracy, checkGeofence]);

  // Get location on mount
  useEffect(() => {
    getCurrentPosition();
  }, []);

  const today = new Date();
  const isRest = isRestDay(today);
  const canMark = geofenceResult?.isInside && !isRest;

  const handleMark = async (type: 'IN' | 'OUT') => {
    if (!geofenceResult?.isInside) {
      toast.error('No puedes marcar fuera de la zona permitida');
      return;
    }

    if (isRest) {
      toast.error('Hoy es tu día de descanso');
      return;
    }

    setMarking(true);
    const { error } = await markAttendance(type, {
      latitude,
      longitude,
      accuracy,
      distanceToCenter: geofenceResult.distance,
      insideGeofence: geofenceResult.isInside,
    });

    if (error) {
      toast.error(`Error al marcar: ${error}`);
    } else {
      toast.success(`${type === 'IN' ? 'Entrada' : 'Salida'} registrada correctamente`);
    }
    setMarking(false);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Marcar Asistencia</h1>
          <p className="text-muted-foreground mt-1">
            {today.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        {/* Rest Day Warning */}
        {isRest && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral/10 border border-neutral/20">
            <Calendar className="h-6 w-6 text-neutral" />
            <div>
              <p className="font-medium text-neutral">Día de descanso</p>
              <p className="text-sm text-muted-foreground">
                No es necesario marcar asistencia hoy
              </p>
            </div>
          </div>
        )}

        {/* Geofence Status */}
        <GeofenceIndicator
          isInside={geofenceResult?.isInside ?? null}
          distance={geofenceResult?.distance ?? null}
          accuracy={accuracy ? Math.round(accuracy) : null}
          loading={geoLoading || configLoading}
          error={geoError}
          onRefresh={getCurrentPosition}
        />

        {/* Warning if outside */}
        {geofenceResult && !geofenceResult.isInside && !isRest && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Debes estar dentro de la zona para marcar asistencia
            </p>
          </div>
        )}

        {/* Attendance Buttons */}
        {!isRest && (
          <div className="flex flex-col items-center gap-4">
            {canMarkIn && (
              <AttendanceButton
                type="IN"
                disabled={!canMark}
                loading={marking}
                onClick={() => handleMark('IN')}
              />
            )}
            {canMarkOut && (
              <AttendanceButton
                type="OUT"
                disabled={!canMark}
                loading={marking}
                onClick={() => handleMark('OUT')}
              />
            )}
          </div>
        )}

        {/* Today's Marks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registro de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayMarks marks={todayMarks} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
