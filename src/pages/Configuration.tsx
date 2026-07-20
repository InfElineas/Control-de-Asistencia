import type { ComponentProps } from 'react';
import { useDepartmentSchedules } from '@/hooks/useDepartmentSchedules';
import { useWorkLocationsConfig } from '@/hooks/useWorkLocationsConfig';
import { useGeneralConfig } from '@/hooks/useGeneralConfig';
import { AppLayout } from '@/components/layout/AppLayout';
import { DepartmentScheduleCard } from '@/components/configuration/DepartmentScheduleCard';
import { WorkLocationsSection } from '@/components/configuration/WorkLocationsSection';
import { ImportHistorySection } from '@/components/configuration/ImportHistorySection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MapPin, Clock, Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import { mapGenericActionError } from '@/lib/error-messages';

const TIMEZONE_OPTIONS = [
  { value: 'America/Lima', label: 'Perú (America/Lima)' },
  { value: 'America/Bogota', label: 'Colombia (America/Bogota)' },
  { value: 'America/Mexico_City', label: 'México CDMX (America/Mexico_City)' },
  { value: 'America/Santiago', label: 'Chile (America/Santiago)' },
  { value: 'America/La_Paz', label: 'Bolivia (America/La_Paz)' },
  { value: 'America/Guayaquil', label: 'Ecuador (America/Guayaquil)' },
  { value: 'America/Asuncion', label: 'Paraguay (America/Asuncion)' },
  { value: 'America/Montevideo', label: 'Uruguay (America/Montevideo)' },
  { value: 'America/Caracas', label: 'Venezuela (America/Caracas)' },
  { value: 'Europe/Madrid', label: 'España (Europe/Madrid)' },
  { value: 'UTC', label: 'UTC' },
] as const;

type ScheduleUpdateData = ComponentProps<typeof DepartmentScheduleCard>['onSave'] extends (
  departmentId: string,
  data: infer T
) => Promise<{ error: string | null }>
  ? T
  : never;

export default function Configuration() {
  const { departmentsWithSchedules, loading: schedulesLoading, updateSchedule, updateDepartmentPause } = useDepartmentSchedules();
  const {
    geofenceLoading,
    workLocations,
    newLocation,
    setNewLocation,
    editingLocation,
    setEditingLocation,
    savingLocation,
    handleCreateWorkLocation,
    handleUpdateWorkLocation,
    handleDeleteWorkLocation,
  } = useWorkLocationsConfig();
  const {
    generalConfig,
    setGeneralConfig,
    savingGeneral,
    restSeparationDepartmentIds,
    importingHistory,
    importSummary,
    toggleRestSeparationDepartment,
    handleSaveGeneral,
    handleImportAttendanceHistory,
  } = useGeneralConfig();

  const handleSaveSchedule = async (departmentId: string, data: ScheduleUpdateData) => {
    const { error } = await updateSchedule(departmentId, data);
    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudo completar la operación.'));
    } else {
      toast.success('Horario guardado correctamente');
    }
    return { error };
  };

  const handleToggleDepartmentPause = async (departmentId: string, isPaused: boolean) => {
    const { error } = await updateDepartmentPause(departmentId, isPaused);
    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudo actualizar el estado del departamento.'));
    } else {
      toast.success(isPaused ? 'Departamento en modo sin descanso.' : 'Descanso por departamento activado.');
    }
    return { error };
  };

  if (geofenceLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Gestiona la configuración del sistema de asistencia</p>
        </div>

        <Tabs defaultValue="schedules">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedules" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="geofence" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Geofence</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horarios por Departamento
                  </CardTitle>
                  <CardDescription>
                    Configura la ventana de entrada y salida para cada departamento
                  </CardDescription>
                </CardHeader>
              </Card>

              {schedulesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {departmentsWithSchedules.map((dept) => (
                    <DepartmentScheduleCard
                      key={dept.id}
                      departmentId={dept.id}
                      departmentName={dept.name}
                      isPaused={dept.is_paused}
                      schedule={dept.schedule}
                      onSave={handleSaveSchedule}
                      onTogglePause={handleToggleDepartmentPause}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="geofence">
            <WorkLocationsSection
              workLocations={workLocations}
              newLocation={newLocation}
              setNewLocation={setNewLocation}
              editingLocation={editingLocation}
              setEditingLocation={setEditingLocation}
              savingLocation={savingLocation}
              onCreateLocation={handleCreateWorkLocation}
              onUpdateLocation={handleUpdateWorkLocation}
              onDeleteLocation={handleDeleteWorkLocation}
            />
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración General
                </CardTitle>
                <CardDescription>Ajustes globales del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <div>
                    <p className="font-medium">Incluir jefes en reportes globales</p>
                    <p className="text-sm text-muted-foreground">
                      Por defecto, los jefes de departamento NO aparecen en reportes globales
                    </p>
                  </div>
                  <Switch
                    checked={generalConfig.includeHeadsInGlobalReports}
                    onCheckedChange={(checked) => setGeneralConfig((prev) => ({ ...prev, includeHeadsInGlobalReports: checked }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Zona horaria global</Label>
                    <Select
                      value={generalConfig.globalTimezone}
                      onValueChange={(value) => setGeneralConfig((prev) => ({ ...prev, globalTimezone: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecciona zona horaria" /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Se aplica para todos los departamentos y centraliza el cálculo de tardanzas/ventanas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tolerancia de tardanza (minutos)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={generalConfig.lateToleranceMinutes}
                      onChange={(e) => setGeneralConfig((prev) => ({ ...prev, lateToleranceMinutes: parseInt(e.target.value || '0', 10) }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minutos después de la hora de entrada que se consideran tardanza
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Acumulación de vacaciones por día trabajado</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.0001}
                      value={generalConfig.vacationDaysPerWorkedDay}
                      onChange={(e) => setGeneralConfig((prev) => ({ ...prev, vacationDaysPerWorkedDay: parseFloat(e.target.value || '0') }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ejemplo: 0.0833 ≈ 1 día de vacaciones acumulado cada 12 días trabajados.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Separación mínima entre días de descanso</Label>
                    <Input
                      type="number"
                      min={1}
                      value={generalConfig.restDaysMinSeparation}
                      onChange={(e) => setGeneralConfig((prev) => ({ ...prev, restDaysMinSeparation: parseInt(e.target.value || '1', 10) }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Define cuántos días de separación mínima habrá entre descansos semanales.
                    </p>

                    <div className="rounded-md border p-3 space-y-2">
                      <p className="text-sm font-medium">Departamentos donde aplica esta regla</p>
                      <p className="text-xs text-muted-foreground">
                        Si no seleccionas ninguno, la regla aplica a todos los departamentos.
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {departmentsWithSchedules.map((department) => (
                          <label key={department.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={restSeparationDepartmentIds.includes(department.id)}
                              onCheckedChange={(value) => toggleRestSeparationDepartment(department.id, Boolean(value))}
                            />
                            <span>{department.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>ID de Google Sheet para reportes</Label>
                    <Input
                      placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      value={generalConfig.googleSheetsSpreadsheetId}
                      onChange={(e) => setGeneralConfig((prev) => ({ ...prev, googleSheetsSpreadsheetId: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      ID de la hoja de cálculo (parte de la URL entre <code>/d/</code> y <code>/edit</code>) donde el botón
                      "Enviar a Sheets" del Panel Global escribirá el reporte. Debe compartirse con el email de la cuenta
                      de servicio de Google configurada en el backend.
                    </p>
                  </div>
                </div>

                <Button className="w-full md:w-auto" onClick={handleSaveGeneral} disabled={savingGeneral}>
                  {savingGeneral ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Guardar configuración general</>
                  )}
                </Button>

                <ImportHistorySection
                  importingHistory={importingHistory}
                  importSummary={importSummary}
                  onImport={handleImportAttendanceHistory}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
