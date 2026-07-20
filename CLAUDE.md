# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Control de Asistencia — an attendance-tracking SPA (React + Vite + TypeScript) with Supabase as the
backend (Postgres + Auth + Storage + Edge Functions). It's a Lovable-managed project (edits made via
Lovable are pushed to this repo automatically) and also ships as an Android app via Capacitor.

## Commands

```bash
npm run dev             # start Vite dev server (port 8080)
npm run build            # production build
npm run build:dev        # build in development mode
npm run lint              # eslint .
npm run test              # vitest run (single run)
npm run test:watch        # vitest watch mode
npx vitest run src/test/incidents-utils.test.ts   # run a single test file
```

Mobile (Capacitor/Android):

```bash
npm run mobile:build      # npm run build (webDir=dist)
npm run mobile:sync       # npx cap sync android
npm run mobile:android    # open Android Studio project
npm run mobile:icon       # regenerate Android launcher icons
```

Database changes are Supabase SQL migrations under `supabase/migrations/`; apply with `supabase db push`
(see `docs/comandos-aplicar-cambios-bd.md`). There is no separate ORM — all DB access goes through the
generated `src/integrations/supabase/types.ts` typed client.

## Architecture

### Auth, roles and routing
- `src/contexts/AuthContext.tsx` owns the Supabase session, the `profiles` row, and the resolved
  `AppRole` (`employee | department_head | global_manager | superadmin`, priority-ordered in
  `src/lib/roles.ts::getHighestRole` — a user can hold multiple `user_roles` rows and the highest wins).
- Every route in `src/App.tsx` is wrapped in `ProtectedRoute` (`src/components/ProtectedRoute.tsx`),
  which gates on `allowedRoles`/`excludedRoles`, redirects unauthenticated users to `/auth`, and (on
  native runtimes) kicks off the location/notification permission prompts on first authenticated render.
- Authorization is enforced twice: client-side via `ProtectedRoute`/role checks, and server-side via
  Postgres RLS policies in the migrations — never trust the client check alone when reasoning about
  what a role can access.

### Dual UI shells (desktop vs. mobile employee)
- `src/hooks/use-ui-mode.ts::resolveUIMode` decides between `admin` and `employee` UI: mobile viewport
  (`useIsMobile`, <768px) + non-admin role → `employee`; admin roles (`department_head`,
  `global_manager`, `superadmin`) or desktop viewport → `admin`. A `?ui=employee` / `?ui=admin` query
  param overrides this for debugging on any protected route.
- `AdminShell` (`src/components/layout/AdminShell.tsx`) is the sidebar-based backoffice shell.
  `EmployeeShell` (`src/components/layout/EmployeeShell.tsx`) is the bottom-nav mobile shell
  (`Marcar` → `/attendance`, `Mi semana` → `/history`, `Incidencias` → `/incidents`, `Perfil` → `/profile`).
  Pages call `AppLayout`, which picks the shell based on `useUIMode`.

### Data layer
- No global state manager beyond React Query (`@tanstack/react-query`) + a few React contexts
  (`AuthContext`, `NotificationsContext`). Feature-specific server state lives in hooks under `src/hooks/`
  (e.g. `useAttendance`, `useVacations`, `useWorkLocations`, `useDepartmentSchedule`), each wrapping
  direct `supabase.from(...)` calls — there's no repository/service layer, hooks are the boundary.
- `src/integrations/supabase/client.ts` and `types.ts` are generated files (comment says "do not edit
  directly") — regenerate via the Supabase CLI rather than hand-editing when the schema changes.
- Geofenced attendance: employees can be assigned multiple work locations
  (`useWorkLocations`/`WorkLocationSelector`); geofence validation for check-in/out happens against the
  location selected for that session/device, enforced again server-side.

### Supabase Edge Functions (`supabase/functions/`, Deno)
Privileged operations that must not run with the user's own RLS-scoped session key run as Edge
Functions: `create-user`, `delete-user`, `reset-user-password`, `import-attendance-history`,
`generate-monthly-report`, `snapshot-daily-facts`, `validate-attendance`, `export-report-to-sheet`.

`export-report-to-sheet` pushes the same monthly attendance matrix used by `exportAttendanceMatrixXLSX`
(mirrored server-side, since Deno edge functions can't import client `src/lib` code) into a Google Sheet
tab, overwriting it each run. It authenticates to Google via a service-account JWT (RS256, signed with
Web Crypto) — requires the `GOOGLE_SERVICE_ACCOUNT_JSON` Edge Function secret (service account
credentials JSON; its `client_email` must be shared as an editor on the target spreadsheet) and the
`google_sheets_report_spreadsheet_id` `app_config` key (editable in Configuración → General).

### Monthly reporting pipeline
Async job pipeline backed by the `report_runs` table (status transitions `running` → `completed`/`failed`,
retried by creating a new row rather than mutating history) and a `monthly-reports` Storage bucket
(download via short-lived signed URLs). `attendance_daily_facts` is a precomputed snapshot table
(populated by `snapshot-daily-facts`) that the reporting RPC (`get_attendance_report_monthly`) reads for
performance at scale. Operational runbook: `docs/runbook-reporting-pipeline.md`; technical pipeline
details: `docs/pipeline-reporting-tecnico.md`; load-test notes: `docs/pruebas-carga-reportes.md`.

### Notifications
Centralized in-app notifications (bell icon + `/notifications` page) backed by a `notifications` table
with per-user RLS, surfaced through `NotificationsContext`. Generated on key events (attendance marks,
incident creation/review, schedule changes).

### Native runtime detection
`src/lib/mobile-runtime.ts::isNativeRuntime()` checks `window.Capacitor.isNativePlatform()` to
distinguish the Android WebView build from the regular web build. `src/App.tsx` swaps `BrowserRouter`
for `HashRouter` when native (file:// origins can't do path-based routing). Location/notification
permission requests (`src/lib/location-service.ts`, `src/lib/notification-permissions.ts`) are native-only
and gated behind this check.

## Required environment variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — required for `AuthContext` to function at all.
- `VITE_PUBLIC_APP_URL` — public domain used to build email confirmation/redirect links; if unset and the
  app is running on `localhost`, sign-up intentionally fails rather than emailing a broken link.
- `VITE_AUTH_REDIRECT_PATH` (optional) — path appended to `VITE_PUBLIC_APP_URL` for the auth redirect.

Corresponding Supabase dashboard config (Authentication → URL Configuration → Site URL / Redirect URLs)
must match the deployed domain, see `README.md` for the full checklist.

## Database migrations of note

Some features are gated on migrations that may not be applied in every environment — check for the
table/column before assuming a feature works:
- `20260228194000_add_attendance_incidents.sql` — required for `/incidents`.
- `20260302161000_add_work_locations.sql` — required for multi-location geofencing.
- `20260302174000_add_notifications_system.sql` — required for the notifications system.
- `20260313170000_monthly_attendance_reporting_rpc.sql` / `20260313183000_report_runs_pipeline.sql` /
  `20260313193000_phase3_analytics_scale.sql` / `20260313203000_phase4_hardening_observability.sql` —
  the monthly reporting pipeline, in build order.

## Docs worth checking before larger changes

- `docs/usabilidad-calidad-reporte.md` + `docs/guia-remediacion-paso-a-paso.md` — usability/quality audit
  and remediation plan.
- `docs/analisis-escalabilidad-trazabilidad-reportes.md` — scalability/traceability analysis for reporting.
- `docs/android-geolocation-remediation.md`, `docs/checklist-hardening-apk.md`,
  `docs/apk-instalacion-problemas.md`, `docs/cambiar-icono-apk-android.md` — Android/Capacitor specifics.
- `docs/manual-usuario.md` — end-user manual (Spanish).

## Conventions

- UI text and in-app copy are in Spanish (this is a Spanish-language product); code, identifiers, and
  comments are in English.
- UI components in `src/components/ui/` are shadcn-ui primitives — treat them as vendored, prefer
  composing over rewriting.
- Path alias `@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`/`vitest.config.ts`).
- ESLint has `@typescript-eslint/no-unused-vars` and `react-refresh/only-export-components` turned off
  project-wide — don't rely on lint to catch unused vars or non-component exports from component files.
