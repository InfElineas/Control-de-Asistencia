import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Plus, RotateCcw } from 'lucide-react';
import {
  usePayrollAdjustments, categoryLabel, type PayrollAdjustmentCategory,
} from '@/hooks/usePayrollAdjustments';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PayrollAdjustments() {
  const { role } = useAuth();
  const {
    employees, adjustments, totalsByEmployee, loading, saving,
    updateMonthlySalary, createManualAdjustment, revertAdjustment,
  } = usePayrollAdjustments();

  const [salaryDrafts, setSalaryDrafts] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<Extract<PayrollAdjustmentCategory, 'vacation' | 'other'>>('other');
  const [reason, setReason] = useState('');

  const canSubmit = Boolean(selectedEmployee) && Number(amountInput) !== 0 && !saving;

  if (role !== 'global_manager' && role !== 'superadmin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
        </div>
      </AppLayout>
    );
  }

  const handleSaveSalary = async (userId: string) => {
    const draft = salaryDrafts[userId];
    const value = draft === '' || draft === undefined ? null : Number(draft);
    await updateMonthlySalary(userId, value);
  };

  const handleCreateAdjustment = async () => {
    const { error } = await createManualAdjustment(selectedEmployee, Number(amountInput), category, reason.trim());
    if (!error) {
      setDialogOpen(false);
      setSelectedEmployee('');
      setAmountInput('');
      setCategory('other');
      setReason('');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ajustes y descuentos de nómina</h1>
            <p className="text-sm text-muted-foreground">
              Sueldos mensuales, descuentos automáticos por ausencias no justificadas y ajustes manuales por vacaciones u otros motivos.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nuevo ajuste manual</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar ajuste manual</DialogTitle>
                <DialogDescription>Usa un monto negativo para un descuento y positivo para un abono.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {employees.map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>{employee.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Monto (MXN)</Label>
                    <Input type="number" step="0.01" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="-500.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={category} onValueChange={(value: 'vacation' | 'other') => setCategory(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="vacation">Vacaciones</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explica el motivo del ajuste" className="min-h-[70px]" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateAdjustment} disabled={!canSubmit}>
                    {saving ? 'Guardando...' : 'Registrar ajuste'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Sueldos mensuales por empleado</CardTitle>
            <CardDescription>Sirve para calcular automáticamente el descuento diario por ausencias no justificadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-auto">
            {loading ? (
              <p className="text-xs text-muted-foreground">Cargando...</p>
            ) : (
              employees.map((employee) => {
                const draft = salaryDrafts[employee.user_id] ?? (employee.monthly_salary?.toString() ?? '');
                const total = totalsByEmployee.get(employee.user_id) || 0;
                return (
                  <div key={employee.user_id} className="rounded-md border p-2 grid gap-2 md:grid-cols-[1fr_auto_auto] items-center">
                    <div>
                      <p className="text-sm font-medium leading-tight">{employee.full_name}</p>
                      <p className="text-xs text-muted-foreground">{employee.department_name}{total !== 0 && (
                        <span> · Ajustes acumulados: <strong className={total < 0 ? 'text-destructive' : 'text-success'}>{formatCurrency(total)}</strong></span>
                      )}</p>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-36"
                      value={draft}
                      placeholder="Sueldo mensual"
                      onChange={(e) => setSalaryDrafts((current) => ({ ...current, [employee.user_id]: e.target.value }))}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleSaveSalary(employee.user_id)} disabled={saving}>
                      Guardar
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historial de ajustes</CardTitle>
            <CardDescription>Descuentos automáticos por ausencias no justificadas y ajustes manuales.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay ajustes registrados</TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((item) => (
                    <TableRow key={item.id} className={item.status === 'reverted' ? 'opacity-50' : undefined}>
                      <TableCell className="text-xs">{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{item.employee_name}</TableCell>
                      <TableCell className="text-xs">{categoryLabel(item.category)}</TableCell>
                      <TableCell className={`text-xs font-medium ${item.amount < 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-xs max-w-[280px] whitespace-pre-wrap">{item.reason || 'Sin motivo'}</TableCell>
                      <TableCell className="text-xs"><Badge variant={item.status === 'active' ? 'outline' : 'secondary'}>{item.status === 'active' ? 'Activo' : 'Revertido'}</Badge></TableCell>
                      <TableCell>
                        {item.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => revertAdjustment(item.id)}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revertir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
