import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';

interface GeofenceConfig {
  id: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  accuracy_threshold: number;
  block_on_poor_accuracy: boolean;
}

export function useGeofenceConfig() {
  const [config, setConfig] = useState<GeofenceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('geofence_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (updates: Partial<GeofenceConfig>) => {
    if (!config) return { error: 'No config found' };

    try {
      const { error } = await supabase
        .from('geofence_config')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;
      await fetchConfig();
      return { error: null };
    } catch (err: unknown) {
      return { error: getErrorMessage(err) };
    }
  };

  return { config, loading, error, updateConfig, refetch: fetchConfig };
}
