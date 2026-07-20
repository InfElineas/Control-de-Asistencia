import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mapGenericActionError } from '@/lib/error-messages';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type AttendanceImportSummary = {
  imported_marks: number;
  missing_emails: string[];
};

export type GeneralConfig = {
  includeHeadsInGlobalReports: boolean;
  lateToleranceMinutes: number;
  vacationDaysPerWorkedDay: number;
  globalTimezone: string;
  restDaysMinSeparation: number;
  googleSheetsSpreadsheetId: string;
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

export function useGeneralConfig() {
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    includeHeadsInGlobalReports: false,
    lateToleranceMinutes: 15,
    vacationDaysPerWorkedDay: 0.0833333333,
    globalTimezone: 'America/Lima',
    restDaysMinSeparation: 4,
    googleSheetsSpreadsheetId: '',
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [restSeparationDepartmentIds, setRestSeparationDepartmentIds] = useState<string[]>([]);
  const [importingHistory, setImportingHistory] = useState(false);
  const [importSummary, setImportSummary] = useState<AttendanceImportSummary | null>(null);

  useEffect(() => {
    const fetchGeneralConfig = async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
          'include_heads_in_global_reports',
          'late_tolerance_minutes',
          'vacation_days_per_worked_day',
          'global_timezone',
          'rest_days_min_separation',
          'rest_days_min_separation_departments',
          'google_sheets_report_spreadsheet_id',
        ]);

      if (error) {
        toast.error(mapGenericActionError(error, 'No se pudo cargar la configuración general.'));
        return;
      }

      const find = (key: string) => data?.find((item) => item.key === key)?.value;

      const includeHeads = find('include_heads_in_global_reports');
      const lateTolerance = find('late_tolerance_minutes');
      const vacationRate = find('vacation_days_per_worked_day');
      const globalTimezone = find('global_timezone');
      const restDaysMinSeparation = find('rest_days_min_separation');
      const restDaysMinSeparationDepartments = find('rest_days_min_separation_departments');
      const googleSheetsSpreadsheetId = find('google_sheets_report_spreadsheet_id');

      setGeneralConfig({
        includeHeadsInGlobalReports: typeof includeHeads === 'boolean' ? includeHeads : false,
        lateToleranceMinutes: typeof lateTolerance === 'number' ? lateTolerance : 15,
        vacationDaysPerWorkedDay: typeof vacationRate === 'number' ? vacationRate : 0.0833333333,
        globalTimezone: typeof globalTimezone === 'string' ? globalTimezone : 'America/Lima',
        restDaysMinSeparation: typeof restDaysMinSeparation === 'number' ? restDaysMinSeparation : 4,
        googleSheetsSpreadsheetId: typeof googleSheetsSpreadsheetId === 'string' ? googleSheetsSpreadsheetId : '',
      });

      if (Array.isArray(restDaysMinSeparationDepartments)) {
        setRestSeparationDepartmentIds(
          restDaysMinSeparationDepartments.filter((value): value is string => typeof value === 'string')
        );
      } else {
        setRestSeparationDepartmentIds([]);
      }
    };

    void fetchGeneralConfig();
  }, []);

  const toggleRestSeparationDepartment = (departmentId: string, checked: boolean) => {
    setRestSeparationDepartmentIds((current) => {
      if (checked) return Array.from(new Set([...current, departmentId]));
      return current.filter((id) => id !== departmentId);
    });
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const updates = [
        supabase.from('app_config').update({ value: generalConfig.includeHeadsInGlobalReports }).eq('key', 'include_heads_in_global_reports'),
        supabase.from('app_config').update({ value: generalConfig.lateToleranceMinutes }).eq('key', 'late_tolerance_minutes'),
        supabase.from('app_config').update({ value: generalConfig.vacationDaysPerWorkedDay }).eq('key', 'vacation_days_per_worked_day'),
        supabase.from('app_config').update({ value: generalConfig.globalTimezone }).eq('key', 'global_timezone'),
        supabase.from('app_config').update({ value: Math.max(1, Math.round(generalConfig.restDaysMinSeparation)) }).eq('key', 'rest_days_min_separation'),
        supabase.from('app_config').upsert({ key: 'rest_days_min_separation_departments', value: restSeparationDepartmentIds, description: 'Departamentos donde aplica la separación mínima de descansos. Vacío = todos.' }, { onConflict: 'key' }),
        supabase.from('app_config').update({ value: generalConfig.googleSheetsSpreadsheetId.trim() }).eq('key', 'google_sheets_report_spreadsheet_id'),
      ];

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);

      if (failed?.error) {
        toast.error(mapGenericActionError(failed.error, 'No se pudo guardar la configuración general.'));
        return;
      }

      const { error: scheduleTimezoneError } = await supabase
        .from('department_schedules')
        .update({ timezone: generalConfig.globalTimezone })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (scheduleTimezoneError) {
        toast.error(mapGenericActionError(scheduleTimezoneError, 'Se guardó la zona horaria global pero no se pudo sincronizar en los departamentos.'));
        return;
      }

      toast.success('Configuración general guardada correctamente');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleImportAttendanceHistory = async (file: File) => {
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

      if (preparedRows.length === 0) throw new Error('No se encontraron filas válidas (requiere email/correo y fecha/date)');

      const { data, error } = await supabase.functions.invoke('import-attendance-history', {
        body: { source_file_name: file.name, rows: preparedRows },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const missingEmails = Array.isArray(data?.missing_emails)
        ? data.missing_emails.map((item: unknown) => String(item))
        : [];

      setImportSummary({ imported_marks: Number(data?.imported_marks ?? 0), missing_emails: missingEmails });
      toast.success(`Histórico importado. Marcajes agregados: ${Number(data?.imported_marks ?? 0)}`);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo importar el histórico. Verifica formato y permisos.');
    } finally {
      setImportingHistory(false);
    }
  };

  return {
    generalConfig,
    setGeneralConfig,
    savingGeneral,
    restSeparationDepartmentIds,
    importingHistory,
    importSummary,
    toggleRestSeparationDepartment,
    handleSaveGeneral,
    handleImportAttendanceHistory,
  };
}
