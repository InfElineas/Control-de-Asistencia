import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Users, UserCheck, UserX, Clock, Download, Loader2, Search, TrendingUp, Eye, Sheet } from 'lucide-react';
import { formatTime } from '@/lib/xlsx-export';
import { ReportRunsCard } from '@/components/reports/ReportRunsCard';
import { formatLastConnection } from '@/lib/last-connection';
import { useAttendanceSummary, ATTENDANCE_PAGE_SIZE } from '@/hooks/useAttendanceSummary';

export default function GlobalPanel() {
  const {
    departments,
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
    departmentHeadcount,
    metrics,
    filteredAttendance,
    totalPages,
    paginatedAttendance,
    handleExport,
    handleSendToGoogleSheet,
    openEmployeeDetails,
    handleSetAbsenceReview,
  } = useAttendanceSummary();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Panel Global</h1>
            <p className="text-muted-foreground">
              Vista general de todos los empleados · Jefes incluidos: {includeHeadsInGlobalReports ? 'Sí' : 'No'} · Filtro: {selectedDepartment?.name ?? 'Todos los departamentos'}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar trabajador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full sm:w-72"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                  className="w-auto"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                  className="w-auto"
                />
                <Button onClick={() => handleExport(selectedDepartment)} disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {selectedDepartment ? `XLSX ${selectedDepartment.name}` : 'XLSX Global'}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => handleSendToGoogleSheet(selectedDepartment)} disabled={sendingToSheet}>
                  {sendingToSheet ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sheet className="h-4 w-4 mr-2" />
                      Enviar a Sheets
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Total Empleados" value={metrics.total} icon={Users} variant="default" />
          <MetricCard title="Presentes Hoy" value={metrics.present} icon={UserCheck} variant="success" />
          <MetricCard title="Ausentes Hoy" value={metrics.absent} icon={UserX} variant="destructive" />
          <MetricCard title="Tardanzas Hoy" value={metrics.late} icon={Clock} variant="warning" />
          <MetricCard title="Cumplimiento" value={`${metrics.compliance}%`} icon={TrendingUp} variant="default" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trabajadores por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentHeadcount.map((item) => (
                <div key={item.department} className="rounded border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{item.department}</span>
                    <span className="text-muted-foreground">{item.total}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    {item.total > 0 && (
                      <div className="flex h-full w-full">
                        <div className="bg-emerald-500" style={{ width: `${(item.ok / item.total) * 100}%` }} />
                        <div className="bg-amber-500" style={{ width: `${(item.late / item.total) * 100}%` }} />
                        <div className="bg-sky-500" style={{ width: `${(item.rest / item.total) * 100}%` }} />
                        <div className="bg-rose-500" style={{ width: `${(item.absent / item.total) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ok: {item.ok}</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Tarde: {item.late}</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Descanso: {item.rest}</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Ausente: {item.absent}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asistencia de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tardanza</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Ausencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No hay empleados que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAttendance.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                            <p className="text-xs text-muted-foreground">Tel: {row.phone || 'No registrado'} · Rol: {row.role}</p>
                            <p className="text-xs text-muted-foreground">Última conexión: {formatLastConnection(row.last_connection_at)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>
                          {row.todayStatus ? (
                            <StatusBadge status={row.todayStatus} />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.lateMinutes > 0 ? (
                            <span className="text-amber-600 font-medium">{row.lateMinutes} min</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>{row.inTime ? formatTime(row.inTime) : '-'}</TableCell>
                        <TableCell>{row.outTime ? formatTime(row.outTime) : '-'}</TableCell>
                        <TableCell>
                          {row.insideGeofence !== null && (
                            <span className={row.insideGeofence ? 'text-success text-sm' : 'text-destructive text-sm'}>
                              {row.insideGeofence ? '✓ Dentro' : '✗ Fuera'}
                              {row.distance && ` (${row.distance}m)`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.todayStatus === 'AUSENTE' ? (
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant={row.absenceReview?.is_justified ? 'default' : 'outline'}
                                disabled={reviewingUserId === row.userId}
                                onClick={() => handleSetAbsenceReview(row.userId, true)}
                              >
                                Justificada
                              </Button>
                              <Button
                                size="sm"
                                variant={row.absenceReview && !row.absenceReview.is_justified ? 'destructive' : 'outline'}
                                disabled={reviewingUserId === row.userId}
                                onClick={() => handleSetAbsenceReview(row.userId, false)}
                              >
                                No justificada
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEmployeeDetails(row.userId)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * ATTENDANCE_PAGE_SIZE + 1}-{Math.min(currentPage * ATTENDANCE_PAGE_SIZE, filteredAttendance.length)} de {filteredAttendance.length} registros
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ReportRunsCard
          scope={selectedDepartment ? 'department' : 'global'}
          departmentId={selectedDepartment?.id ?? null}
          title={
            selectedDepartment
              ? `Ejecuciones de reportes · ${selectedDepartment.name}`
              : 'Ejecuciones de reportes globales'
          }
        />

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle de trabajador</DialogTitle>
              <DialogDescription>
                {selectedEmployee
                  ? `${selectedEmployee.full_name} · ${selectedEmployee.department_name}`
                  : 'Métricas de asistencia y vacaciones'}
              </DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : employeeDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Asistencia (mes actual)</p>
                    <p className="text-xl font-semibold">{employeeDetails.monthPresentDays} días</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Última actividad</p>
                    <p className="text-sm font-medium">
                      {employeeDetails.lastActivityAt
                        ? format(new Date(employeeDetails.lastActivityAt), "dd 'de' MMM yyyy, HH:mm", { locale: es })
                        : 'Sin registros'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Horas trabajadas (mes actual)</p>
                    <p className="text-xl font-semibold">{employeeDetails.monthWorkedHours.toFixed(1)} h</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Entradas con tardanza</p>
                    <p className="text-xl font-semibold">{employeeDetails.monthLateCheckins}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Entradas fuera de geocerca</p>
                    <p className="text-xl font-semibold">{employeeDetails.monthOutsideGeofence}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">Marcajes de entrada (mes actual)</p>
                    <p className="text-xl font-semibold">{employeeDetails.monthInMarks}</p>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2">
                  <CardContent className="pt-4 space-y-1">
                    <p className="text-muted-foreground">Vacaciones</p>
                    <p>Días acumulados: <span className="font-semibold">{employeeDetails.vacation.earnedDays.toFixed(2)}</span></p>
                    <p>Días disponibles: <span className="font-semibold">{employeeDetails.vacation.availableDays.toFixed(2)}</span></p>
                    <p>Días aprobados: <span className="font-semibold">{employeeDetails.vacation.approvedDays.toFixed(2)}</span></p>
                    <p>Días pendientes: <span className="font-semibold">{employeeDetails.vacation.pendingDays.toFixed(2)}</span></p>
                    <p>Días trabajados del año: <span className="font-semibold">{employeeDetails.vacation.workedDays}</span></p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay datos para mostrar.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
