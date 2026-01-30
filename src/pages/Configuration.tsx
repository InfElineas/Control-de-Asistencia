import { useState } from 'react';
import { useGeofenceConfig } from '@/hooks/useGeofenceConfig';
import { useDepartments } from '@/hooks/useDepartments';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Calendar, Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Configuration() {
  const { config, loading, updateConfig } = useGeofenceConfig();
  const { departments } = useDepartments();
  
  const [geofenceForm, setGeofenceForm] = useState({
    center_lat: config?.center_lat || 40.416775,
    center_lng: config?.center_lng || -3.703790,
    radius_meters: config?.radius_meters || 100,
    accuracy_threshold: config?.accuracy_threshold || 50,
    block_on_poor_accuracy: config?.block_on_poor_accuracy ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Update form when config loads
  useState(() => {
    if (config) {
      setGeofenceForm({
        center_lat: config.center_lat,
        center_lng: config.center_lng,
        radius_meters: config.radius_meters,
        accuracy_threshold: config.accuracy_threshold,
        block_on_poor_accuracy: config.block_on_poor_accuracy,
      });
    }
  });

  const handleSaveGeofence = async () => {
    setSaving(true);
    const { error } = await updateConfig(geofenceForm);
    
    if (error) {
      toast.error(`Error: ${error}`);
    } else {
      toast.success('Configuración de geofence guardada');
    }
    setSaving(false);
  };

  if (loading) {
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
          <p className="text-muted-foreground">
            Gestiona la configuración del sistema de asistencia
          </p>
        </div>

        <Tabs defaultValue="geofence">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geofence" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Geofence</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
          </TabsList>

          {/* Geofence Tab */}
          <TabsContent value="geofence">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Configuración de Geofence
                </CardTitle>
                <CardDescription>
                  Define la zona permitida para marcar asistencia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitud del centro</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      value={geofenceForm.center_lat}
                      onChange={(e) =>
                        setGeofenceForm((p) => ({
                          ...p,
                          center_lat: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lng">Longitud del centro</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.000001"
                      value={geofenceForm.center_lng}
                      onChange={(e) =>
                        setGeofenceForm((p) => ({
                          ...p,
                          center_lng: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="radius">Radio permitido (metros)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={geofenceForm.radius_meters}
                      onChange={(e) =>
                        setGeofenceForm((p) => ({
                          ...p,
                          radius_meters: parseInt(e.target.value),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Los empleados deben estar dentro de este radio para marcar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accuracy">Umbral de precisión GPS (metros)</Label>
                    <Input
                      id="accuracy"
                      type="number"
                      value={geofenceForm.accuracy_threshold}
                      onChange={(e) =>
                        setGeofenceForm((p) => ({
                          ...p,
                          accuracy_threshold: parseInt(e.target.value),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Precisión mínima aceptable del GPS
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <div>
                    <p className="font-medium">Bloquear con precisión baja</p>
                    <p className="text-sm text-muted-foreground">
                      Impide marcar si la precisión GPS es mayor al umbral
                    </p>
                  </div>
                  <Switch
                    checked={geofenceForm.block_on_poor_accuracy}
                    onCheckedChange={(checked) =>
                      setGeofenceForm((p) => ({
                        ...p,
                        block_on_poor_accuracy: checked,
                      }))
                    }
                  />
                </div>

                <Button onClick={handleSaveGeofence} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar configuración
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendario Laboral
                </CardTitle>
                <CardDescription>
                  Configura días laborables y festivos por departamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border">
                    <p className="font-medium mb-2">Departamentos disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <span
                          key={dept.id}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                        >
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-lg border-2 border-dashed text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Funcionalidad de calendario laboral disponible.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Por defecto, todos los días son laborables (L-V).
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Los descansos individuales se configuran desde cada empleado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración General
                </CardTitle>
                <CardDescription>
                  Ajustes globales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <div>
                    <p className="font-medium">Incluir jefes en reportes globales</p>
                    <p className="text-sm text-muted-foreground">
                      Por defecto, los jefes de departamento NO aparecen en reportes globales
                    </p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Hora de inicio por defecto</Label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin por defecto</Label>
                    <Input type="time" defaultValue="18:00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tolerancia de tardanza (minutos)</Label>
                  <Input type="number" defaultValue="15" />
                  <p className="text-xs text-muted-foreground">
                    Minutos después de la hora de entrada que se consideran tardanza
                  </p>
                </div>

                <Button className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar configuración general
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
