import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapUserManagementError } from '@/lib/error-messages';
import { getHighestRole } from '@/lib/roles';
import { z } from 'zod';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  department_id: string;
  department_name?: string;
  role: AppRole;
  managed_department_ids: string[];
  managed_department_names: string[];
  last_connection_at: string | null;
  is_active: boolean;
  deactivation_reason: string | null;
  contract_cancelled_at: string | null;
  deactivated_at: string | null;
}

export const USERS_PAGE_SIZE = 10;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nombre requerido'),
  department_id: z.string().min(1, 'Selecciona un departamento'),
  role: z.enum(['employee', 'department_head', 'global_manager', 'superadmin']),
});

interface FunctionErrorPayload {
  error?: string;
  message?: string;
}

function hasFunctionContext(error: unknown): error is { context: Response } {
  return typeof error === 'object' && error !== null && 'context' in error;
}

async function resolveFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (!hasFunctionContext(error)) return null;
  try {
    const payload = (await error.context.clone().json()) as FunctionErrorPayload;
    return payload.error || payload.message || null;
  } catch {
    return null;
  }
}

async function getFreshAccessToken(): Promise<string | null> {
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token ?? null;
}

export function useUserManagement() {
  const { role, user: currentUser } = useAuth();
  const { departments } = useDepartments();
  const { toast } = useToast();

  const canDeleteUsers = role === 'superadmin';

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedManagedDepartments, setSelectedManagedDepartments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | 'all'>('active');

  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('employee');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete state
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Deactivate state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<UserWithRole | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [contractCancelledAt, setContractCancelledAt] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const filteredUsers = users.filter((user) => {
    const matchesDepartment = filterDepartment === 'all' || user.department_id === filterDepartment;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? user.is_active : !user.is_active);
    return matchesDepartment && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');

      if (rolesError) throw rolesError;

      const { data: managedDepartmentsData, error: managedDepartmentsError } = await supabase
        .from('user_department_responsibilities')
        .select('user_id, department_id');

      if (managedDepartmentsError) throw managedDepartmentsError;

      const rolesByUser = (roles ?? []).reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.user_id]) acc[row.user_id] = [];
        acc[row.user_id].push(row.role);
        return acc;
      }, {});

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const dept = departments.find((d) => d.id === profile.department_id);
        const roleForUser = getHighestRole(rolesByUser[profile.user_id] ?? []);
        const extraDepartmentIds = (managedDepartmentsData || [])
          .filter((row) => row.user_id === profile.user_id)
          .map((row) => row.department_id)
          .filter((departmentId) => departmentId !== profile.department_id);

        const managedDepartmentIds = Array.from(new Set([profile.department_id, ...extraDepartmentIds]));
        const managedDepartmentNames = managedDepartmentIds
          .map((departmentId) => departments.find((department) => department.id === departmentId)?.name)
          .filter((name): name is string => Boolean(name));

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          department_id: profile.department_id,
          department_name: dept?.name || 'Sin departamento',
          role: roleForUser as AppRole,
          managed_department_ids: managedDepartmentIds,
          managed_department_names: managedDepartmentNames,
          last_connection_at: profile.last_connection_at,
          is_active: profile.is_active ?? true,
          deactivation_reason: profile.deactivation_reason ?? null,
          contract_cancelled_at: profile.contract_cancelled_at ?? null,
          deactivated_at: profile.deactivated_at ?? null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: unknown) {
      toast({ title: 'Error', description: mapUserManagementError(error, 'fetch'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [departments, toast]);

  useEffect(() => {
    if (departments.length > 0) fetchUsers();
  }, [departments, fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterRole, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedDepartment(user.department_id);
    setSelectedManagedDepartments(user.managed_department_ids);
    setDialogOpen(true);
  };

  const toggleManagedDepartment = (departmentId: string, checked: boolean) => {
    setSelectedManagedDepartments((current) => {
      if (checked) return Array.from(new Set([...current, departmentId]));
      return current.filter((item) => item !== departmentId);
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ department_id: selectedDepartment })
        .eq('user_id', editingUser.user_id);

      if (profileError) throw profileError;

      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.user_id);

      if (deleteRolesError) throw deleteRolesError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.user_id, role: selectedRole });

      if (insertError) throw insertError;

      const { error: deleteResponsibilitiesError } = await supabase
        .from('user_department_responsibilities')
        .delete()
        .eq('user_id', editingUser.user_id);

      if (deleteResponsibilitiesError) throw deleteResponsibilitiesError;

      if (selectedRole === 'department_head') {
        const extraDepartments = selectedManagedDepartments.filter(
          (departmentId) => departmentId !== selectedDepartment
        );

        if (extraDepartments.length > 0) {
          const { error: insertResponsibilitiesError } = await supabase
            .from('user_department_responsibilities')
            .insert(
              extraDepartments.map((departmentId) => ({
                user_id: editingUser.user_id,
                department_id: departmentId,
                created_by: currentUser?.id ?? null,
              }))
            );

          if (insertResponsibilitiesError) throw insertResponsibilitiesError;
        }
      }

      await supabase.from('audit_log').insert({
        user_id: currentUser?.id ?? null,
        action: 'role_changed',
        description: `Rol actualizado para ${editingUser.email}`,
        metadata: { actor_role: role ?? 'unknown' },
        table_name: 'user_roles',
        record_id: editingUser.user_id,
        old_data: { role: editingUser.role, department_id: editingUser.department_id, managed_department_ids: editingUser.managed_department_ids },
        new_data: { role: selectedRole, department_id: selectedDepartment, managed_department_ids: selectedManagedDepartments },
      });

      toast({ title: 'Usuario actualizado', description: `El usuario ${editingUser.full_name} ha sido actualizado correctamente.` });
      setDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast({ title: 'Error', description: mapUserManagementError(error, 'update'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setCreateError('');

    const validation = createUserSchema.safeParse({
      email: newUserEmail,
      password: newUserPassword,
      full_name: newUserName,
      department_id: newUserDepartment,
      role: newUserRole,
    });

    if (!validation.success) {
      setCreateError(validation.error.errors[0].message);
      return;
    }

    try {
      setCreating(true);

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newUserEmail, password: newUserPassword, full_name: newUserName, department_id: newUserDepartment, role: newUserRole },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Usuario creado', description: `El usuario ${newUserName} ha sido creado correctamente.` });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserDepartment('');
      setNewUserRole('employee');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      setCreateError(mapUserManagementError(error, 'create'));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDeleteDialog = (targetUser: UserWithRole) => {
    setDeletingUser(targetUser);
    setDeleteDialogOpen(true);
  };

  const handleOpenDeactivateDialog = (targetUser: UserWithRole) => {
    setDeactivatingUser(targetUser);
    setDeactivationReason('');
    setContractCancelledAt('');
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    if (!deactivationReason.trim()) {
      toast({ title: 'Motivo requerido', description: 'Debes indicar el motivo de baja del trabajador.', variant: 'destructive' });
      return;
    }
    if (!contractCancelledAt) {
      toast({ title: 'Fecha requerida', description: 'Debes indicar la fecha de cancelación de contrato.', variant: 'destructive' });
      return;
    }

    try {
      setDeactivating(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          deactivation_reason: deactivationReason.trim(),
          contract_cancelled_at: contractCancelledAt,
          deactivated_at: new Date().toISOString(),
          deactivated_by: currentUser?.id ?? null,
        })
        .eq('user_id', deactivatingUser.user_id);

      if (error) throw error;

      toast({ title: 'Trabajador dado de baja', description: `${deactivatingUser.full_name} fue movido a la papelera de reciclaje.` });
      setDeactivateDialogOpen(false);
      setDeactivatingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast({ title: 'Error', description: mapUserManagementError(error, 'update'), variant: 'destructive' });
    } finally {
      setDeactivating(false);
    }
  };

  const handleRestoreUser = async (targetUser: UserWithRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, deactivation_reason: null, contract_cancelled_at: null, deactivated_at: null, deactivated_by: null })
        .eq('user_id', targetUser.user_id);

      if (error) throw error;

      toast({ title: 'Usuario restaurado', description: `${targetUser.full_name} vuelve a estar activo.` });
      fetchUsers();
    } catch (error: unknown) {
      toast({ title: 'Error', description: mapUserManagementError(error, 'update'), variant: 'destructive' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !canDeleteUsers) return;

    try {
      setDeleting(true);

      const accessToken = await getFreshAccessToken();

      if (!accessToken) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente para eliminar usuarios.');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deletingUser.user_id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error && String(error.message || '').toLowerCase().includes('unauthorized')) {
        const retryToken = await getFreshAccessToken();
        if (!retryToken) throw error;

        const retryResult = await supabase.functions.invoke('delete-user', {
          body: { user_id: deletingUser.user_id },
          headers: { Authorization: `Bearer ${retryToken}` },
        });

        if (retryResult.error) throw retryResult.error;
        if (retryResult.data?.error) throw new Error(retryResult.data.error);

        toast({ title: 'Usuario eliminado', description: `El usuario ${deletingUser.full_name} fue eliminado correctamente.` });
        setDeleteDialogOpen(false);
        setDeletingUser(null);
        fetchUsers();
        return;
      }

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Usuario eliminado', description: `El usuario ${deletingUser.full_name} fue eliminado correctamente.` });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      const detailedMessage = await resolveFunctionErrorMessage(error);
      toast({ title: 'Error', description: detailedMessage || mapUserManagementError(error, 'delete'), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return {
    // auth
    role,
    canDeleteUsers,
    currentUser,
    departments,
    // data
    users,
    loading,
    filteredUsers,
    paginatedUsers,
    totalPages,
    // edit
    editingUser,
    dialogOpen,
    setDialogOpen,
    selectedRole,
    setSelectedRole,
    selectedDepartment,
    setSelectedDepartment,
    selectedManagedDepartments,
    setSelectedManagedDepartments,
    saving,
    // create
    createDialogOpen,
    setCreateDialogOpen,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    newUserName,
    setNewUserName,
    newUserDepartment,
    setNewUserDepartment,
    newUserRole,
    setNewUserRole,
    creating,
    createError,
    // delete
    deletingUser,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleting,
    // deactivate
    deactivateDialogOpen,
    setDeactivateDialogOpen,
    deactivatingUser,
    deactivationReason,
    setDeactivationReason,
    contractCancelledAt,
    setContractCancelledAt,
    deactivating,
    // filters
    filterDepartment,
    setFilterDepartment,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    // handlers
    fetchUsers,
    handleEditUser,
    toggleManagedDepartment,
    handleSaveUser,
    handleCreateUser,
    handleOpenDeleteDialog,
    handleOpenDeactivateDialog,
    handleDeleteUser,
    handleDeactivateUser,
    handleRestoreUser,
  };
}
