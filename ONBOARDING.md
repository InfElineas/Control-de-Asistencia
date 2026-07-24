# Onboarding — Control de Asistencia ELINEAS

Guía de contexto completo para quien continúe este proyecto: mejorarlo, optimizarlo, encontrar
fallos/inconsistencias e implementar mejores soluciones. Cubre negocio, arquitectura, inventario
técnico completo, problemas conocidos y oportunidades. Nada se dejó fuera intencionalmente — donde
algo no se pudo verificar en código, se dice explícitamente.

---

## 1) Qué es este producto (negocio)

**Control de Asistencia ELINEAS** es una plataforma de control de asistencia laboral con geocerca
GPS, para una operación con múltiples departamentos/sedes. No es solo "marcar entrada/salida": incluye
horarios por departamento, descansos, vacaciones, incidencias/ausencias, reportería gerencial mensual,
notificaciones, un panel técnico de superadmin, distribución de su propia app Android, y (agregado
en esta sesión) un módulo de ajustes/descuentos de nómina.

**Roles** (jerarquía, el más alto gana si un usuario tiene varios):
`employee` < `department_head` < `global_manager` < `superadmin`.

**Dos experiencias de UI** sobre el mismo backend:
- **Admin/desktop** (`AdminShell`, sidebar): roles administrativos o pantalla de escritorio.
- **Employee/mobile** (`EmployeeShell`, bottom-nav): empleados en viewport móvil (<768px).
- Se puede forzar con `?ui=employee` / `?ui=admin` en cualquier ruta protegida (debug).

**Plataformas**: web (React SPA) + app Android nativa vía Capacitor (mismo código, `HashRouter` en
nativo por limitación de rutas `file://`).

**Gestión del proyecto**: es un proyecto **Lovable** (lovable.dev) — los cambios se sincronizan
automáticamente al hacer `git push` a `main`, pero **no se publican solos**: hay que entrar a Lovable
→ **Share → Publish** para que el dominio público sirva el código nuevo. Esto se olvida fácil.

---

## 2) Arranque rápido

```bash
npm install
npm run dev             # Vite, puerto 8080
npm run build            # build de producción
npm run lint              # eslint . (ver problema conocido en §6)
npm run test              # vitest run
npx vitest run src/test/incidents-utils.test.ts   # un test puntual
```

Mobile (Capacitor/Android — el proyecto `android/` recién se agregó completo en esta sesión):
```bash
npm run mobile:build      # build web + copia a android
npm run mobile:sync       # npx cap sync android
npm run mobile:android    # abre Android Studio
npm run mobile:icon       # regenera iconos del launcher
```
Ver `docs/guia-compilar-apk-android-studio.md` para compilar debug/release paso a paso, y
`docs/guia-publicar-app-movil.md` para publicar la APK desde la web (`/superadmin` → subir → queda
disponible en `/descargar-app`).

**Variables de entorno requeridas**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
`VITE_PUBLIC_APP_URL` es obligatoria para que el registro de usuarios genere links de confirmación
válidos en producción (si falta y corres en `localhost`, el signup falla a propósito en vez de
mandar un link roto). Ver `README.md` sección "Configuración necesaria" para el checklist completo
de dominio/redirects en Supabase Auth.

**Proyecto Supabase real**: ref `bogguolwffhdlusudgoh`. Migraciones en `supabase/migrations/`
(orden cronológico por timestamp del nombre de archivo — es la fuente de verdad del esquema).
Aplicar con `npx supabase db push --linked` (ver §7 sobre un problema real que ocurrió con esto).

---

## 3) Arquitectura técnica (capas)

- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn-ui (componentes en `src/components/ui/`
  — tratar como vendored, no reescribir). Sin state manager global: React Query + un puñado de
  Contexts (`AuthContext`, `NotificationsContext`). Toda la lógica de dominio vive en **hooks
  custom** bajo `src/hooks/` — no hay capa de "servicios/repositorio", los hooks son el límite y
  hablan directo con `supabase.from(...)`/`.rpc(...)`.
- **Backend**: Supabase — Postgres + Auth + Storage + Edge Functions (Deno). Sin ORM. Autorización
  **doble**: guard de rol en el cliente (`ProtectedRoute`, checks de `role`) y **RLS en Postgres**
  (la autoridad real — nunca confiar solo en el check del cliente).
  `src/integrations/supabase/client.ts`/`types.ts` son **generados** (regenerar con el CLI, no
  editar a mano — `npx supabase gen types typescript --project-id bogguolwffhdlusudgoh`).
- **Edge Functions** (`supabase/functions/`, Deno): operaciones privilegiadas que no deben correr con
  la sesión RLS del usuario (crear/borrar usuario, reset de password, importar histórico, generar
  reporte mensual, validar marcaje, snapshot de hechos diarios, exportar a Google Sheets).
- **Refactor reciente** (commit `8c415c1`, ya en `main`): las páginas admin grandes
  (`Configuration`, `GlobalPanel`, `SuperAdmin`, `UserManagement`) se separaron en página "tonta"
  (solo JSX) + hook custom con toda la lógica. Nuevas features deberían seguir este patrón.
- **Theming**: tema oscuro "Deep Sea" (tokens HSL en `src/index.css`, tipografías Inter/Figtree/IBM
  Plex Mono). Cambió por completo en el mismo refactor de `8c415c1` — si algo se ve "roto" visualmente
  comparado con capturas viejas, es porque el diseño cambió intencionalmente.
- **tsconfig estricto**: `noImplicitAny: true`, `strictNullChecks: true` (endurecido en esta sesión,
  commit `239134a`). `noUnusedLocals`/`noUnusedParameters` siguen en `false`. ESLint tiene
  `no-unused-vars` y `react-refresh/only-export-components` apagados a propósito.

---

## 4) Mapa de negocio por módulo (dónde vive cada regla)

### 4.1 Autenticación y roles
- `src/contexts/AuthContext.tsx`: sesión, perfil (`profiles`), rol más alto resuelto
  (`getHighestRole`, `src/lib/roles.ts`). `updateLastConnection` está throttlado a 5 min vía
  `sessionStorage` para no escribir en cada render.
- `src/pages/Auth.tsx`: login/signup. En signup pide teléfono y departamento. Tiene "recordar
  credenciales" solo en runtime nativo (Capacitor). Enlace a `/descargar-app` agregado esta sesión.
- `src/components/ProtectedRoute.tsx`: gate por `allowedRoles`/`excludedRoles`, redirige a `/auth`,
  y en nativo dispara los prompts de permisos de ubicación/notificaciones en el primer render.

### 4.2 Asistencia y geocercas (core del producto)
- **Marcaje**: `useAttendance.ts` (marcajes del día) invoca la edge function `validate-attendance`,
  que valida geocerca + horario + vacaciones activas antes de insertar en `attendance_marks`
  (vía RPC `validate_attendance_mark`).
- **Geocercas múltiples**: un empleado puede tener varias `work_locations` asignadas.
  `useWorkLocations.ts` lista las activas + la elegida (persistida en `localStorage` por usuario).
  `WorkLocationSelector.tsx` **fuerza** elegir una sede al iniciar sesión si el rol no es
  `global_manager`/`superadmin`. `useGeofenceConfig.ts` resuelve la config activa con fallback a la
  tabla legacy `geofence_config` si no hay `work_locations` (migración automática la primera vez que
  se abre el admin de sedes, ver `useWorkLocationsConfig.ts`).
- **Geolocalización**: `useGeolocation.ts` + `src/lib/location-service.ts` — abstrae nativo
  (Capacitor) vs web (`navigator.geolocation`), incluye tracking en segundo plano y cálculo Haversine.
  **El tracking en segundo plano en Android NO está completo**: hoy usa `watchPosition` como
  fallback, no un plugin/servicio nativo real (ver `docs/android-geolocation-remediation.md`).
- **Horarios por departamento**: `department_schedules` define ventanas de entrada/salida, toggles
  de "permitir entrada anticipada/tardía", y modo "sin descanso"/pausa. La validación de horario usa
  `Intl.DateTimeFormat` contra el timezone del departamento — **no usa librerías de fechas** para
  esto (`src/lib/attendance-metrics.ts`, `useDepartmentSchedule.ts`).
- **Modo de salida configurable** (superadmin, `app_config.attendance_checkout_mode`): manual por
  usuario, automático por horario, o automático por salida de geocerca (minutos configurable).
- **Tolerancia de tardanza**: `app_config.late_tolerance_minutes`, editable en Configuración.

### 4.3 Descansos
- `useRestSchedule.ts`: descansos individuales o por "grupos de descanso" (`rest_groups` +
  `rest_group_members`), con separación mínima configurable (global o por departamento,
  `rest_days_min_separation`/`rest_days_min_separation_departments`). Valida que no se pise un día ya
  trabajado. `useDepartmentSchedules.ts` (admin) notifica a los miembros cuando cambia el horario o
  el modo pausa de su departamento.

### 4.4 Vacaciones
- `useVacations.ts` + migraciones `20260214001000`–`20260217*`. **Accrual simple**:
  `earned_days = worked_days * accrual_rate` (`app_config.vacation_days_per_worked_day`, default
  ≈1 día por 12 trabajados). `available_days = earned_days - approved_days - pending_days` (RPC
  `get_vacation_balance`). **No existe balance negativo**: `request_vacation()` bloquea en origen si
  no alcanza el saldo — no hay concepto de "días tomados de más" ni deuda.
- Todas las mutaciones van por RPC (`request_vacation`, `cancel_vacation_request`,
  `review_vacation_request`), nunca `insert`/`update` directo — mantener ese patrón si se toca esto.
- **`docs/plan-implementacion-vacaciones.md` está desactualizado**: describe este módulo como un plan
  futuro, pero **ya está implementado por completo**. No confiar en ese doc para el estado actual.

### 4.5 Incidencias y ausencias
- **Incidencias** (`attendance_incidents`, `src/lib/incidents.ts`): tipos `olvidé marcar`,
  `tardanza`, `salida temprana`, `gps`, `geofence`; flujo `pending/approved/rejected`. Revisión por
  `department_head` (propio depto + `user_department_responsibilities` si gestiona varios) o
  `global_manager`/`superadmin` (`src/pages/management/IncidentsManagementPage.tsx`).
- **Revisión de ausencias** (`attendance_absence_reviews`, separado de incidencias): marca una
  ausencia como `is_justified` true/false vía upsert directo desde `Department.tsx` (department_head)
  o `useAttendanceSummary.ts`/`GlobalPanel.tsx` (global_manager/superadmin). Antes de esta sesión, el
  único efecto de esto era aparecer como "AJ"/"ANJ" en el reporte XLSX. **Ahora también dispara un
  descuento automático de nómina** (§4.9) — si vas a tocar este flujo, ten en cuenta que un trigger
  de base de datos depende de él.

### 4.6 Notificaciones
- `NotificationsContext.tsx`: tabla `notifications` con RLS por usuario, Realtime
  (`postgres_changes`) + polling de 30s de respaldo, toast + `Notification` nativa en insert. Incluye
  un job embebido (`syncRestScheduleReminder`) que crea/actualiza automáticamente un recordatorio si
  un employee/department_head no configuró descansos de la semana — es lógica de negocio escondida
  dentro de un Context, no un hook de dominio; vale la pena tenerlo presente si se busca dónde vive
  cierta regla y no aparece en `src/hooks/`.

### 4.7 Reportería (el subsistema más maduro/documentado)
- Pipeline completo ya documentado en detalle en `docs/pipeline-reporting-tecnico.md` y
  `docs/runbook-reporting-pipeline.md` — no se duplica aquí, solo el resumen:
  RPC `get_attendance_report_monthly` (con `attendance_daily_facts` como snapshot precalculado para
  escala) → Edge Function asíncrona `generate-monthly-report` → tabla `report_runs` (estado
  running/completed/failed, reintento = nueva fila) → artefacto en bucket Storage `monthly-reports`
  (signed URLs) → UI `ReportRunsCard` (poll 15s mientras hay corridas activas).
  `attendance_rule_versions` da trazabilidad de qué reglas estaban vigentes en cada corrida.
- **Exportación XLSX** (`src/lib/xlsx-export.ts`): matriz mensual por empleado, resumen con 6
  columnas (`Presente/Descanso/Tardanza/A Justificada/A Injustificada/Vacaciones`) — el layout de
  columnas cambió en el refactor de `8c415c1`.
- **Exportación a Google Sheets** (nueva, `20260707140000` + `supabase/functions/export-report-to-sheet/`):
  botón "Enviar a Sheets" en `GlobalPanel.tsx`. Auth vía JWT RS256 de cuenta de servicio Google
  (secret `GOOGLE_SERVICE_ACCOUNT_JSON`) + `app_config.google_sheets_report_spreadsheet_id`.
  **Riesgo real**: la función Deno **reimplementa a mano** la misma lógica de matriz que
  `xlsx-export.ts` (no puede importar `src/lib`) — mismos headers, mismos códigos de estado. Si
  cambian las columnas del XLSX hay que replicarlo ahí también; no hay contrato compartido ni test
  que detecte una desincronización futura.

### 4.8 Panel de superadmin
- `src/pages/SuperAdmin.tsx` + `useSuperAdmin.ts`: stats globales, audit log completo, consola SQL
  restringida (RPC `execute_superadmin_sql`, bloquea `BEGIN`/`COMMIT`/`ROLLBACK`), configuración de
  modo de salida, envío de reset de password, borrado/gestión de usuarios, import de histórico
  Excel, y (nuevo) la sección de publicación de APK (§4.10).

### 4.9 Ajustes y descuentos de nómina (implementado en esta sesión)
Ver `docs/resumen-ajustes-nomina.md` para el detalle completo. Resumen: campo
`profiles.monthly_salary`, tabla `payroll_adjustments` (RLS solo `global_manager`/`superadmin`),
trigger `SECURITY DEFINER` sobre `attendance_absence_reviews` que genera/revierte automáticamente un
descuento (`sueldo_mensual/30`) cuando una ausencia se marca/desmarca como no justificada. Página
`/nomina`: editar sueldos, ver historial (con filtro por departamento), registrar/revertir ajustes
manuales (vacaciones/otro). **Decisión de negocio explícita del usuario**: las vacaciones NO generan
descuento automático (son días pagados), solo ausencias no justificadas.

### 4.10 Distribución de la app Android desde la web (implementado en esta sesión)
Ver `docs/guia-publicar-app-movil.md`. Tabla `app_releases` + bucket público `app-releases` en
Storage. Superadmin sube la APK desde `/superadmin` (versión, version code, notas); página pública
`/descargar-app` (sin login) muestra la última versión por `version_code` y la sirve para descarga;
enlace desde `/auth`. El proceso de **compilar** la APK sigue siendo 100% manual (Android Studio, ver
`docs/guia-compilar-apk-android-studio.md`) — no hay CI que compile/firme automáticamente.

---

## 5) Inventario técnico completo (para no perderse nada)

### `src/hooks/` (20 archivos) — por dominio
Asistencia/geocerca: `useAttendance`, `useAttendanceSummary`, `useGeolocation`, `useGeofenceConfig`,
`useWorkLocations`, `useWorkLocationsConfig`. Horarios/deptos: `useDepartmentSchedule`,
`useDepartmentSchedules`, `useDepartments`, `useManagedDepartments`, `useGlobalManagerCheck`.
Descansos: `useRestSchedule`. Vacaciones: `useVacations`. Config/admin: `useGeneralConfig`,
`useUserManagement`, `useSuperAdmin`. Nuevo (esta sesión): `useAppReleases`,
`usePayrollAdjustments`. Genéricos de plataforma: `use-ui-mode`, `use-mobile`, `use-toast`.

### `src/pages/` (23 archivos)
`Index`, `Auth`, `Attendance`, `History`, `Incidents`, `Notifications`, `Profile`, `RestSchedule`,
`Vacations`, `Configuration`, `Department`, `DepartmentsManagement`, `GlobalPanel`, `UserManagement`,
`SuperAdmin`, `GpsDiagnostics`, `NotFound`, `DownloadApp` (nueva), `PayrollAdjustments` (nueva);
`employee/EmployeeMarkPage`, `employee/EmployeeWeekPage`, `employee/EmployeeIncidentsPage`,
`employee/EmployeeProfilePage`; `management/IncidentsManagementPage`.

### `src/components/` (por carpeta, sin contar `ui/` que son ~45 primitivas shadcn vendorizadas)
`attendance/`: `AttendanceButton`, `GeofenceIndicator`, `TodayMarks`. `dashboard/`: `MetricCard`.
`layout/`: `AdminShell`, `AppLayout`, `EmployeeShell`, `NotificationBell`, `WorkLocationSelector`.
`mobile/`: `PrimaryActionButton`, `StatusPill`. `configuration/`: `DepartmentScheduleCard`,
`ImportHistorySection`, `LocationMapPicker` (mini-mapa hecho a mano con tiles OSM, sin librería de
mapas), `WorkLocationsSection`. `reports/`: `ReportRunsCard`. `superadmin/`: `AppReleasesSection`
(nuevo). Sueltos: `AppErrorBoundary`, `AppRouterBoundary`, `NavLink`, `StatusBadge`, `ProtectedRoute`.

### `src/lib/` (13 archivos)
`attendance-metrics`, `auth-redirect`, `error-messages` (mapeo ES de errores por dominio), `errors`,
`incidents`, `last-connection`, `location-service`, `mobile-runtime`, `monthly-report-client`,
`notification-permissions`, `roles`, `utils`, `xlsx-export`.

### `src/contexts/` — `AuthContext`, `NotificationsContext`.

### `src/test/` — solo 4 archivos: `example.test.ts` (smoke), `incidents-utils.test.ts`,
`ui-mode.test.ts`, `setup.ts`. Cobertura real: únicamente utilidades puras (`lib/incidents.ts`,
`hooks/use-ui-mode.ts`). **Cero tests de componentes, hooks con estado/Supabase, o integración.**

### `supabase/migrations/` (43 archivos, cronológico)
1. Esquema inicial y roles (`20260129`–`20260202`).
2. Horarios de depto y reglas de marcaje (`20260204`–`20260205`).
3. Vacaciones y descansos (`20260214`–`20260217`, 7 archivos) — incluye
   `20260216151704_new-migration.sql`, **vacía (0 líneas)**, sin limpiar/documentar por qué existe.
4. Superadmin e integridad referencial (`20260228010000`–`010400`).
5. Incidencias de asistencia (`20260228194000`–`230000`).
6. Work locations y notificaciones (`20260302`–`20260303`).
7. Config global y modos de checkout (`20260303193000`–`20260304224500`).
8. Responsabilidades por depto e incidencias avanzadas (`20260305`).
9. Reporting pipeline fases 1–4 (`20260313170000`–`203000`).
10. Misceláneos (`20260325`–`20260424`): `last_connection`, desactivación de perfiles, fixes RLS.
11. Google Sheets (`20260707140000`).
12. App releases / descarga de APK (`20260720150000`).
13. Ajustes de nómina (`20260721000000`).

### `supabase/functions/` (8 edge functions, Deno)
`create-user`, `delete-user`, `generate-monthly-report`, `import-attendance-history`,
`reset-user-password`, `snapshot-daily-facts`, `validate-attendance`, `export-report-to-sheet`.
Solo 4 están en `config.toml` con `verify_jwt=false` (`create-user`, `validate-attendance`,
`generate-monthly-report`, `delete-user`) — el resto usa verificación JWT por defecto de Supabase.

### Android (`android/`, agregado completo en esta sesión)
Proyecto Capacitor estándar (`appId: com.elineas.asistencia`). **Sin CI**, sin keystore de release
en el repo (correcto — nunca debe commitearse), firma/compilación 100% manual hoy.

---

## 6) Problemas conocidos, inconsistencias y deuda técnica (consolidado)

> Fuentes: `docs/analisis-repositorio-2026-07-20.md`, `docs/usabilidad-calidad-reporte.md`,
> `docs/guia-remediacion-paso-a-paso.md`, `docs/analisis-escalabilidad-trazabilidad-reportes.md`,
> `docs/android-geolocation-remediation.md`, y hallazgos directos de esta sesión.

**Estructurales / proceso:**
- **No hay CI/CD** (`.github/workflows` no existe): lint/test/build/deploy son 100% manuales. Es el
  gap más grande para escalar el equipo.
- **La base de datos remota puede desincronizarse del historial de migraciones tracked por la CLI**:
  ocurrió realmente en esta sesión — una migración completa ya existía aplicada en la BD (idéntica
  byte a byte a un archivo del repo) pero sin registro en `supabase_migrations.schema_migrations`,
  lo que sugiere que alguien ejecutó SQL directo en el SQL Editor de Supabase (o vía Lovable) por
  fuera del flujo `db push`. Se reconcilió con `supabase migration repair`, pero es una señal de que
  el proceso de cambios de esquema no está 100% centralizado en las migraciones del repo. Antes de
  cualquier `db push` que falle de forma rara, correr `supabase migration list --linked` y
  `supabase db query --linked "..."` para diagnosticar antes de asumir que hay que revertir algo.
- **Sin seguridad de columna real**: `profiles.monthly_salary` (dato financiero sensible) depende de
  que ningún hook de rol bajo haga `select('*')` sobre `profiles` — Postgres RLS es por fila, no por
  columna. Hoy se verificó que ningún hook de `department_head`/`employee` hace `select('*')`, pero
  no hay ninguna barrera que lo impida a futuro.
- **`npm run lint` (sin acotar) puede fallar** por archivos generados en `android/app/build/...` que
  ESLint no debería analizar (`eslint.config.js` solo ignora `dist`). Hay una tarea sugerida pendiente
  para agregar `android` al ignore.

**Calidad de código / cobertura:**
- Cobertura de tests casi nula (ver §5). Ningún test cubre lógica crítica: validación de geocerca,
  cálculo de tardanza, accrual de vacaciones, ni el trigger nuevo de nómina.
- Bundle principal >1.8MB minificado (advertencia de Vite en cada build) — sin code splitting ni
  `manualChunks`.
- Auditoría de usabilidad/accesibilidad de 2026-02-05 (`docs/usabilidad-calidad-reporte.md`) listó 34
  hallazgos de lint, falta de `aria-label`/gestión de foco en menú móvil, mensajes de error crudos de
  Supabase expuestos al usuario, falta de code splitting — **no está confirmado cuánto de ese plan
  (`docs/guia-remediacion-paso-a-paso.md`, fases P0–P2) se ejecutó realmente**; vale la pena
  reverificar antes de asumir que sigue pendiente o que ya se resolvió.

**Duplicación / consistencia de datos:**
- `xlsx-export.ts` (cliente) y `export-report-to-sheet/index.ts` (edge function Deno) duplican a
  mano la misma lógica de matriz de reporte porque la función edge no puede importar `src/lib`. Sin
  test ni contrato compartido que detecte una desincronización futura si cambian las columnas.
- Migración vacía `20260216151704_new-migration.sql` sin explicación.
- `docs/plan-implementacion-vacaciones.md` describe como pendiente un módulo que **ya está
  implementado** — desactualizado, confunde a quien lo lea sin verificar el código primero.

**Funcionalidad incompleta conocida:**
- Background geolocation tracking en Android no usa un plugin/servicio nativo real, solo
  `watchPosition` como fallback (`docs/android-geolocation-remediation.md`).
- Particionamiento de `attendance_marks` sigue siendo "evaluar cuando se cruce un umbral" (>10M filas
  o p95>2s sostenido) — nunca implementado, condicional a futuro (`docs/analisis-escalabilidad-*.md`,
  `docs/pipeline-reporting-tecnico.md`).
- `docs/pruebas-carga-reportes.md` es una guía de cómo probar carga — no hay evidencia en el repo de
  que se haya ejecutado ni de resultados documentados.
- Distribución de APK: sin CI de compilación/firma; sin plugin de background location; divisor de
  nómina (`/30`) hardcodeado en SQL, no configurable.
- Ajustes de nómina no se reflejan en el reporte XLSX/Sheets, no quedan en `audit_log`, y el empleado
  no recibe ninguna notificación cuando se le aplica/revierte un ajuste.

---

## 7) Oportunidades de mejora priorizadas (para el próximo desarrollador)

**Alto impacto / estructural:**
1. Meter un pipeline de CI (lint + test + build por PR como mínimo) — hoy nada bloquea un merge roto.
2. Formalizar que TODO cambio de esquema pase por una migración en el repo (nunca SQL Editor directo)
   para evitar el drift que ya ocurrió una vez.
3. Expandir tests a lógica de negocio crítica: geocerca, cálculo de tardanza/accrual, el trigger de
   nómina, RLS de `payroll_adjustments`/`profiles.monthly_salary`.

**Medio impacto:**
4. Code splitting (`dynamic import()` / `manualChunks`) para el bundle de 1.8MB.
5. Contrato/test compartido (o generación desde una sola fuente) entre `xlsx-export.ts` y la función
   de Google Sheets, para que un cambio de columnas no desincronice ambos silenciosamente.
6. Reverificar el estado real de la auditoría de usabilidad/accesibilidad de febrero — cerrar lo que
   siga abierto o actualizar la documentación para reflejar lo que ya se resolvió.
7. Hacer configurable el divisor de nómina (`sueldo_mensual/30`) en vez de hardcodeado.
8. Reflejar los ajustes de nómina en reportería (XLSX/Sheets) y en `audit_log`.

**Bajo impacto / limpieza:**
9. Eliminar o documentar la migración vacía `20260216151704_new-migration.sql`.
10. Archivar o actualizar `docs/plan-implementacion-vacaciones.md` para que no confunda.
11. Agregar `android` al ignore de `eslint.config.js`.
12. Ejecutar formalmente el plan de `docs/pruebas-carga-reportes.md` y documentar resultados reales.
13. Evaluar un plugin real de background geolocation para Android si el negocio lo necesita.
14. Notificar al empleado cuando se le aplica/revierte un ajuste de nómina.

---

## 8) Convenciones de trabajo (aprendidas / establecidas en esta sesión)

- **Nunca pushear una migración a la BD real sin confirmar con el responsable del proyecto primero**
  — se estableció como práctica durante esta sesión ante cada cambio de esquema.
- **Antes de repetir un `db push` que falla**, diagnosticar con `supabase migration list --linked` y
  `supabase db query --linked` — puede que el objeto ya exista en remoto sin estar en el historial
  (ver §6); usar `supabase migration repair --status applied <version> --linked` para reconciliar,
  nunca asumir que hay que forzar/revertir.
- **Regenerar `types.ts`** después de cada migración aplicada:
  `npx supabase gen types typescript --project-id bogguolwffhdlusudgoh`.
- **Commits acotados**: no bundlear cambios no relacionados en un mismo commit aunque estén en el
  working tree al mismo tiempo (varias veces en esta sesión hubo cambios ajenos de otras fuentes —
  Lovable, trabajo en paralelo — mezclados en el árbol de trabajo).
- **Un `git push` a `main` no publica en Lovable** — falta el paso manual "Share → Publish".
- Extracción de lógica de páginas grandes hacia hooks custom (patrón ya establecido, ver §3) — seguir
  este patrón para nuevas pantallas de administración en vez de lógica inline en el componente.
- UI/copys en español, código/identificadores/comentarios en inglés (ya establecido en `CLAUDE.md`).

---

## 9) Índice completo de documentación existente (`docs/`)

No se duplica el contenido aquí — cada doc está resumido en la sección correspondiente arriba. Este
índice es para saber **dónde profundizar** en cada tema:

| Archivo | Qué cubre |
|---|---|
| `revision-historial-commits.md` | Historial de commits Feb–Mar 2026, patrón de branching, línea de tiempo de hitos. |
| `analisis-repositorio-2026-07-20.md` | Análisis profundo de arquitectura + estado de un refactor grande que se corrigió y commiteó durante esta sesión (bug real encontrado, tsconfig estricto, migraciones no aplicadas). |
| `usabilidad-calidad-reporte.md` | Auditoría de calidad/usabilidad/accesibilidad (2026-02-05), 34 hallazgos de lint + UX. |
| `guia-remediacion-paso-a-paso.md` | Plan de remediación en fases P0–P2 para el reporte anterior. |
| `analisis-escalabilidad-trazabilidad-reportes.md` | Diagnóstico de escalabilidad de reportería (N+1, cálculo en cliente) + roadmap de 90 días. |
| `pipeline-reporting-tecnico.md` | Documentación técnica del pipeline de reportería ya implementado. |
| `runbook-reporting-pipeline.md` | Runbook operativo: generación manual, reintentos, incidentes comunes. |
| `plan-implementacion-vacaciones.md` | **Desactualizado** — describe como plan un módulo ya implementado. |
| `pruebas-carga-reportes.md` | Guía de pruebas de carga del pipeline de reportes (sin evidencia de ejecución). |
| `android-geolocation-remediation.md` | Remediación de permisos GPS foreground/background en APK; background tracking real sigue pendiente. |
| `checklist-hardening-apk.md` | Checklist de hardening del build APK — todos los ítems marcados como completados. |
| `apk-instalacion-problemas.md` | Troubleshooting de instalación de APK (firma, minSdk, logcat). |
| `cambiar-icono-apk-android.md` | Procedimiento para cambiar el ícono de la app. |
| `comandos-aplicar-cambios-bd.md` | Comandos operativos para aplicar migraciones/RPC/índices, smoke tests, rollback manual. |
| `manual-usuario.md` | Manual de usuario final (español). |
| `guia-publicar-app-movil.md` | Cómo publicar una nueva versión de la APK desde `/superadmin` hacia `/descargar-app`. |
| `guia-compilar-apk-android-studio.md` | Cómo compilar la APK debug/release en Android Studio paso a paso. |
| `resumen-ajustes-nomina.md` | Resumen completo del módulo de ajustes/descuentos de nómina (esta sesión). |
| `CLAUDE.md` (raíz) | Guía de arquitectura de alto nivel para agentes/desarrolladores — leer primero. |

---

## 10) Estado del working tree al momento de este onboarding

Para que quien continúe no se confunda con el estado local:
- Working tree con cambios sin commitear al momento de escribir este documento: una actualización a
  `docs/analisis-repositorio-2026-07-20.md` (de una sesión anterior, pendiente de confirmación para
  commitear) y el filtro por departamento en `/nomina` (`usePayrollAdjustments.ts`/
  `PayrollAdjustments.tsx`, validado con `tsc`/`lint`/`build` pero sin commitear).
- Todo lo demás descrito en este documento (incluyendo el módulo de nómina base, la descarga de APK,
  y el proyecto Android) **ya está commiteado y pusheado a `main`** — pero recordar el paso de
  publicar en Lovable si no se ha hecho (§1).
