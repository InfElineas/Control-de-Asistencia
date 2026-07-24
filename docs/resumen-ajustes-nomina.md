# Ajustes y descuentos de nómina por vacaciones/ausencias — resumen (tarea terminada)

**Objetivo pedido:** una forma de manejar ajustes y descuentos de nómina relacionados a vacaciones
y ausencias de los empleados.

**Alcance acordado con el usuario** (ver decisiones abajo): descuentos monetarios (no de días de
vacaciones), calculados a partir de un sueldo mensual por empleado, disparados automáticamente por
ausencias no justificadas y de forma manual para el resto de los casos (incluyendo vacaciones).

---

## 1) Decisiones de alcance

Antes de construir se resolvieron 4 ambigüedades con el usuario:

1. **Tipo de descuento**: dinero/nómina (no días de vacaciones — el sistema de vacaciones ya existente
   no se modificó).
2. **Disparador**: automático para ausencias no justificadas + edición/reversión manual.
3. **Base de cálculo**: sueldo mensual por empleado (campo nuevo), tarifa diaria derivada
   (`sueldo_mensual / 30`, fijo por ahora, ver recomendaciones).
4. **Vacaciones**: no generan descuento automático (son días pagados); el módulo solo permite
   registrar un ajuste manual si un admin decide hacerlo.

## 2) Qué se implementó

### Base de datos (`supabase/migrations/20260721000000_add_payroll_adjustments.sql`, aplicada en remoto)
- `profiles.monthly_salary` (numeric, nullable) — sueldo mensual por empleado.
- Tabla `payroll_adjustments`: `user_id`, `amount` (+/-), `category`
  (`unjustified_absence` | `vacation` | `other`), `reason`, `status` (`active`/`reverted`),
  `source_type`/`source_id` (trazabilidad del origen automático), `created_by`, `reverted_by`/`reverted_at`.
  RLS: solo `global_manager`/`superadmin` leen o escriben.
- Trigger `trg_absence_review_payroll_impact` sobre `attendance_absence_reviews`
  (función `handle_absence_review_payroll_impact`, `SECURITY DEFINER`):
  - Al marcar una ausencia `is_justified = false` → crea automáticamente un descuento
    (`-sueldo_mensual/30`) si el empleado tiene sueldo cargado.
  - Al reclasificarla como `is_justified = true` → revierte automáticamente ese descuento
    (lo marca `reverted`, no lo borra — queda trazable).
  - Corre con `SECURITY DEFINER` porque `department_head` (quien puede marcar la ausencia) no tiene
    ni debe tener acceso directo a `payroll_adjustments`.

### Web
- [`src/hooks/usePayrollAdjustments.ts`](../src/hooks/usePayrollAdjustments.ts): carga empleados +
  ajustes (con `department_id`/`department_name` resueltos), permite editar sueldo, crear ajuste
  manual y revertir uno existente.
- [`src/pages/PayrollAdjustments.tsx`](../src/pages/PayrollAdjustments.tsx): página **`/nomina`**
  (solo `global_manager`/`superadmin`):
  - Filtro por departamento (selector arriba, por defecto "Todos los departamentos"), aplica tanto
    a la lista de sueldos como al historial.
  - Tarjeta "Sueldos mensuales por empleado": editar/guardar sueldo por empleado, muestra el total
    de ajustes activos acumulados por persona.
  - Tarjeta "Historial de ajustes": tabla con fecha, empleado, categoría, monto, motivo, estado,
    botón "Revertir" por fila activa.
  - Botón "Nuevo ajuste manual" (diálogo: empleado, monto +/-, categoría vacaciones/otro, motivo).
- Ruta protegida en `App.tsx` y enlace "Ajustes de nómina" en el sidebar (`AdminShell.tsx`, grupo
  "Gestión", roles `global_manager`/`superadmin`).

## 3) Cómo funciona (flujo)

1. Un `department_head` o `global_manager` marca una ausencia como no justificada — flujo **ya
   existente**, sin cambios en su UI.
2. Si ese empleado tiene sueldo mensual cargado, se genera automáticamente un descuento en
   `payroll_adjustments` (si no tiene sueldo cargado, no pasa nada — evita montos en $0 o erróneos).
3. Un `global_manager`/`superadmin` entra a `/nomina` para cargar/editar sueldos, filtrar por
   departamento, ver el historial completo, revertir un descuento automático que no correspondía, o
   registrar un ajuste manual (vacaciones u otro motivo).

## 4) Validación realizada

- `npx tsc --noEmit -p tsconfig.app.json` → 0 errores.
- `npm run lint` (acotado a `src/`) → 0 errores, solo el warning preexistente de
  `AuthContext.tsx:121`. (Nota: `npm run lint` sin acotar puede fallar por archivos de build de
  Android no ignorados por ESLint — hallazgo aparte, ver tarea sugerida pendiente.)
- `npm run test` → 7/7 tests pasan (sin tests nuevos específicos de este feature).
- `npm run build` → compila sin errores.
- Verificado en navegador: `/nomina` redirige correctamente a `/auth` sin sesión (guard de rol
  funcionando), sin errores de consola. **No se probó interactivamente con datos reales** — no había
  credenciales de `global_manager`/`superadmin` disponibles en esta sesión.

## 5) Estado de despliegue

- **Commiteado y pusheado** a `main`: tabla/trigger/hook/página/ruta/nav (commit `f491e6b`).
- **Migración aplicada** en la base de datos real (`bogguolwffhdlusudgoh`) y `types.ts` regenerado.
- **Filtro por departamento**: implementado y validado, **pendiente de commit** (último cambio de
  esta sesión, a la espera de confirmación del usuario).
- **Pendiente para que surta efecto en producción**: publicar en Lovable (Share → Publish), igual que
  con features anteriores — el push a `main` no publica solo.

## 6) Recomendaciones para trabajo relacionado (no implementado)

- **Reflejarlo en el reporte XLSX/Google Sheets**: hoy `useAttendanceSummary.ts`/`xlsx-export.ts` no
  incluyen el total de `payroll_adjustments` por empleado/mes.
- **Divisor de días configurable**: `sueldo_mensual / 30` está fijo en la función SQL; si la política
  real usa días hábiles u otro divisor, convendría exponerlo en Configuración (como
  `vacation_days_per_worked_day`) en vez de dejarlo hardcodeado.
- **Auditoría**: los ajustes no se reflejan en el `audit_log` del panel de superadmin.
- **Notificación al empleado**: hoy no hay integración con `NotificationsContext` cuando se le aplica
  o revierte un ajuste a alguien.
