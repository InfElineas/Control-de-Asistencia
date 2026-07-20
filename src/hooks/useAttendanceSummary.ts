import { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { calculateLateMinutes } from '@/lib/attendance-metrics';
import { exportAttendanceMatrixXLSX, type AttendanceReportRow } from '@/lib/xlsx-export';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  department_id: string;
  department_name: string;
  department_paused: boolean;
  last_connection_at: string | null;
}

interface ProfileWithDepartment {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  last_connection_at: string | null;
  department_id: string;
  departments: { name: string; is_paused: boolean } | null;
}

export interface AbsenceReview {
  is_justified: boolean;
  notes: string | null;
}

export interface AttendanceSummary {
  userId: string;
  employeeName: string;
  email: string;
  phone: string | null;
  last_connection_at: string | null;
  role: string;
  departmentId: string;
  department: string;
  todayStatus: 'PRESENTE' | 'TARDE' | 'AUSENTE' | 'DESCANSO' | 'NO_LABORABLE' | null;
  inTime: string | null;
  outTime: string | null;
  lateMinutes: number;
  insideGeofence: boolean | null;
  distance: number | null;
  absenceReview: AbsenceReview | null;
}

export interface EmployeeDetails {
  monthPresentDays: number;
  monthLateCheckins: number;
  monthOutsideGeofence: number;
  monthWorkedHours: number;
  monthInMarks: number;
  lastActivityAt: string | null;
  vacation: {
    availableDays: number;
    earnedDays: number;
    approvedDays: number;
    pendingDays: number;
    workedDays: number;
  };
}

interface AttendanceMonthlyRpcRow {
  date: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  status: string | null;
  in_timestamp: string | null;
  out_timestamp: string | null;
  lateness_minutes: number | null;
  absence_justification: string | null;
  inside_geofence: boolean | null;
  distance_m: number | null;
}

export const ATTENDANCE_PAGE_SIZE = 10;

export { es };

export function useAttendanceSummary() {
  const { departments } = useDepartments();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [includeHeadsInGlobalReports, setIncludeHeadsInGlobalReports] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'include_heads_in_global_reports')
      .maybeSingle();

    const includeHeads = configData?.value === true;
    setIncludeHeadsInGlobalReports(includeHeads);

    const { data: profilesData } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        last_connection_at,
        department_id,
        departments(name, is_paused)
      `)
      .eq('is_active', true);

    const { data: schedulesData } = await supabase
      .from('department_schedules')
      .select('department_id, checkin_end_time, timezone');

    const scheduleMap = new Map(
      (schedulesData || []).map((item) => [
        item.department_id,
        { checkin_end_time: item.checkin_end_time, timezone: item.timezone },
      ])
    );

    if (profilesData) {
      const rolesToExclude: AppRole[] = includeHeads
        ? ['global_manager', 'superadmin']
        : ['department_head', 'global_manager', 'superadmin'];

      const { data: excludedRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', rolesToExclude);

      const { data: allRoles } = await supabase.from('user_roles').select('user_id, role');

      const excludedUserIds = new Set(excludedRoles?.map((r) => r.user_id) || []);
      const roleMap = new Map((allRoles || []).map((r) => [r.user_id, r.role]));

      const typedProfiles = (profilesData || []) as ProfileWithDepartment[];

      const filteredEmployees = typedProfiles
        .filter((p) => !excludedUserIds.has(p.user_id))
        .map((p) => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          last_connection_at: p.last_connection_at,
          role: roleMap.get(p.user_id) || 'employee',
          department_id: p.department_id,
          department_name: p.departments?.name || 'Sin departamento',
          department_paused: p.departments?.is_paused ?? false,
        }));

      setEmployees(filteredEmployees);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const summaries: AttendanceSummary[] = [];
      const todayDate = format(today, 'yyyy-MM-dd');
      const employeeIds = filteredEmployees.map((emp) => emp.user_id);

      const [{ data: absenceReviews }, { data: allTodayMarks }] = await Promise.all([
        supabase
          .from('attendance_absence_reviews')
          .select('user_id, is_justified, notes')
          .eq('date', todayDate)
          .in('user_id', employeeIds),
        supabase
          .from('attendance_marks')
          .select('*')
          .gte('timestamp', today.toISOString())
          .in('user_id', employeeIds)
          .order('timestamp', { ascending: true }),
      ]);

      const reviewMap = new Map(
        (absenceReviews || []).map((review) => [
          review.user_id,
          { is_justified: review.is_justified, notes: review.notes },
        ])
      );

      const marksByUser = new Map<
        string,
        Array<{ mark_type: string; timestamp: string; inside_geofence: boolean | null; distance_to_center: number | null }>
      >();

      (allTodayMarks || []).forEach((mark) => {
        const existing = marksByUser.get(mark.user_id) || [];
        existing.push(mark);
        marksByUser.set(mark.user_id, existing);
      });

      for (const emp of filteredEmployees) {
        const marks = marksByUser.get(emp.user_id) || [];
        const inMark = marks.find((m) => m.mark_type === 'IN');
        const outMark = marks.filter((m) => m.mark_type === 'OUT').pop();

        const schedule = scheduleMap.get(emp.department_id);
        const lateMinutes = inMark
          ? calculateLateMinutes(inMark.timestamp, schedule?.checkin_end_time ?? null, schedule?.timezone ?? null)
          : 0;

        summaries.push({
          userId: emp.user_id,
          employeeName: emp.full_name,
          email: emp.email,
          phone: emp.phone,
          last_connection_at: emp.last_connection_at,
          role: emp.role,
          departmentId: emp.department_id,
          department: emp.department_name,
          todayStatus: emp.department_paused
            ? 'NO_LABORABLE'
            : inMark
            ? lateMinutes > 0
              ? 'TARDE'
              : 'PRESENTE'
            : 'AUSENTE',
          inTime: inMark?.timestamp || null,
          outTime: outMark?.timestamp || null,
          lateMinutes,
          insideGeofence: inMark?.inside_geofence ?? null,
          distance: inMark?.distance_to_center ?? null,
          absenceReview: reviewMap.get(emp.user_id) ?? null,
        });
      }

      setAttendance(summaries);
    }

    setLoading(false);
  };

  const handleExport = async (selectedDepartment: { id: string; name: string } | null) => {
    setExporting(true);

    try {
      const departmentId = selectedDepartment?.id ?? null;
      const reportScope = departmentId ? 'department' : 'global';

      const { data: reportData, error: reportError } = await supabase.rpc('get_attendance_report_monthly', {
        _from: dateRange.from,
        _to: dateRange.to,
        _department_id: departmentId ?? undefined,
        _scope: reportScope,
        _include_heads: includeHeadsInGlobalReports,
      });

      if (reportError) throw reportError;

      const rows = (reportData || []) as AttendanceMonthlyRpcRow[];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

      const { data: vacationsData, error: vacationsError } = await supabase
        .from('vacation_requests')
        .select('user_id, start_date, end_date, status')
        .in('user_id', userIds)
        .eq('status', 'approved')
        .lte('start_date', dateRange.to)
        .gte('end_date', dateRange.from);

      if (vacationsError) throw vacationsError;

      const vacationsByUser = new Map<string, Array<{ start_date: string; end_date: string }>>();
      (vacationsData || []).forEach((item) => {
        const existing = vacationsByUser.get(item.user_id) || [];
        existing.push({ start_date: item.start_date, end_date: item.end_date });
        vacationsByUser.set(item.user_id, existing);
      });

      exportAttendanceMatrixXLSX(
        rows.map((row) => ({
          date: row.date,
          user_id: row.user_id,
          employee_name: row.employee_name,
          employee_email: row.employee_email,
          department: row.department,
          status: row.status as AttendanceReportRow['status'],
          in_time: row.in_timestamp,
          out_time: row.out_timestamp,
          lateness_minutes: row.lateness_minutes,
          inside_geofence: row.inside_geofence,
          distance_m: row.distance_m,
          absence_justification: row.absence_justification as AttendanceReportRow['absence_justification'],
          vacation_status: (vacationsByUser.get(row.user_id) || []).some(
            (vacation) => row.date >= vacation.start_date && row.date <= vacation.end_date
          )
            ? 'VACACIONES'
            : '-',
        })),
        selectedDepartment
          ? `reporte-${selectedDepartment.name}-${dateRange.from}-${dateRange.to}`
          : `reporte-global-${dateRange.from}-${dateRange.to}`,
        { from: dateRange.from, to: dateRange.to }
      );

      toast.success(
        selectedDepartment
          ? `Reporte XLSX de ${selectedDepartment.name} generado (${rows.length} filas).`
          : `Reporte XLSX global generado (${rows.length} filas).`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al generar reporte XLSX';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleSendToGoogleSheet = async (selectedDepartment: { id: string; name: string } | null) => {
    setSendingToSheet(true);

    try {
      const departmentId = selectedDepartment?.id ?? null;
      const reportScope = departmentId ? 'department' : 'global';

      const { data, error } = await supabase.functions.invoke('export-report-to-sheet', {
        body: {
          from: dateRange.from,
          to: dateRange.to,
          scope: reportScope,
          department_id: departmentId,
          include_heads: includeHeadsInGlobalReports,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        selectedDepartment
          ? `Reporte de ${selectedDepartment.name} enviado a Google Sheets (${data.row_count} filas).`
          : `Reporte global enviado a Google Sheets (${data.row_count} filas).`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al enviar el reporte a Google Sheets';
      toast.error(message);
    } finally {
      setSendingToSheet(false);
    }
  };

  const openEmployeeDetails = async (employeeId: string) => {
    const employee = employees.find((item) => item.user_id === employeeId);
    if (!employee) return;

    setSelectedEmployee(employee);
    setEmployeeDetails(null);
    setDetailsOpen(true);
    setDetailsLoading(true);

    try {
      const monthStart = startOfMonth(new Date());

      const [{ data: monthMarks, error: marksError }, { data: lastMark, error: lastError }, { data: vacationData, error: vacationError }] =
        await Promise.all([
          supabase
            .from('attendance_marks')
            .select('mark_type, timestamp, inside_geofence, block_reason')
            .eq('user_id', employeeId)
            .gte('timestamp', monthStart.toISOString())
            .order('timestamp', { ascending: true }),
          supabase
            .from('attendance_marks')
            .select('timestamp')
            .eq('user_id', employeeId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.rpc('get_vacation_balance', { _user_id: employeeId, _year: new Date().getFullYear() }),
        ]);

      if (marksError) throw marksError;
      if (lastError) throw lastError;
      if (vacationError) throw vacationError;

      const marks = monthMarks || [];
      const uniqueInDays = new Set(
        marks.filter((mark) => mark.mark_type === 'IN').map((mark) => mark.timestamp.split('T')[0])
      );

      const lateCheckins = marks.filter((mark) => mark.mark_type === 'IN' && mark.block_reason === 'LATE_CHECKIN').length;
      const outsideGeofenceCount = marks.filter((mark) => mark.mark_type === 'IN' && !mark.inside_geofence).length;

      const workedHours = marks.reduce((total, mark, index) => {
        if (mark.mark_type !== 'IN') return total;
        const outMark = marks.slice(index + 1).find((candidate) => candidate.mark_type === 'OUT');
        if (!outMark) return total;
        const diffMs = new Date(outMark.timestamp).getTime() - new Date(mark.timestamp).getTime();
        return diffMs > 0 ? total + diffMs / (1000 * 60 * 60) : total;
      }, 0);

      const vacation = vacationData?.[0];

      setEmployeeDetails({
        monthPresentDays: uniqueInDays.size,
        monthLateCheckins: lateCheckins,
        monthOutsideGeofence: outsideGeofenceCount,
        monthWorkedHours: workedHours,
        monthInMarks: marks.filter((mark) => mark.mark_type === 'IN').length,
        lastActivityAt: lastMark?.timestamp || null,
        vacation: {
          availableDays: vacation?.available_days ?? 0,
          earnedDays: vacation?.earned_days ?? 0,
          approvedDays: vacation?.approved_days ?? 0,
          pendingDays: vacation?.pending_days ?? 0,
          workedDays: vacation?.worked_days ?? 0,
        },
      });
    } catch {
      toast.error('No se pudieron cargar los detalles del trabajador');
    }

    setDetailsLoading(false);
  };

  const handleSetAbsenceReview = async (targetUserId: string, isJustified: boolean) => {
    try {
      setReviewingUserId(targetUserId);
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const { data: sessionData } = await supabase.auth.getUser();
      const reviewerId = sessionData.user?.id;

      if (!reviewerId) {
        toast.error('No se pudo identificar al gestor que revisa.');
        return;
      }

      const { error } = await supabase
        .from('attendance_absence_reviews')
        .upsert(
          {
            user_id: targetUserId,
            date: todayDate,
            is_justified: isJustified,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;

      setAttendance((prev) =>
        prev.map((row) =>
          row.userId === targetUserId ? { ...row, absenceReview: { is_justified: isJustified, notes: null } } : row
        )
      );

      toast.success(`Ausencia marcada como ${isJustified ? 'justificada' : 'no justificada'}.`);
    } catch {
      toast.error('No se pudo actualizar la justificación de ausencia.');
    } finally {
      setReviewingUserId(null);
    }
  };

  // Derived state
  const selectedDepartment = useMemo(
    () => (selectedDeptId === 'all' ? null : departments.find((dept) => dept.id === selectedDeptId) ?? null),
    [selectedDeptId, departments]
  );

  const scopedAttendance = useMemo(
    () => (selectedDeptId === 'all' ? attendance : attendance.filter((row) => row.departmentId === selectedDeptId)),
    [attendance, selectedDeptId]
  );

  const departmentHeadcount = useMemo(() => {
    type DepartmentSummary = { department: string; total: number; ok: number; late: number; rest: number; absent: number };
    const map = new Map<string, DepartmentSummary>();

    scopedAttendance.forEach((row) => {
      if (!map.has(row.department)) {
        map.set(row.department, { department: row.department, total: 0, ok: 0, late: 0, rest: 0, absent: 0 });
      }
      const current = map.get(row.department)!;
      current.total += 1;
      if (row.todayStatus === 'PRESENTE') current.ok += 1;
      else if (row.todayStatus === 'TARDE') current.late += 1;
      else if (row.todayStatus === 'DESCANSO' || row.todayStatus === 'NO_LABORABLE') current.rest += 1;
      else if (row.todayStatus === 'AUSENTE') current.absent += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [scopedAttendance]);

  const metrics = useMemo(
    () => ({
      total: scopedAttendance.length,
      present: scopedAttendance.filter((a) => a.todayStatus === 'PRESENTE' || a.todayStatus === 'TARDE').length,
      absent: scopedAttendance.filter((a) => a.todayStatus === 'AUSENTE').length,
      late: scopedAttendance.filter((a) => a.todayStatus === 'TARDE').length,
      compliance:
        scopedAttendance.length > 0
          ? Math.round(
              (scopedAttendance.filter((a) => a.todayStatus === 'PRESENTE' || a.todayStatus === 'TARDE').length /
                scopedAttendance.length) *
                100
            )
          : 0,
    }),
    [scopedAttendance]
  );

  const filteredAttendance = useMemo(
    () =>
      attendance.filter((a) => {
        const matchesSearch =
          a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase());
        const matchesDept = selectedDeptId === 'all' || a.departmentId === selectedDeptId;
        return matchesSearch && matchesDept;
      }),
    [attendance, search, selectedDeptId]
  );

  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / ATTENDANCE_PAGE_SIZE));

  const paginatedAttendance = useMemo(() => {
    const start = (currentPage - 1) * ATTENDANCE_PAGE_SIZE;
    return filteredAttendance.slice(start, start + ATTENDANCE_PAGE_SIZE);
  }, [currentPage, filteredAttendance]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDeptId]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return {
    departments,
    employees,
    attendance,
    loading,
    exporting,
    sendingToSheet,
    search,
    setSearch,
    selectedDeptId,
    setSelectedDeptId,
    currentPage,
    setCurrentPage,
    dateRange,
    setDateRange,
    includeHeadsInGlobalReports,
    detailsOpen,
    setDetailsOpen,
    detailsLoading,
    selectedEmployee,
    employeeDetails,
    reviewingUserId,
    selectedDepartment,
    scopedAttendance,
    departmentHeadcount,
    metrics,
    filteredAttendance,
    totalPages,
    paginatedAttendance,
    fetchData,
    handleExport,
    handleSendToGoogleSheet,
    openEmployeeDetails,
    handleSetAbsenceReview,
  };
}
