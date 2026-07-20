import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeofenceConfig } from '@/hooks/useGeofenceConfig';
import { WorkLocation } from '@/hooks/useWorkLocations';
import { mapGenericActionError } from '@/lib/error-messages';
import { toast } from 'sonner';

export type NewLocation = {
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  accuracy_threshold: number;
  block_on_poor_accuracy: boolean;
};

const DEFAULT_LOCATION_CENTER = { lat: 40.416775, lng: -3.70379 };

export const DEFAULT_NEW_LOCATION: NewLocation = {
  name: '',
  center_lat: DEFAULT_LOCATION_CENTER.lat,
  center_lng: DEFAULT_LOCATION_CENTER.lng,
  radius_meters: 100,
  accuracy_threshold: 50,
  block_on_poor_accuracy: true,
};

export function useWorkLocationsConfig() {
  const { config, loading: geofenceLoading } = useGeofenceConfig();
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [newLocation, setNewLocation] = useState<NewLocation>(DEFAULT_NEW_LOCATION);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const fetchWorkLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudieron cargar las ubicaciones de trabajo.'));
      return;
    }

    const currentLocations = (data || []) as WorkLocation[];

    if (config) {
      const hasEquivalentLocation = currentLocations.some(
        (item) =>
          item.center_lat === config.center_lat &&
          item.center_lng === config.center_lng &&
          item.radius_meters === config.radius_meters &&
          item.accuracy_threshold === config.accuracy_threshold
      );

      if (!hasEquivalentLocation) {
        const { error: createLegacyError } = await supabase.from('work_locations').insert({
          name: 'Ubicación base',
          center_lat: config.center_lat,
          center_lng: config.center_lng,
          radius_meters: config.radius_meters,
          accuracy_threshold: config.accuracy_threshold,
          block_on_poor_accuracy: config.block_on_poor_accuracy,
          is_active: true,
        });

        if (!createLegacyError) {
          const { data: refreshedData } = await supabase
            .from('work_locations')
            .select('*')
            .order('name', { ascending: true });
          setWorkLocations((refreshedData || []) as WorkLocation[]);
          return;
        }
      }
    }

    setWorkLocations(currentLocations);
  }, [config]);

  useEffect(() => {
    void fetchWorkLocations();
  }, [fetchWorkLocations]);

  const handleCreateWorkLocation = async () => {
    if (!newLocation.name.trim()) {
      toast.error('Debes indicar un nombre para la ubicación.');
      return;
    }

    setSavingLocation(true);
    const { error } = await supabase.from('work_locations').insert({
      name: newLocation.name.trim(),
      center_lat: newLocation.center_lat,
      center_lng: newLocation.center_lng,
      radius_meters: newLocation.radius_meters,
      accuracy_threshold: newLocation.accuracy_threshold,
      block_on_poor_accuracy: newLocation.block_on_poor_accuracy,
      is_active: true,
    });

    if (error) {
      setSavingLocation(false);
      toast.error(mapGenericActionError(error, 'No se pudo crear la ubicación de trabajo.'));
      return;
    }

    await fetchWorkLocations();
    setNewLocation(DEFAULT_NEW_LOCATION);
    setSavingLocation(false);
    toast.success('Ubicación creada correctamente.');
  };

  const handleUpdateWorkLocation = async () => {
    if (!editingLocation?.name.trim()) {
      toast.error('Debes indicar un nombre para la ubicación.');
      return;
    }

    setSavingLocation(true);
    const { error } = await supabase
      .from('work_locations')
      .update({
        name: editingLocation.name.trim(),
        center_lat: editingLocation.center_lat,
        center_lng: editingLocation.center_lng,
        radius_meters: editingLocation.radius_meters,
        accuracy_threshold: editingLocation.accuracy_threshold,
        block_on_poor_accuracy: editingLocation.block_on_poor_accuracy,
        is_active: editingLocation.is_active,
      })
      .eq('id', editingLocation.id);

    if (error) {
      setSavingLocation(false);
      toast.error(mapGenericActionError(error, 'No se pudo actualizar la ubicación.'));
      return;
    }

    await fetchWorkLocations();
    setSavingLocation(false);
    setEditingLocation(null);
    toast.success('Ubicación actualizada.');
  };

  const handleDeleteWorkLocation = async (locationId: string) => {
    const { error } = await supabase.from('work_locations').delete().eq('id', locationId);

    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudo eliminar la ubicación.'));
      return;
    }

    if (editingLocation?.id === locationId) setEditingLocation(null);
    await fetchWorkLocations();
    toast.success('Ubicación eliminada.');
  };

  return {
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
  };
}
