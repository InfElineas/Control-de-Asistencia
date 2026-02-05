import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DepartmentSchedule {
  id: string;
  department_id: string;
  checkin_start_time: string;
  checkin_end_time: string;
  checkout_start_time: string | null;
  checkout_end_time: string | null;
  timezone: string;
  allow_early_checkin: boolean;
  allow_late_checkout: boolean;
}

export function useDepartmentSchedule() {
  const { profile } = useAuth();
  const [schedule, setSchedule] = useState<DepartmentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!profile?.department_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('department_schedules')
          .select('*')
          .eq('department_id', profile.department_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setSchedule(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [profile?.department_id]);

  const isWithinCheckinWindow = (): { allowed: boolean; message: string | null } => {
    if (!schedule) {
      return { allowed: false, message: 'Departamento sin horario configurado' };
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { 
      timeZone: schedule.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });

    const start = schedule.checkin_start_time;
    const end = schedule.checkin_end_time;

    if (currentTime < start && !schedule.allow_early_checkin) {
      return { 
        allowed: false, 
        message: `Entrada anticipada no permitida. Horario: ${start.slice(0,5)} - ${end.slice(0,5)}` 
      };
    }

    if (currentTime > end) {
      return { 
        allowed: false, 
        message: `Hora de entrada excedida. Horario: ${start.slice(0,5)} - ${end.slice(0,5)}` 
      };
    }

    return { allowed: true, message: null };
  };

  return {
    schedule,
    loading,
    error,
    isWithinCheckinWindow,
  };
}
