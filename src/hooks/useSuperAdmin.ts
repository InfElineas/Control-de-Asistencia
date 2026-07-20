import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getHighestRole } from '@/lib/roles';
import { resolveAuthRedirectUrl } from '@/lib/auth-redirect';
import * as XLSX from 'xlsx';

export type AuditLog = {
  id: string;
  action: string;
  table_name: string | null;
  created_at: string;
  user_id: string | null;
  record_id: string | null;
  description: string | null;
  source_ip: string | null;
  metadata: Record<string, unknown>;
};

export type ManagedUser = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
};

export type Stats = {
  totalLogs: number;
  totalErrors: number;
  totalUsers: number;
  totalGlobalManagerChanges: number;
  uniqueIps: number;
};

export type CheckoutMode = 'manual' | 'schedule' | 'geofence_exit';

export type SqlConsoleResult = {
  type: 'select' | 'command';
  row_count: number;
  rows: Record<string, unknown>[];
};

export const INITIAL_SQL = `select created_at, user_id, action, description, source_ip
from public.audit_log
order by created_at desc
limit 25;`;

const EMPTY_STATS: Stats = {
  totalLogs: 0,
  totalErrors: 0,
  totalUsers: 0,
  totalGlobalManagerChanges: 0,
  uniqueIps: 0,
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');

const parseExcelDate = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y.toString().padStart(4, '0')}-${parsed.m.toString().padStart(2, '0')}-${parsed.d.toString().padStart(2, '0')}`;
  }
  return null;
};

export function useSuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [accountActionUserId, setAccountActionUserId] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState(INITIAL_SQL);
  const [runningSql, setRunningSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<SqlConsoleResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importingHistory, setImportingHistory] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported_marks: number; missing_emails: string[] } | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('schedule');
  const [autoCheckoutTime, setAutoCheckoutTime] = useState('18:30');
  const [geofenceExitMinutes, setGeofenceExitMinutes] = useState(3);
  const [restDaysMinSeparation, setRestDaysMinSeparation] = useState(4);
  const [savingCheckoutSettings, setSavingCheckoutSettings] = useState(false);

  const logSystemError = useCallback(async (action: string, details: string, metadata?: Record<string, unknown>) => {
    if (!user?.id) return;
    try {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action,
        table_name: 'system',
        description: details,
        metadata: metadata || {},
      });
    } catch (logError) {
      console.error('Failed to persist audit error log', logError);
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        { data: logData, error: logError, count: totalLogs },
        { data: profileData, error: profileError, count: totalUsers },
        { data: roleData, error: rolesError },
        { data: appConfigData, error: appConfigError },
      ] = await Promise.all([
        supabase
          .from('audit_log')
          .select('id, action, table_name, created_at, user_id, record_id, description, source_ip, metadata', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('profiles').select('user_id, full_name, email', { count: 'exact' }).order('full_name', { ascending: true }),
        supabase.from('user_roles').select('user_id, role'),
        supabase
          .from('app_config')
          .select('key, value')
          .in('key', ['attendance_checkout_mode', 'attendance_auto_checkout_time', 'attendance_geofence_exit_minutes', 'rest_days_min_separation']),
      ]);

      if (logError) throw logError;
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;
      if (appConfigError) throw appConfigError;

      const castedLogs = (logData ?? []) as AuditLog[];
      const rolesByUser = (roleData ?? []).reduce<Record<string, string[]>>((acc, item) => {
        if (!acc[item.user_id]) acc[item.user_id] = [];
        acc[item.user_id].push(item.role);
        return acc;
      }, {});

      const usersData: ManagedUser[] = (profileData ?? []).map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        role: getHighestRole(rolesByUser[profile.user_id] ?? []),
      }));

      const errorCount = castedLogs.filter((item) => {
        const action = item.action.toLowerCase();
        return action.includes('error') || action.includes('failed');
      }).length;

      const globalManagerChanges = castedLogs.filter((item) =>
        String(item.metadata?.actor_role ?? '').toLowerCase() === 'global_manager'
      ).length;

      const uniqueIps = new Set(castedLogs.map((item) => item.source_ip).filter(Boolean)).size;

      const modeValue = appConfigData?.find((item) => item.key === 'attendance_checkout_mode')?.value;
      const timeValue = appConfigData?.find((item) => item.key === 'attendance_auto_checkout_time')?.value;
      const minutesValue = appConfigData?.find((item) => item.key === 'attendance_geofence_exit_minutes')?.value;
      const restSeparationValue = appConfigData?.find((item) => item.key === 'rest_days_min_separation')?.value;

      if (modeValue === 'manual' || modeValue === 'schedule' || modeValue === 'geofence_exit') setCheckoutMode(modeValue);
      if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) setAutoCheckoutTime(timeValue);
      if (typeof minutesValue === 'number' && Number.isFinite(minutesValue)) setGeofenceExitMinutes(Math.max(0, Math.round(minutesValue)));
      if (typeof restSeparationValue === 'number' && Number.isFinite(restSeparationValue)) setRestDaysMinSeparation(Math.max(1, Math.round(restSeparationValue)));

      setLogs(castedLogs);
      setUsers(usersData);
      setStats({
        totalLogs: totalLogs ?? castedLogs.length,
        totalErrors: errorCount,
        totalUsers: totalUsers ?? usersData.length,
        totalGlobalManagerChanges: globalManagerChanges,
        uniqueIps,
      });
    } catch (error) {
      console.error(error);
      void logSystemError('superadmin_data_load_error', `Error al cargar panel técnico: ${error instanceof Error ? error.message : 'desconocido'}`);
      toast({ title: 'Error', description: 'No fue posible cargar el panel técnico de superadmin.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [logSystemError, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const errorLogs = useMemo(() => logs.filter((item) => item.action.toLowerCase().includes('error') || item.action.toLowerCase().includes('failed')), [logs]);
  const globalManagerLogs = useMemo(() => logs.filter((item) => String(item.metadata?.actor_role ?? '').toLowerCase() === 'global_manager'), [logs]);

  const usersById = useMemo(
    () => users.reduce<Record<string, ManagedUser>>((acc, u) => { acc[u.user_id] = u; return acc; }, {}),
    [users]
  );

  const getLogUserLabel = useCallback((userId: string | null) => {
    if (!userId) return 'N/A';
    const linkedUser = usersById[userId];
    if (!linkedUser) return userId;
    return linkedUser.full_name || linkedUser.email || userId;
  }, [usersById]);

  const sqlColumns = useMemo(() => {
    if (!sqlResult || !sqlResult.rows.length) return [];
    return Object.keys(sqlResult.rows[0]);
  }, [sqlResult]);

  const importAttendanceHistory = async (file: File) => {
    try {
      setImportingHistory(true);
      setImportSummary(null);

      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      const preparedRows = rawRows.flatMap((row) => {
        const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, val]) => {
          acc[normalizeHeader(key)] = val;
          return acc;
        }, {});

        const emailValue = String(normalized.email ?? normalized.correo ?? '').trim().toLowerCase();
        const dateValue = parseExcelDate(normalized.fecha ?? normalized.date ?? normalized.fecha_trabajo ?? normalized.work_date ?? null);

        if (!emailValue || !dateValue) return [];
        return [{ email: emailValue, date: dateValue }];
      });

      if (preparedRows.length === 0) throw new Error('No se encontraron filas válidas (requiere columnas email/correo y fecha/date)');

      const { data, error } = await supabase.functions.invoke('import-attendance-history', {
        body: { source_file_name: file.name, rows: preparedRows },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setImportSummary({ imported_marks: Number(data?.imported_marks ?? 0), missing_emails: (data?.missing_emails ?? []) as string[] });
      toast({ title: 'Histórico importado', description: `Marcajes importados: ${data?.imported_marks ?? 0}` });
      await loadData();
    } catch (error) {
      console.error(error);
      void logSystemError('import_attendance_history_error', `Error al importar histórico: ${error instanceof Error ? error.message : 'desconocido'}`, { file_name: file.name });
      toast({ title: 'Error al importar', description: 'No se pudo importar el archivo Excel histórico.', variant: 'destructive' });
    } finally {
      setImportingHistory(false);
    }
  };

  const runSqlQuery = async () => {
    try {
      setRunningSql(true);
      const statements = sqlQuery
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .filter((part) => !/^(begin|commit|rollback)$/i.test(part));

      if (statements.length === 0) {
        toast({ title: 'Sin sentencias ejecutables', description: 'Elimina BEGIN/COMMIT o agrega una consulta válida.' });
        return;
      }

      let accumulatedRows: Record<string, unknown>[] = [];
      let accumulatedCount = 0;
      let lastType: SqlConsoleResult['type'] = 'command';

      for (const statement of statements) {
        const { data, error } = await supabase.rpc('execute_superadmin_sql', { _query: statement });
        if (error) throw error;
        const result = data as SqlConsoleResult;
        lastType = result.type;
        accumulatedCount += result.row_count || 0;
        if (result.rows?.length) accumulatedRows = result.rows;
      }

      setSqlResult({ type: lastType, row_count: accumulatedCount, rows: accumulatedRows });
      toast({ title: 'Consulta ejecutada', description: `Sentencias: ${statements.length} · Filas afectadas: ${accumulatedCount}` });
    } catch (error) {
      console.error(error);
      void logSystemError('sql_console_error', `Error SQL: ${error instanceof Error ? error.message : 'desconocido'}`, { query: sqlQuery });
      toast({ title: 'Error SQL', description: 'No se pudo ejecutar la consulta. Evita comandos de transacción (BEGIN/COMMIT) y revisa sintaxis/permisos.', variant: 'destructive' });
    } finally {
      setRunningSql(false);
    }
  };

  const sendPasswordResetEmail = async (targetUserEmail: string) => {
    try {
      setAccountActionUserId(targetUserEmail);
      const redirectTo = resolveAuthRedirectUrl(window.location.origin) || `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetUserEmail, { redirectTo });
      if (error) throw error;
      toast({ title: 'Correo enviado', description: 'Se envió un enlace seguro para restablecer la contraseña al usuario.' });
    } catch (error) {
      console.error(error);
      void logSystemError('password_reset_email_error', `No se pudo enviar email de restablecimiento: ${error instanceof Error ? error.message : 'desconocido'}`, { target_email: targetUserEmail });
      toast({ title: 'Error', description: 'No se pudo enviar el email de restablecimiento.', variant: 'destructive' });
    } finally {
      setAccountActionUserId(null);
    }
  };

  const handleSaveCheckoutSettings = async () => {
    try {
      setSavingCheckoutSettings(true);
      const normalizedMinutes = Math.max(0, Math.round(geofenceExitMinutes));
      const normalizedTime = /^\d{2}:\d{2}$/.test(autoCheckoutTime) ? autoCheckoutTime : '18:30';

      const { error } = await supabase.from('app_config').upsert([
        { key: 'attendance_checkout_mode', value: checkoutMode, description: 'Modo de salida de asistencia: manual, schedule o geofence_exit' },
        { key: 'attendance_auto_checkout_time', value: normalizedTime, description: 'Hora de salida automática cuando el modo es schedule (HH:mm)' },
        { key: 'attendance_geofence_exit_minutes', value: normalizedMinutes, description: 'Minutos continuos fuera de la zona para salida automática por geofence' },
        { key: 'rest_days_min_separation', value: Math.max(1, Math.round(restDaysMinSeparation)), description: 'Separación mínima entre días de descanso (parámetro global)' },
      ], { onConflict: 'key' });

      if (error) throw error;
      setGeofenceExitMinutes(normalizedMinutes);
      setAutoCheckoutTime(normalizedTime);
      toast({ title: 'Configuración guardada', description: 'Se actualizó el modo de salida y los parámetros automáticos.' });
    } catch (error) {
      console.error(error);
      void logSystemError('checkout_settings_save_error', `No se pudo guardar configuración: ${error instanceof Error ? error.message : 'desconocido'}`, { checkout_mode: checkoutMode, auto_checkout_time: autoCheckoutTime, geofence_exit_minutes: geofenceExitMinutes, rest_days_min_separation: restDaysMinSeparation });
      toast({ title: 'Error', description: 'No se pudo guardar la configuración de salida.', variant: 'destructive' });
    } finally {
      setSavingCheckoutSettings(false);
    }
  };

  const deleteUser = async (targetUserId: string) => {
    if (targetUserId === user?.id) {
      toast({ title: 'Operación bloqueada', description: 'No puedes eliminar tu propio usuario.', variant: 'destructive' });
      return;
    }
    try {
      setAccountActionUserId(targetUserId);
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const accessToken = !refreshError && refreshed.session?.access_token
        ? refreshed.session.access_token
        : (await supabase.auth.getSession()).data.session?.access_token;

      if (!accessToken) throw new Error('Tu sesión expiró. Inicia sesión nuevamente para eliminar usuarios.');

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: targetUserId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error && String(error.message || '').toLowerCase().includes('unauthorized')) {
        const retry = await supabase.auth.refreshSession();
        const retryToken = retry.data.session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token;
        if (!retryToken) throw error;
        const retryResult = await supabase.functions.invoke('delete-user', { body: { user_id: targetUserId }, headers: { Authorization: `Bearer ${retryToken}` } });
        if (retryResult.error) throw retryResult.error;
        if (retryResult.data?.error) throw new Error(retryResult.data.error);
        toast({ title: 'Usuario eliminado', description: 'Cuenta eliminada correctamente.' });
        await loadData();
        return;
      }

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Usuario eliminado', description: 'Cuenta eliminada correctamente.' });
      await loadData();
    } catch (error) {
      console.error(error);
      void logSystemError('delete_user_error', `No se pudo eliminar usuario: ${error instanceof Error ? error.message : 'desconocido'}`, { target_user_id: targetUserId });
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario.', variant: 'destructive' });
    } finally {
      setAccountActionUserId(null);
    }
  };

  return {
    logs,
    users,
    stats,
    loading,
    accountActionUserId,
    sqlQuery,
    setSqlQuery,
    runningSql,
    sqlResult,
    sqlColumns,
    importFileName,
    setImportFileName,
    importingHistory,
    importSummary,
    checkoutMode,
    setCheckoutMode,
    autoCheckoutTime,
    setAutoCheckoutTime,
    geofenceExitMinutes,
    setGeofenceExitMinutes,
    restDaysMinSeparation,
    setRestDaysMinSeparation,
    savingCheckoutSettings,
    errorLogs,
    globalManagerLogs,
    loadData,
    importAttendanceHistory,
    runSqlQuery,
    sendPasswordResetEmail,
    handleSaveCheckoutSettings,
    deleteUser,
    getLogUserLabel,
  };
}
