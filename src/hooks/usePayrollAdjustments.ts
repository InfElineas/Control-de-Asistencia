import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { mapGenericActionError } from '@/lib/error-messages';
import { toast } from 'sonner';

export type PayrollAdjustmentCategory = 'unjustified_absence' | 'vacation' | 'other';
export type PayrollAdjustmentStatus = 'active' | 'reverted';

export interface PayrollEmployee {
  user_id: string;
  full_name: string;
  email: string;
  department_id: string;
  department_name: string;
  monthly_salary: number | null;
}

export interface PayrollAdjustment {
  id: string;
  user_id: string;
  amount: number;
  category: PayrollAdjustmentCategory;
  reason: string | null;
  status: PayrollAdjustmentStatus;
  created_at: string;
  employee_name: string;
  employee_email: string;
  department_name: string;
}

const CATEGORY_LABELS: Record<PayrollAdjustmentCategory, string> = {
  unjustified_absence: 'Ausencia no justificada',
  vacation: 'Vacaciones',
  other: 'Otro',
};

export function categoryLabel(category: PayrollAdjustmentCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function usePayrollAdjustments() {
  const { user } = useAuth();
  const { departments } = useDepartments();

  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [{ data: profiles, error: profilesError }, { data: rows, error: rowsError }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, department_id, monthly_salary').order('full_name'),
      supabase.from('payroll_adjustments').select('*').order('created_at', { ascending: false }),
    ]);

    if (profilesError || rowsError) {
      toast.error(mapGenericActionError(profilesError || rowsError, 'No se pudieron cargar los datos de nómina.'));
      setLoading(false);
      return;
    }

    const profileById = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

    setEmployees(
      (profiles || []).map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        department_id: profile.department_id,
        department_name: departments.find((d) => d.id === profile.department_id)?.name || 'Sin departamento',
        monthly_salary: profile.monthly_salary,
      }))
    );

    setAdjustments(
      (rows || []).map((row) => {
        const profile = profileById.get(row.user_id);
        return {
          id: row.id,
          user_id: row.user_id,
          amount: row.amount,
          category: row.category as PayrollAdjustmentCategory,
          reason: row.reason,
          status: row.status as PayrollAdjustmentStatus,
          created_at: row.created_at,
          employee_name: profile?.full_name || 'Desconocido',
          employee_email: profile?.email || '',
          department_name: departments.find((d) => d.id === profile?.department_id)?.name || 'Sin departamento',
        };
      })
    );

    setLoading(false);
  }, [departments]);

  useEffect(() => {
    if (departments.length > 0) loadData();
  }, [departments, loadData]);

  const totalsByEmployee = useMemo(() => {
    const totals = new Map<string, number>();
    adjustments
      .filter((item) => item.status === 'active')
      .forEach((item) => totals.set(item.user_id, (totals.get(item.user_id) || 0) + item.amount));
    return totals;
  }, [adjustments]);

  const updateMonthlySalary = useCallback(async (userId: string, monthlySalary: number | null) => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ monthly_salary: monthlySalary }).eq('user_id', userId);
    setSaving(false);

    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudo actualizar el sueldo mensual.'));
      return { error: mapGenericActionError(error, 'No se pudo actualizar el sueldo mensual.') };
    }

    await loadData();
    toast.success('Sueldo mensual actualizado.');
    return { error: null };
  }, [loadData]);

  const createManualAdjustment = useCallback(async (
    userId: string,
    amount: number,
    category: Extract<PayrollAdjustmentCategory, 'vacation' | 'other'>,
    reason: string,
  ) => {
    setSaving(true);
    const { error } = await supabase.from('payroll_adjustments').insert({
      user_id: userId,
      amount,
      category,
      reason: reason || null,
      created_by: user?.id,
    });
    setSaving(false);

    if (error) {
      const message = mapGenericActionError(error, 'No se pudo registrar el ajuste.');
      toast.error(message);
      return { error: message };
    }

    await loadData();
    toast.success('Ajuste registrado.');
    return { error: null };
  }, [loadData, user?.id]);

  const revertAdjustment = useCallback(async (adjustmentId: string) => {
    const { error } = await supabase
      .from('payroll_adjustments')
      .update({ status: 'reverted', reverted_by: user?.id, reverted_at: new Date().toISOString() })
      .eq('id', adjustmentId);

    if (error) {
      toast.error(mapGenericActionError(error, 'No se pudo revertir el ajuste.'));
      return;
    }

    await loadData();
    toast.success('Ajuste revertido.');
  }, [loadData, user?.id]);

  return {
    employees,
    adjustments,
    totalsByEmployee,
    loading,
    saving,
    updateMonthlySalary,
    createManualAdjustment,
    revertAdjustment,
  };
}
