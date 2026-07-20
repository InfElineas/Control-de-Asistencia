import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Database, FileSpreadsheet, Mail, Play, RefreshCcw, ShieldCheck, Trash2, Users, Wrench } from 'lucide-react';
import { useSuperAdmin, CheckoutMode } from '@/hooks/useSuperAdmin';
import { AppReleasesSection } from '@/components/superadmin/AppReleasesSection';

export default function SuperAdmin() {
  const { role, user } = useAuth();
  const {
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
  } = useSuperAdmin();

  if (role !== 'superadmin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Solo superadmins pueden acceder a esta consola.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1500px] mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel administrativo técnico</h1>
          <p className="text-sm text-muted-foreground">Visión global del sistema, seguridad y operación técnica.</p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Logs totales</p><p className="text-xl font-semibold">{stats.totalLogs}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Errores detectados</p><p className="text-xl font-semibold">{stats.totalErrors}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Usuarios</p><p className="text-xl font-semibold">{stats.totalUsers}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">IPs únicas</p><p className="text-xl font-semibold">{stats.uniqueIps}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Cambios por gestores</p><p className="text-xl font-semibold">{stats.totalGlobalManagerChanges}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Modo de salida configurable</CardTitle>
            <CardDescription>Define cómo se registra la salida para todo el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Modo de salida</p>
              <Select value={checkoutMode} onValueChange={(value: CheckoutMode) => setCheckoutMode(value)}>
                <SelectTrigger><SelectValue placeholder="Selecciona modo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual por usuario</SelectItem>
                  <SelectItem value="schedule">Automática por horario</SelectItem>
                  <SelectItem value="geofence_exit">Automática por salida de zona</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Hora de salida automática</p>
              <Input type="time" value={autoCheckoutTime} onChange={(e) => setAutoCheckoutTime(e.target.value)} disabled={checkoutMode !== 'schedule'} />
              <p className="text-xs text-muted-foreground">Aplica cuando el modo es automática por horario.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Minutos fuera de zona</p>
              <Input type="number" min={0} step={1} value={geofenceExitMinutes} onChange={(e) => setGeofenceExitMinutes(Number(e.target.value || 0))} disabled={checkoutMode !== 'geofence_exit'} />
              <p className="text-xs text-muted-foreground">Tiempo continuo fuera de geofence antes de marcar salida.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Separación mínima de descansos (días)</p>
              <Input type="number" min={1} step={1} value={restDaysMinSeparation} onChange={(e) => setRestDaysMinSeparation(Number(e.target.value || 1))} />
              <p className="text-xs text-muted-foreground">Parámetro global para validar descansos semanales.</p>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={handleSaveCheckoutSettings} disabled={savingCheckoutSettings}>
                {savingCheckoutSettings ? 'Guardando...' : 'Guardar modo de salida'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <AppReleasesSection />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> SQL Console del sistema</CardTitle>
              <CardDescription>Consulta recursos técnicos y ejecuta comandos como en SQL Editor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} className="min-h-[180px] font-mono text-xs" />
              <div className="flex justify-end">
                <Button onClick={runSqlQuery} disabled={runningSql}><Play className="h-4 w-4 mr-2" />{runningSql ? 'Ejecutando...' : 'Ejecutar SQL'}</Button>
              </div>
              {sqlResult && (
                <div className="space-y-2">
                  <Badge variant="outline">{sqlResult.type} · {sqlResult.row_count} filas</Badge>
                  <div className="max-h-[280px] overflow-auto border rounded-md">
                    {sqlResult.rows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>{sqlColumns.map((col) => <TableHead key={col}>{col}</TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                          {sqlResult.rows.slice(0, 120).map((row, i) => (
                            <TableRow key={i}>
                              {sqlColumns.map((col) => (
                                <TableCell key={`${i}-${col}`} className="text-xs align-top whitespace-pre-wrap">
                                  {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="p-3 text-xs text-muted-foreground">La consulta no devolvió filas.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Errores del sistema</CardTitle>
                  <CardDescription>Todos los eventos de error/fail detectados.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadData}><RefreshCcw className="h-4 w-4 mr-1" />Recargar</Button>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[260px] overflow-auto">
                {loading ? (
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                ) : errorLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin errores recientes.</p>
                ) : (
                  errorLogs.map((item) => (
                    <div key={item.id} className="border rounded-md p-2 bg-amber-50/40 dark:bg-amber-950/20">
                      <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />{item.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {item.description || 'Sin descripción'} · IP: {item.source_ip || 'N/A'}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Cambios por gestores globales</CardTitle>
                <CardDescription>Acciones técnicas hechas por global_manager.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[220px] overflow-auto">
                {globalManagerLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin cambios registrados por gestores globales.</p>
                ) : (
                  globalManagerLogs.map((item) => (
                    <div key={item.id} className="border rounded-md p-2">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">User: {getLogUserLabel(item.user_id)} · {item.description || 'Sin descripción'}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Log global del sistema</CardTitle>
            <CardDescription>Todos los logs técnicos con usuario, descripción, IP y cambios.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[380px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Recurso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay registros de auditoría</TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{getLogUserLabel(item.user_id)}</TableCell>
                      <TableCell className="text-xs">{item.action}</TableCell>
                      <TableCell className="text-xs max-w-[280px] whitespace-pre-wrap">{item.description || 'Sin descripción'}</TableCell>
                      <TableCell className="text-xs">{item.source_ip || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{item.table_name || 'N/A'} · {item.record_id || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Importar histórico desde Excel</CardTitle>
            <CardDescription>
              Sube un Excel con columnas <strong>email/correo</strong> y <strong>fecha/date</strong> para cargar trabajo histórico y ajustar estadísticas/vacaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="max-w-md"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportFileName(file.name);
                  await importAttendanceHistory(file);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            {importingHistory && <p className="text-xs text-muted-foreground">Importando histórico...</p>}
            {importFileName && <p className="text-xs text-muted-foreground">Último archivo: {importFileName}</p>}
            {importSummary && (
              <div className="text-xs rounded-md border p-2 space-y-1">
                <p>Marcajes importados: <strong>{importSummary.imported_marks}</strong></p>
                <p>Correos no encontrados: <strong>{importSummary.missing_emails.length}</strong></p>
                {importSummary.missing_emails.length > 0 && (
                  <p className="text-muted-foreground break-all">{importSummary.missing_emails.slice(0, 12).join(', ')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Gestión total de cuentas</CardTitle>
            <CardDescription>Envío de enlace de restablecimiento por correo y eliminación de usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[350px] overflow-auto">
            {users.map((managedUser) => (
              <div key={managedUser.user_id} className="rounded-md border p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium leading-tight">{managedUser.full_name}</p>
                    <p className="text-xs text-muted-foreground">{managedUser.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{managedUser.role.replace('_', ' ')}</Badge>
                </div>
                <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                  <Button variant="outline" size="sm" onClick={() => sendPasswordResetEmail(managedUser.email)} disabled={accountActionUserId === managedUser.email}>
                    <Mail className="h-3.5 w-3.5 mr-1" /> Enviar correo de restablecimiento
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteUser(managedUser.user_id)} disabled={accountActionUserId === managedUser.user_id || managedUser.user_id === user?.id}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
