import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDepartments } from '@/hooks/useDepartments';
import { Loader2, UserPlus, Shield, Users, Edit } from 'lucide-react';
import { z } from 'zod';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  department_id: string;
  department_name?: string;
  role: AppRole;
}

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nombre requerido'),
  department_id: z.string().min(1, 'Selecciona un departamento'),
  role: z.enum(['employee', 'department_head', 'global_manager']),
});

export default function UserManagement() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { departments } = useDepartments();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('employee');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (departments.length > 0) {
      fetchUsers();
    }
  }, [departments]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const dept = departments.find(d => d.id === profile.department_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          department_id: profile.department_id,
          department_name: dept?.name || 'Sin departamento',
          role: (userRole?.role as AppRole) || 'employee',
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedDepartment(user.department_id);
    setDialogOpen(true);
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

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', editingUser.user_id)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id);
      }

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.user_id, role: selectedRole });

      if (insertError) throw insertError;

      await supabase.from('audit_log').insert({
        user_id: editingUser.user_id,
        action: 'role_changed',
        table_name: 'user_roles',
        record_id: editingUser.user_id,
        old_data: { role: editingUser.role, department_id: editingUser.department_id },
        new_data: { role: selectedRole, department_id: selectedDepartment },
      });

      toast({
        title: 'Usuario actualizado',
        description: `El usuario ${editingUser.full_name} ha sido actualizado correctamente.`,
      });

      setDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
        body: {
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserName,
          department_id: newUserDepartment,
          role: newUserRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Usuario creado',
        description: `El usuario ${newUserName} ha sido creado correctamente.`,
      });

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserDepartment('');
      setNewUserRole('employee');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      setCreateError(error.message || 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (userRole: AppRole) => {
    const variants: Record<AppRole, { label: string; className: string }> = {
      employee: { label: 'Empleado', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      department_head: { label: 'Jefe Depto.', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
      global_manager: { label: 'Gestor Global', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
    };
    return (
      <Badge className={variants[userRole].className}>
        {variants[userRole].label}
      </Badge>
    );
  };

  if (role !== 'global_manager') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jefes de Depto.</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'department_head').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestores Globales</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'global_manager').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Sistema</CardTitle>
            <CardDescription>
              Haz clic en un usuario para editar su rol y departamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay usuarios registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department_name}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Modifica el rol y departamento del usuario
              </DialogDescription>
            </DialogHeader>
            
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={editingUser.full_name} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingUser.email} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona departamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="employee">Empleado</SelectItem>
                      <SelectItem value="department_head">Jefe de Departamento</SelectItem>
                      <SelectItem value="global_manager">Gestor Global</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create user dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Crea un nuevo usuario con acceso inmediato al sistema
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nombre completo</Label>
                <Input
                  id="newUserName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nombre del usuario"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Contraseña</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona departamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newUserRole} onValueChange={(val) => setNewUserRole(val as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="department_head">Jefe de Departamento</SelectItem>
                    <SelectItem value="global_manager">Gestor Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {createError}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Usuario
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
