import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';
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

function parseTimeToSeconds(time: string): number {
  const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function getCurrentTimeInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(new Date());
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
      } catch (err: unknown) {
        setError(getErrorMessage(err));
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

    const currentTime = getCurrentTimeInTimezone(schedule.timezone);
    const currentSeconds = parseTimeToSeconds(currentTime);
    const startSeconds = parseTimeToSeconds(schedule.checkin_start_time);
    const endSeconds = parseTimeToSeconds(schedule.checkin_end_time);

    if (currentSeconds < startSeconds && !schedule.allow_early_checkin) {
      return {
        allowed: false,
        message: `Entrada anticipada no permitida. Horario: ${schedule.checkin_start_time.slice(0, 5)} - ${schedule.checkin_end_time.slice(0, 5)} (${schedule.timezone})`,
      };
    }

    if (currentSeconds > endSeconds) {
      return {
        allowed: false,
        message: `Hora de entrada excedida. Horario: ${schedule.checkin_start_time.slice(0, 5)} - ${schedule.checkin_end_time.slice(0, 5)} (${schedule.timezone})`,
      };
    }

    return { allowed: true, message: null };
  };

  const getCurrentTimeLabel = (): string | null => {
    if (!schedule) return null;
    const currentTime = getCurrentTimeInTimezone(schedule.timezone);
    return `${currentTime.slice(0, 5)} (${schedule.timezone})`;
  };

  return {
    schedule,
    loading,
    error,
    isWithinCheckinWindow,
    getCurrentTimeLabel,
  };
}
