import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RestSchedule {
  id: string;
  user_id: string;
  days_of_week: number[];
  effective_from: string;
  notes: string | null;
  created_at: string;
}

export function useRestSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<RestSchedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<RestSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_rest_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      
      setSchedules(data || []);
      
      // Find current effective schedule
      const today = new Date().toISOString().split('T')[0];
      const current = (data || []).find(s => s.effective_from <= today);
      setCurrentSchedule(current || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const addSchedule = async (daysOfWeek: number[], effectiveFrom: string, notes?: string) => {
    if (!user) return { error: 'Usuario no autenticado' };

    try {
      const { error } = await supabase
        .from('user_rest_schedule')
        .insert({
          user_id: user.id,
          days_of_week: daysOfWeek,
          effective_from: effectiveFrom,
          notes,
        });

      if (error) throw error;
      await fetchSchedules();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const isRestDay = (date: Date): boolean => {
    if (!currentSchedule) return false;
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return currentSchedule.days_of_week.includes(dayOfWeek);
  };

  return {
    schedules,
    currentSchedule,
    loading,
    error,
    addSchedule,
    isRestDay,
    refetch: fetchSchedules,
  };
}
