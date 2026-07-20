import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { LocationMapPicker } from '@/components/configuration/LocationMapPicker';
import type { WorkLocation } from '@/hooks/useWorkLocations';
import type { NewLocation } from '@/hooks/useWorkLocationsConfig';

interface Props {
  workLocations: WorkLocation[];
  newLocation: NewLocation;
  setNewLocation: React.Dispatch<React.SetStateAction<NewLocation>>;
  editingLocation: WorkLocation | null;
  setEditingLocation: (loc: WorkLocation | null) => void;
  savingLocation: boolean;
  onCreateLocation: () => Promise<void>;
  onUpdateLocation: () => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
}

export function WorkLocationsSection({
  workLocations,
  newLocation,
  setNewLocation,
  editingLocation,
  setEditingLocation,
  savingLocation,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}: Props) {
  const locationForm = editingLocation ?? newLocation;

  const handleChange = (field: keyof NewLocation | 'is_active', value: string | number | boolean) => {
    if (editingLocation) {
      setEditingLocation({ ...editingLocation, [field]: value });
    } else {
      setNewLocation((p) => ({ ...p, [field]: value }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ubicaciones de trabajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listado de ubicaciones</CardTitle>
            <CardDescription>Administra sedes activas e inactivas, crea nuevas ubicaciones y edita las existentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {workLocations.map((location) => (
                <div key={location.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{location.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {location.is_active ? 'Activa' : 'Inactiva'} · Radio {location.radius_meters}m · Precisión {location.accuracy_threshold}m
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingLocation(location)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDeleteLocation(location.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Lat {location.center_lat} · Lng {location.center_lng}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed p-3 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                {editingLocation ? 'Editar ubicación seleccionada' : 'Crear nueva ubicación'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Nombre de ubicación"
                  value={locationForm.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Radio (m)"
                  value={locationForm.radius_meters}
                  onChange={(e) => handleChange('radius_meters', parseInt(e.target.value, 10) || 0)}
                />
                <Input
                  type="number"
                  placeholder="Precisión GPS (m)"
                  value={locationForm.accuracy_threshold}
                  onChange={(e) => handleChange('accuracy_threshold', parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <LocationMapPicker
                latitude={locationForm.center_lat}
                longitude={locationForm.center_lng}
                radiusMeters={locationForm.radius_meters}
                onChange={({ lat, lng }) => {
                  handleChange('center_lat', Number(lat.toFixed(6)));
                  handleChange('center_lng', Number(lng.toFixed(6)));
                }}
              />
              <p className="text-xs text-muted-foreground">Lat {locationForm.center_lat} · Lng {locationForm.center_lng}</p>

              <div className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Ubicación activa</p>
                  <p className="text-xs text-muted-foreground">Solo las activas aparecen al iniciar sesión.</p>
                </div>
                <Switch
                  checked={editingLocation ? editingLocation.is_active : true}
                  onCheckedChange={(checked) => editingLocation && handleChange('is_active', checked)}
                  disabled={!editingLocation}
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Bloquear por baja precisión</p>
                  <p className="text-xs text-muted-foreground">Rechaza marcajes con GPS impreciso en esta locación.</p>
                </div>
                <Switch
                  checked={locationForm.block_on_poor_accuracy}
                  onCheckedChange={(checked) => handleChange('block_on_poor_accuracy', checked)}
                />
              </div>

              <div className="flex gap-2">
                {editingLocation ? (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => setEditingLocation(null)}>Cancelar edición</Button>
                    <Button className="w-full" onClick={onUpdateLocation} disabled={savingLocation}>
                      {savingLocation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                      Guardar cambios
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="w-full" onClick={onCreateLocation} disabled={savingLocation}>
                    {savingLocation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                    Crear ubicación
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
