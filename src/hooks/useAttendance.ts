import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceMark {
  id: string;
  user_id: string;
  mark_type: 'IN' | 'OUT';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distance_to_center: number | null;
  inside_geofence: boolean;
  blocked: boolean;
  block_reason: string | null;
}

interface AttendanceState {
  todayMarks: AttendanceMark[];
  lastMark: AttendanceMark | null;
  canMarkIn: boolean;
  canMarkOut: boolean;
  loading: boolean;
  error: string | null;
}

export function useAttendance() {
  const { user } = useAuth();
  const [state, setState] = useState<AttendanceState>({
    todayMarks: [],
    lastMark: null,
    canMarkIn: true,
    canMarkOut: false,
    loading: true,
    error: null,
  });

  const fetchTodayMarks = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const { data, error } = await supabase
        .from('attendance_marks')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const marks = (data || []) as AttendanceMark[];
      const lastMark = marks[0] || null;
      
      // Determine what actions are available
      const canMarkIn = !lastMark || lastMark.mark_type === 'OUT';
      const canMarkOut = lastMark?.mark_type === 'IN';

      setState({
        todayMarks: marks,
        lastMark,
        canMarkIn,
        canMarkOut,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodayMarks();
    }
  }, [user]);

  const markAttendance = async (
    markType: 'IN' | 'OUT',
    geoData: {
      latitude: number | null;
      longitude: number | null;
      accuracy: number | null;
      distanceToCenter: number | null;
      insideGeofence: boolean;
    }
  ) => {
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    try {
      const { error } = await supabase.from('attendance_marks').insert({
        user_id: user.id,
        mark_type: markType,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        accuracy: geoData.accuracy,
        distance_to_center: geoData.distanceToCenter,
        inside_geofence: geoData.insideGeofence,
        blocked: false,
      });

      if (error) throw error;

      await fetchTodayMarks();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    ...state,
    markAttendance,
    refreshMarks: fetchTodayMarks,
  };
}
