import { AppLayout } from '@/components/layout/AppLayout';
import { AppRole } from '@/contexts/AuthContext';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Shield, Users, Edit, Filter, Trash2, UserX, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatLastConnection } from '@/lib/last-connection';
import { useUserManagement, USERS_PAGE_SIZE } from '@/hooks/useUserManagement';

function getRoleBadge(userRole: AppRole) {
  const variants: Record<AppRole, { label: string; className: string }> = {
    employee: { label: 'Empleado', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    department_head: { label: 'Jefe Depto.', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
    global_manager: { label: 'Gestor Global', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
    superadmin: { label: 'Superadmin', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
  };
  return <Badge className={variants[userRole].className}>{variants[userRole].label}</Badge>;
}

export default function UserManagement() {
  const {
    role, canDeleteUsers, currentUser, departments,
    users, loading, filteredUsers, paginatedUsers, totalPages,
    editingUser, dialogOpen, setDialogOpen, selectedRole, setSelectedRole,
    selectedDepartment, setSelectedDepartment, selectedManagedDepartments, setSelectedManagedDepartments, saving,
    createDialogOpen, setCreateDialogOpen, newUserEmail, setNewUserEmail,
    newUserPassword, setNewUserPassword, newUserName, setNewUserName,
    newUserDepartment, setNewUserDepartment, newUserRole, setNewUserRole,
    creating, createError,
    deletingUser, deleteDialogOpen, setDeleteDialogOpen, deleting,
    deactivateDialogOpen, setDeactivateDialogOpen, deactivatingUser,
    deactivationReason, setDeactivationReason, contractCancelledAt, setContractCancelledAt,
    deactivating,
    filterDepartment, setFilterDepartment, filterRole, setFilterRole,
    filterStatus, setFilterStatus, currentPage, setCurrentPage,
    handleEditUser, toggleManagedDepartment, handleSaveUser, handleCreateUser,
    handleOpenDeleteDialog, handleOpenDeactivateDialog, handleDeleteUser,
    handleDeactivateUser, handleRestoreUser,
  } = useUserManagement();

  if (role !== 'global_manager' && role !== 'superadmin') {
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
            <p className="text-muted-foreground">Administra usuarios, roles y permisos del sistema</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

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
              <div className="text-2xl font-bold">{users.filter((u) => u.role === 'department_head').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestores Globales</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === 'global_manager' || u.role === 'superadmin').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Usuarios del Sistema</CardTitle>
                <CardDescription>
                  Haz clic en un usuario para editar su rol y departamento.
                  {role !== 'superadmin' ? ' Solo superadmin puede eliminar usuarios.' : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Todos los deptos.</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="department_head">Jefe de Depto.</SelectItem>
                    <SelectItem value="global_manager">Gestor Global</SelectItem>
                    {role === 'superadmin' && <SelectItem value="superadmin">Superadmin</SelectItem>}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'active' | 'inactive' | 'all')}>
                  <SelectTrigger className="w-[170px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Papelera</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {users.length === 0 ? 'No hay usuarios registrados' : 'No hay usuarios que coincidan con los filtros'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Última conexión</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{user.department_name}</div>
                            {user.role === 'department_head' && user.managed_department_names.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Responsable también de: {user.managed_department_names.filter((name) => name !== user.department_name).join(', ')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="secondary">Activo</Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="outline" className="border-amber-400 text-amber-700">Papelera</Badge>
                              <p className="text-xs text-muted-foreground">
                                {user.contract_cancelled_at ? `Baja: ${user.contract_cancelled_at}` : 'Sin fecha'}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatLastConnection(user.last_connection_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user.is_active && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} aria-label={`Editar ${user.full_name}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDeactivateDialog(user)}
                                  disabled={currentUser?.id === user.user_id}
                                  aria-label={`Dar de baja ${user.full_name}`}
                                  className="text-amber-600 hover:text-amber-700"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {!user.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestoreUser(user)}
                                aria-label={`Restaurar ${user.full_name}`}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(user)}
                                disabled={currentUser?.id === user.user_id}
                                aria-label={`Eliminar ${user.full_name}`}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * USERS_PAGE_SIZE + 1}–{Math.min(currentPage * USERS_PAGE_SIZE, filteredUsers.length)} de {filteredUsers.length} usuarios
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>Modifica el rol, departamento principal y responsabilidades adicionales</DialogDescription>
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
                  <Select value={selectedDepartment} onValueChange={(value) => {
                    setSelectedDepartment(value);
                    setSelectedManagedDepartments((current) => Array.from(new Set([value, ...current])));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecciona departamento" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {departments.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as AppRole)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="employee">Empleado</SelectItem>
                      <SelectItem value="department_head">Jefe de Departamento</SelectItem>
                      <SelectItem value="global_manager">Gestor Global</SelectItem>
                      {role === 'superadmin' && <SelectItem value="superadmin">Superadmin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRole === 'department_head' && (
                  <div className="space-y-2">
                    <Label>Departamentos bajo su responsabilidad</Label>
                    <div className="max-h-48 overflow-auto rounded-md border p-3 space-y-3">
                      {departments.map((department) => {
                        const checked = selectedManagedDepartments.includes(department.id) || department.id === selectedDepartment;
                        return (
                          <label key={department.id} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleManagedDepartment(department.id, Boolean(value))}
                              disabled={department.id === selectedDepartment}
                            />
                            <span>{department.name}{department.id === selectedDepartment ? ' (principal)' : ''}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Solo superadmin y gestor global pueden gestionar estas responsabilidades múltiples.</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente a <strong>{deletingUser?.full_name}</strong> del sistema. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => { event.preventDefault(); handleDeleteUser(); }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar usuario'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Deactivate dialog */}
        <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dar de baja al trabajador</DialogTitle>
              <DialogDescription>El usuario dejará de aparecer en módulos operativos y quedará en la papelera de reciclaje.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label>Motivo de baja</Label>
                <Input value={deactivationReason} onChange={(e) => setDeactivationReason(e.target.value)} placeholder="Ej: fin de contrato, renuncia, despido, etc." />
              </div>
              <div className="space-y-2">
                <Label>Fecha de cancelación de contrato</Label>
                <Input type="date" value={contractCancelledAt} onChange={(e) => setContractCancelledAt(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} disabled={deactivating}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeactivateUser} disabled={deactivating}>
                {deactivating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Confirmar baja'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create user dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Crea un nuevo usuario con acceso inmediato al sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nombre completo</Label>
                <Input id="newUserName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nombre del usuario" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input id="newUserEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Contraseña</Label>
                <Input id="newUserPassword" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                  <SelectTrigger><SelectValue placeholder="Selecciona departamento" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {departments.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newUserRole} onValueChange={(val) => setNewUserRole(val as AppRole)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="department_head">Jefe de Departamento</SelectItem>
                    <SelectItem value="global_manager">Gestor Global</SelectItem>
                    {role === 'superadmin' && <SelectItem value="superadmin">Superadmin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {createError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{createError}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : <><UserPlus className="h-4 w-4 mr-2" />Crear Usuario</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
