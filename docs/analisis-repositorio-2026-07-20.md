# Análisis profundo del repositorio — 2026-07-20

**Proyecto:** ControlAsistencia
**Alcance:** inventario completo de `src/` y `supabase/`, estado del working tree (cambios sin commitear) y contraste con la documentación ya existente en `docs/`.
**Complementa, no reemplaza:** `CLAUDE.md` (arquitectura de alto nivel) y `docs/revision-historial-commits.md` (historial de commits hasta 2026-03-29). Este documento cubre lo que falta: inventario granular, estado del refactor en curso, y una lista de acciones concretas derivadas del análisis.

> **Actualización 2026-07-20 (mismo día):** todos los bloqueantes de la sección 6 original (puntos 1-4) fueron corregidos, commiteados y pusheados a `main`. La sección 1 y la tabla de la sección 3 quedan como bitácora de lo que se encontró y cómo se resolvió; la lista de acciones en la sección 6 se actualizó para reflejar el estado real.

---

## 1) Resumen ejecutivo

El repo estaba en medio de un **refactor grande sin commitear** (32 archivos modificados, 3 nuevos hooks + 2 nuevos componentes, un endurecimiento de `tsconfig`, y un re-theming completo de la UI). Se verificó el estado real compilando con la config nueva y corriendo lint, y luego se corrigió todo en tres commits sobre `main`:

- **`tsc --noEmit` fallaba con ~25 errores**, repartidos entre archivos tocados por el refactor y archivos **no tocados** (`Department.tsx`, `RestSchedule.tsx`, `useVacations.ts`, `useGeolocation.ts`, `types.ts`). Activar `noImplicitAny`/`strictNullChecks` destapó deuda de tipos preexistente en todo el proyecto. **Resuelto** (commit `239134a`): 0 errores.
- **Había un bug real (no solo de tipado)** introducido por el refactor: [UserManagement.tsx:325](src/pages/UserManagement.tsx#L325) llamaba a `setSelectedManagedDepartments` sin haberlo desestructurado del hook. **Corregido** (commit `8c415c1`).
- **`npm run lint` fallaba** (exit ≠ 0): 2 errores `@typescript-eslint/no-explicit-any` en `useAttendanceSummary.ts:312,318`. **Corregido** en el mismo commit `8c415c1` — 0 errores, solo queda el warning preexistente de `AuthContext.tsx:121`.
- El resto del refactor (extracción página→hook) estaba **completo y limpio**: no había imports muertos ni lógica duplicada entre las páginas viejas y los hooks nuevos.
- **Hallazgo adicional al arreglar tsc**: buena parte de los errores de tipos no eran solo deuda de tipado — la causa raíz eran **dos migraciones SQL que existían en el repo pero nunca se habían aplicado a la base remota** (`20260424101500_reporting_kpis_scope_filters.sql` y `20260707140000_add_google_sheets_report_config.sql`, esta última parte de este mismo refactor). Se pushearon ambas al proyecto Supabase (`bogguolwffhdlusudgoh`, con confirmación previa del usuario) y se regeneró `src/integrations/supabase/types.ts` desde el esquema remoto ya completo, lo que resolvió los identificadores duplicados y las firmas de RPC obsoletas de una sola vez (commit `239134a`).
- `docs/plan-implementacion-vacaciones.md` describe un módulo de vacaciones **como plan futuro**, pero ya está implementado en el código actual (`useVacations.ts`, migraciones `20260214*`–`20260217*`, RPCs `request_vacation`/`review_vacation_request`/`get_vacation_balance`). Ese doc sigue desactualizado — ver sección 6, punto 5 (aún abierto).

**Conclusión:** el refactor ya está commiteado y pusheado a `main` (`8c415c1` → `923b199` → `239134a`), con `tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` en verde. Quedan pendientes solo los ítems no bloqueantes de la sección 6.

---

## 2) Inventario granular de `src/`

> Arquitectura general (auth/roles, shells dual, edge functions, pipeline de reporting) ya está en `CLAUDE.md`. Aquí solo lo que falta: mapa completo por carpeta.

### `src/components/`
- **`attendance/`**: `AttendanceButton` (botón entrada/salida), `GeofenceIndicator` (estado GPS dentro/fuera de zona), `TodayMarks` (lista de marcajes del día).
- **`dashboard/`**: `MetricCard` (tarjeta KPI memoizada).
- **`layout/`**: `AdminShell` (sidebar backoffice), `EmployeeShell` (bottom-nav móvil), `AppLayout` (elige shell vía `useUIMode` + envuelve `WorkLocationSelector`), `NotificationBell`, `WorkLocationSelector` (modal que fuerza elegir sede activa al iniciar sesión, salvo `global_manager`/`superadmin`).
- **`mobile/`**: `PrimaryActionButton`, `StatusPill`.
- **`configuration/`**: `DepartmentScheduleCard`, `LocationMapPicker` (mini-mapa hecho a mano con tiles OSM, sin librería de mapas), `ImportHistorySection` (nuevo), `WorkLocationsSection` (nuevo, CRUD de sedes).
- **`reports/`**: `ReportRunsCard` (historial + KPIs operativos de `report_runs`, poll cada 15s, descarga por signed URL).
- Sueltos: `AppErrorBoundary`, `AppRouterBoundary` (resetea el boundary por ruta), `NavLink`, `StatusBadge`, `ProtectedRoute`.
- **`ui/`** (~45 archivos): primitivas shadcn-ui vendorizadas, tratar como vendored.

### `src/hooks/` (agrupado por dominio)
- **Asistencia/geofencing**: `useAttendance`, `useAttendanceSummary` (nuevo — panel global/depto, exporta XLSX y ahora también a Google Sheets), `useGeolocation`, `useGeofenceConfig`, `useWorkLocations`, `useWorkLocationsConfig` (nuevo — CRUD admin de sedes, migra `geofence_config` legacy automáticamente).
- **Horarios/departamentos**: `useDepartmentSchedule`, `useDepartmentSchedules`, `useDepartments`, `useManagedDepartments`, `useGlobalManagerCheck`.
- **Descansos**: `useRestSchedule` (individual o por grupos).
- **Vacaciones**: `useVacations` (ya implementado — ver hallazgo en §1).
- **Configuración/admin**: `useGeneralConfig` (nuevo — config global + Google Sheets ID + import histórico), `useUserManagement` (nuevo — CRUD usuarios, alta/baja/restauración), `useSuperAdmin` (nuevo — audit log, consola SQL, modo de checkout).
- **Genéricos de plataforma**: `use-ui-mode`, `use-mobile`, `use-toast`.

### `src/pages/`
Todas las páginas de nivel superior (`Index`, `Auth`, `Attendance`, `History`, `Incidents`, `Notifications`, `Profile`, `RestSchedule`, `Vacations`, `Configuration`, `Department`, `DepartmentsManagement`, `GlobalPanel`, `UserManagement`, `SuperAdmin`, `GpsDiagnostics`, `NotFound`), más `pages/employee/*` (shell móvil: Marcar/Mi semana/Incidencias/Perfil) y `pages/management/IncidentsManagementPage` (bandeja de revisión para jefaturas).

### `src/lib/`
`attendance-metrics`, `auth-redirect`, `error-messages` (mapeo ES de errores por dominio), `errors`, `incidents`, `last-connection`, `location-service`, `mobile-runtime`, `monthly-report-client`, `notification-permissions`, `roles`, `utils`, `xlsx-export` (dos exportadores; el layout de columnas cambió en este refactor — ver §3).

### `src/contexts/`
`AuthContext` (sesión + perfil + rol), `NotificationsContext` (realtime + polling de respaldo + job embebido `syncRestScheduleReminder`).

### `src/test/`
Solo 4 archivos: `example.test.ts` (smoke), `incidents-utils.test.ts`, `ui-mode.test.ts`, `setup.ts`. **Sin tests de componentes, hooks con estado, ni integración** — coincide con lo ya señalado en `docs/usabilidad-calidad-reporte.md`.

---

## 3) Refactor commiteado (estado final tras la corrección)

**Patrón:** extract-to-hooks sistemático. Cada página grande de admin (`Configuration`, `GlobalPanel`, `SuperAdmin`, `UserManagement`) pasó a ser un componente "tonto" que destructura un hook custom y renderiza JSX; toda la lógica de fetch/estado/handlers se movió a `src/hooks/`. En paralelo, dos secciones de `Configuration.tsx` se extrajeron a componentes propios (`WorkLocationsSection`, `ImportHistorySection`).

**En paralelo va un re-theming completo**: `index.css` cambia de tema claro corporativo a un tema oscuro "Deep Sea" (tokens HSL nuevos, tipografías Inter/Figtree/IBM Plex Mono vía Google Fonts, utilidades nuevas como `.aurora-surface`/`.btn-gradient`, se eliminan `.glass-card`/`.glow`). Los primitivos `badge/button/card/input/select/table` se ajustan a los tokens nuevos (radios más chicos, sin backdrop-blur, `Badge` gana variantes `success`/`warning`, `Button` gana `gradient`). `AdminShell`/`EmployeeShell` migran a los tokens nuevos.

**Flujo Google Sheets (nuevo, conecta varias piezas):**
1. Migración `20260707140000_add_google_sheets_report_config.sql` agrega `google_sheets_report_spreadsheet_id` a `app_config`.
2. `useGeneralConfig.ts` lee/guarda ese campo; `Configuration.tsx` tiene un input nuevo en "General".
3. `useAttendanceSummary.ts` agrega `handleSendToGoogleSheet(selectedDepartment)`, invoca la edge function `export-report-to-sheet`.
4. `GlobalPanel.tsx` agrega el botón "Enviar a Sheets".
5. La edge function (`supabase/functions/export-report-to-sheet/index.ts`, ~460 líneas) autentica con JWT RS256 de cuenta de servicio Google (`GOOGLE_SERVICE_ACCOUNT_JSON`), y **reimplementa en Deno** la misma lógica de `xlsx-export.ts` (`buildAttendanceMatrixValues`, mismos headers/códigos de estado) porque el edge function no puede importar `src/lib`.
   - **Riesgo de mantenimiento identificado:** esta duplicación cliente/servidor es intencional pero frágil — si cambian las columnas del XLSX hay que replicar el cambio a mano en la función. `xlsx-export.ts` ya cambió en este mismo refactor (de 8 columnas de resumen a 6: `Presente/Descanso/Tardanza/A Justificada/A Injustificada/Vacaciones`), y la función edge ya está sincronizada con ese layout nuevo — pero no hay ningún test ni contrato compartido que detecte una futura desincronización.

**Hallazgos de validación (evidencia real, no inferida):**

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | Fallaba con ~25 errores (ver detalle abajo). **Ahora pasa con 0 errores** tras desplegar las 2 migraciones pendientes + regenerar `types.ts` + los fixes puntuales de tipos (commit `239134a`). Causas originales: (a) deuda preexistente destapada por `strictNullChecks`/`noImplicitAny` en archivos *no tocados* por el refactor (`Department.tsx`, `RestSchedule.tsx`, `useVacations.ts`, `useGeolocation.ts`); (b) identificadores duplicados en `types.ts` porque dos migraciones locales nunca se habían pusheado a la BD remota; (c) tipado flojo en llamadas RPC cuyo nombre/argumentos no existían aún en el esquema remoto. |
| **Bug real** | [UserManagement.tsx:325](src/pages/UserManagement.tsx#L325) llamaba `setSelectedManagedDepartments` sin haberlo desestructurado del hook (línea 61 solo traía `selectedManagedDepartments`). **Corregido** (commit `8c415c1`). |
| `npm run lint` | Fallaba con 2 errores `no-explicit-any` en `useAttendanceSummary.ts:312,318`. **Ahora pasa con 0 errores** (commit `8c415c1`); solo queda el warning preexistente de `react-hooks/exhaustive-deps` en `AuthContext.tsx:121`. |

---

## 4) Inventario de `supabase/`

### Migraciones (42 archivos, orden cronológico por bloque temático)
1. **Esquema inicial y roles** (`20260129`–`20260202`): tablas base, RLS inicial.
2. **Horarios de depto y reglas de marcaje** (`20260204`–`20260205`): `department_schedules`, `validate_attendance_mark`, tolerancia de tardanza.
3. **Vacaciones y descansos** (`20260214`–`20260217`, 7 archivos): `vacation_requests`, `rest_groups`, `attendance_absence_reviews`. Incluye `20260216151704_new-migration.sql`, que **está vacía** (0 líneas) — candidata a limpiar/documentar por qué existe.
4. **Superadmin e integridad** (`20260228010000`–`010400`): rol `superadmin`, consola SQL, FKs para borrado de usuario.
5. **Incidencias** (`20260228194000`–`230000`): `attendance_incidents`.
6. **Work locations y notificaciones** (`20260302`–`20260303`): `work_locations`, `notifications`.
7. **Config global y checkout** (`20260303193000`–`20260304224500`): timezone global, modo de checkout, bloqueo por pausa.
8. **Responsabilidades por depto e incidencias avanzadas** (`20260305`).
9. **Reporting pipeline fases 1-4** (`20260313170000`–`203000`): RPC mensual, `report_runs`, `attendance_rule_versions`, `attendance_daily_facts`, KPIs operativos.
10. **Misceláneos posteriores** (`20260325`–`20260424`): `last_connection`, desactivación de perfiles, fixes de RLS multi-departamento.
11. **Google Sheets** (`20260707140000`): config de spreadsheet ID.

> **Nota de despliegue (2026-07-20):** al momento del análisis inicial, las migraciones 10 (`20260424101500`, KPI v2) y 11 (`20260707140000`, Google Sheets) existían solo en el repo — `supabase migration list --linked` las mostraba sin aplicar en remoto. Se pushearon ambas (`supabase db push --linked`) durante la corrección de los errores de `tsc`; el resto de la lista ya estaba aplicado en remoto.

### Edge Functions (7 + 1 nueva)
`create-user`, `delete-user`, `generate-monthly-report`, `import-attendance-history`, `reset-user-password`, `snapshot-daily-facts`, `validate-attendance`, y la nueva `export-report-to-sheet`. Solo 4 están en `config.toml` con `verify_jwt=false` (`create-user`, `validate-attendance`, `generate-monthly-report`, `delete-user`); el resto usa verificación JWT por defecto de Supabase, incluida `export-report-to-sheet`.

---

## 5) Contraste con documentación existente (para no duplicar)

- **`docs/plan-implementacion-vacaciones.md`** — describe el módulo de vacaciones como pendiente, pero **ya está implementado**. Recomendación: marcar el doc como "implementado en `20260214`–`20260217`" o archivarlo, para que no confunda a alguien nuevo en el proyecto.
- **`docs/usabilidad-calidad-reporte.md` / `guia-remediacion-paso-a-paso.md`** — el endurecimiento de `tsconfig` en curso es parte de la Fase 1 (P0) de esa guía. Dado que romper el build no es aceptable, conviene verificar si el resto de la Fase 1 (mapeador de errores amigables, batería de tests críticos) también se está trabajando en paralelo o si quedó solo el cambio de `tsconfig`.
- **`docs/analisis-escalabilidad-trazabilidad-reportes.md` / `pipeline-reporting-tecnico.md`** — particionamiento de `attendance_marks` sigue siendo condicional/futuro (umbral >10M filas o p95>2s sostenido); nada que actuar hoy.
- **`docs/android-geolocation-remediation.md`** — background tracking real (plugin nativo) sigue sin implementarse, fallback `watchPosition` activo.
- **`docs/pruebas-carga-reportes.md`** — es una guía, no hay evidencia en el repo de que las pruebas ya se ejecutaron ni resultados documentados.

---

## 6) Acciones recomendadas (derivadas de este análisis)

**Bloqueantes originales — todos resueltos y en `main` (commits `8c415c1`, `923b199`, `239134a`):**
1. ~~Arreglar el bug real en [UserManagement.tsx:61](src/pages/UserManagement.tsx#L61)~~ — **hecho**, se agregó `setSelectedManagedDepartments` al destructuring de `useUserManagement()`.
2. ~~Corregir los 2 `no-explicit-any` en `useAttendanceSummary.ts:312,318`~~ — **hecho**, casteados a los tipos concretos `AttendanceReportRow['status']` / `AttendanceReportRow['absence_justification']`.
3. ~~Decidir el alcance del endurecimiento de `tsconfig`~~ — **hecho**: se mantuvo el endurecimiento y se arregló toda la deuda de tipos que destapaba, incluyendo archivos no tocados por el refactor original (`Department.tsx`, `RestSchedule.tsx`, `useVacations.ts`, `useGeolocation.ts`, `useSuperAdmin.ts`, `Attendance.tsx`, `ReportRunsCard.tsx`, `WorkLocationsSection.tsx`).
4. ~~Los duplicados de identificadores en `types.ts`~~ — **hecho, y la causa raíz era otra**: no era el archivo generado el que estaba mal, eran 2 migraciones (`20260424101500`, `20260707140000`) que nunca se habían pusheado a la BD remota. Se pushearon con `supabase db push --linked` (confirmado con el usuario) y se regeneró `types.ts` desde el esquema ya completo.

**No bloqueantes, pero vale la pena registrar como deuda:**
5. Limpiar el re-export vestigial `export { es }` en `useAttendanceSummary.ts` (ya no se usa, `GlobalPanel.tsx` importa `es` directamente).
6. Migración vacía `20260216151704_new-migration.sql` — confirmar si fue intencional o eliminarla.
7. Actualizar/archivar `docs/plan-implementacion-vacaciones.md` (ver §5).
8. Sin tests que protejan la sincronización entre `xlsx-export.ts` (cliente) y `buildAttendanceMatrixValues` en `export-report-to-sheet/index.ts` (edge function) — un cambio futuro en columnas del reporte puede desincronizar ambos sin que nada lo detecte.
