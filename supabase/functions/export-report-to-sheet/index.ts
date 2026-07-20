import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ReportScope = 'global' | 'department';

interface ExportPayload {
  from: string;
  to: string;
  scope: ReportScope;
  department_id?: string | null;
  include_heads?: boolean;
}

interface AttendanceMonthlyRpcRow {
  date: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  status: string | null;
  in_timestamp: string | null;
  out_timestamp: string | null;
  lateness_minutes: number | null;
  absence_justification: string | null;
  inside_geofence: boolean | null;
  distance_m: number | null;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

const SUMMARY_HEADERS = ['Presente', 'Descanso', 'Tardanza', 'A Justificada', 'A Injustificada', 'Vacaciones'];
const STATUS_KEYS = ['PRESENTE', 'TARDE', 'AUSENTE', 'DESCANSO', 'NO_LABORABLE'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function buildMonthDays(monthKey: string): string[] {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, '0')}`);
}

function listMonthKeys(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function formatMonthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  const month = date.toLocaleDateString('es-ES', { month: 'long' });
  return `${month[0].toUpperCase()}${month.slice(1)} ${yearText}`;
}

interface MatrixRow {
  date: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  status: StatusKey;
  absence_justification: string | null;
  vacation_status: 'VACACIONES' | '-';
}

function buildAttendanceMatrixValues(data: MatrixRow[], from: string, to: string): Array<Array<string | number>> {
  const monthKeys = listMonthKeys(from, to);
  const detailMonthKey = monthKeys[monthKeys.length - 1] ?? getMonthKey(to);
  const detailMonthDays = buildMonthDays(detailMonthKey);

  type EmployeeAggregate = {
    department: string;
    name: string;
    email: string;
    monthlySummary: Record<string, Record<StatusKey, number> & { vacations: number; justified_absences: number; unjustified_absences: number }>;
    dailyStatus: Record<string, StatusKey>;
    dailyMeta: Record<string, { vacation: boolean; absenceJustification: string | null }>;
  };

  const emptySummary = () => ({
    PRESENTE: 0,
    TARDE: 0,
    AUSENTE: 0,
    DESCANSO: 0,
    NO_LABORABLE: 0,
    vacations: 0,
    justified_absences: 0,
    unjustified_absences: 0,
  });

  const employeeMap = new Map<string, EmployeeAggregate>();

  for (const row of data) {
    const key = `${row.department}||${row.employee_email}`;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        department: row.department,
        name: row.employee_name,
        email: row.employee_email,
        monthlySummary: {},
        dailyStatus: {},
        dailyMeta: {},
      });
    }

    const aggregate = employeeMap.get(key)!;
    const monthKey = getMonthKey(row.date);
    if (!aggregate.monthlySummary[monthKey]) {
      aggregate.monthlySummary[monthKey] = emptySummary();
    }

    aggregate.monthlySummary[monthKey][row.status] += 1;
    if (row.vacation_status === 'VACACIONES') aggregate.monthlySummary[monthKey].vacations += 1;
    if (row.status === 'AUSENTE' && row.absence_justification === 'JUSTIFICADA') aggregate.monthlySummary[monthKey].justified_absences += 1;
    if (row.status === 'AUSENTE' && row.absence_justification === 'NO_JUSTIFICADA') aggregate.monthlySummary[monthKey].unjustified_absences += 1;
    aggregate.dailyStatus[row.date] = row.status;
    aggregate.dailyMeta[row.date] = { vacation: row.vacation_status === 'VACACIONES', absenceJustification: row.absence_justification };
  }

  const headerRow1: Array<string | number> = ['Área', 'Nombres y apellidos'];
  const headerRow2: Array<string | number> = ['', ''];

  for (const monthKey of monthKeys) {
    const label = `Resumen ${formatMonthLabel(monthKey)}`;
    headerRow1.push(...SUMMARY_HEADERS.map(() => label));
    headerRow2.push(...SUMMARY_HEADERS);
  }

  const detailLabel = `Detalle ${formatMonthLabel(detailMonthKey)}`;
  for (const day of detailMonthDays) {
    headerRow1.push(detailLabel);
    headerRow2.push(Number(day.slice(-2)));
  }

  const detailSummaryLabel = `Resumen ${formatMonthLabel(detailMonthKey)}`;
  headerRow1.push(...SUMMARY_HEADERS.map(() => detailSummaryLabel));
  headerRow2.push(...SUMMARY_HEADERS);

  const rows: Array<Array<string | number>> = [headerRow1, headerRow2];
  const employees = Array.from(employeeMap.values()).sort(
    (a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name)
  );

  const statusCode = (status: StatusKey): string =>
    ({ PRESENTE: 'P', TARDE: 'T', AUSENTE: 'A', DESCANSO: 'D', NO_LABORABLE: 'NL' }[status]);

  for (const employee of employees) {
    const row: Array<string | number> = [employee.department, employee.name];

    for (const monthKey of monthKeys) {
      const summary = employee.monthlySummary[monthKey] || emptySummary();
      row.push(summary.PRESENTE, summary.DESCANSO, summary.TARDE, summary.justified_absences, summary.unjustified_absences, summary.vacations);
    }

    for (const day of detailMonthDays) {
      const status = employee.dailyStatus[day];
      const meta = employee.dailyMeta[day];
      if (!status) row.push('');
      else if (status === 'AUSENTE') {
        if (meta?.absenceJustification === 'JUSTIFICADA') row.push('AJ');
        else if (meta?.absenceJustification === 'NO_JUSTIFICADA') row.push('ANJ');
        else row.push('AP');
      } else if (meta?.vacation) row.push('V');
      else row.push(statusCode(status));
    }

    const detailSummary = employee.monthlySummary[detailMonthKey] || emptySummary();
    row.push(
      detailSummary.PRESENTE,
      detailSummary.DESCANSO,
      detailSummary.TARDE,
      detailSummary.justified_absences,
      detailSummary.unjustified_absences,
      detailSummary.vacations
    );

    rows.push(row);
  }

  return rows;
}

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGoogleAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const pemBody = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await response.json();
  if (!response.ok) {
    throw new Error(tokenData.error_description || tokenData.error || 'No se pudo obtener el token de acceso de Google');
  }
  return tokenData.access_token as string;
}

async function ensureSheetTab(spreadsheetId: string, accessToken: string, tabName: string): Promise<void> {
  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const meta = await metaResponse.json();
  if (!metaResponse.ok) {
    throw new Error(meta.error?.message || 'No se pudo leer la hoja de cálculo de Google');
  }

  const sheetExists = (meta.sheets || []).some((sheet: { properties: { title: string } }) => sheet.properties.title === tabName);
  if (sheetExists) return;

  const addResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
  });

  if (!addResponse.ok) {
    const addError = await addResponse.json().catch(() => ({}));
    throw new Error(addError.error?.message || `No se pudo crear la pestaña "${tabName}" en la hoja de cálculo`);
  }
}

async function writeSheetValues(
  spreadsheetId: string,
  accessToken: string,
  tabName: string,
  values: Array<Array<string | number>>
): Promise<void> {
  const encodedTab = encodeURIComponent(tabName);

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:ZZ10000:clear`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!clearResponse.ok) {
    const clearError = await clearResponse.json().catch(() => ({}));
    throw new Error(clearError.error?.message || 'No se pudo limpiar la pestaña destino antes de escribir');
  }

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateResponse.ok) {
    const updateError = await updateResponse.json().catch(() => ({}));
    throw new Error(updateError.error?.message || 'No se pudieron escribir los datos en Google Sheets');
  }
}

function sanitizeTabName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 100) || 'Reporte';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey ?? supabaseServiceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const userId = authData.user.id;

    const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', userId).in('role', ['global_manager', 'superadmin']);
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para exportar a Google Sheets' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as ExportPayload;
    const { from, to } = payload;
    const scope = payload.scope || 'global';
    const departmentId = payload.department_id ?? null;
    const includeHeads = Boolean(payload.include_heads);

    if (!from || !to) {
      return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: spreadsheetConfig } = await admin.from('app_config').select('value').eq('key', 'google_sheets_report_spreadsheet_id').maybeSingle();
    const spreadsheetId = typeof spreadsheetConfig?.value === 'string' ? spreadsheetConfig.value.trim() : '';
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar el ID de la hoja de cálculo de Google en Configuración > General' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar el secreto GOOGLE_SERVICE_ACCOUNT_JSON en las Edge Functions de Supabase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let credentials: ServiceAccountCredentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch {
      return new Response(JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let tabName = 'Global';
    if (departmentId) {
      const { data: departmentRow } = await admin.from('departments').select('name').eq('id', departmentId).maybeSingle();
      tabName = sanitizeTabName(departmentRow?.name || 'Departamento');
    }

    const { data: rpcData, error: rpcError } = await admin.rpc('get_attendance_report_monthly', {
      _from: from,
      _to: to,
      _department_id: departmentId,
      _scope: scope,
      _include_heads: includeHeads,
    });
    if (rpcError) throw rpcError;

    const rows = (rpcData || []) as AttendanceMonthlyRpcRow[];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

    const { data: vacationsData, error: vacationsError } = await admin
      .from('vacation_requests')
      .select('user_id, start_date, end_date, status')
      .in('user_id', userIds)
      .eq('status', 'approved')
      .lte('start_date', to)
      .gte('end_date', from);
    if (vacationsError) throw vacationsError;

    const vacationsByUser = new Map<string, Array<{ start_date: string; end_date: string }>>();
    (vacationsData || []).forEach((item) => {
      const existing = vacationsByUser.get(item.user_id) || [];
      existing.push({ start_date: item.start_date, end_date: item.end_date });
      vacationsByUser.set(item.user_id, existing);
    });

    const matrixRows: MatrixRow[] = rows.map((row) => ({
      date: row.date,
      user_id: row.user_id,
      employee_name: row.employee_name,
      employee_email: row.employee_email,
      department: row.department,
      status: (row.status as StatusKey) || 'AUSENTE',
      absence_justification: row.absence_justification,
      vacation_status: (vacationsByUser.get(row.user_id) || []).some(
        (vacation) => row.date >= vacation.start_date && row.date <= vacation.end_date
      )
        ? 'VACACIONES'
        : '-',
    }));

    const values = buildAttendanceMatrixValues(matrixRows, from, to);

    const accessToken = await getGoogleAccessToken(credentials);
    await ensureSheetTab(spreadsheetId, accessToken, tabName);
    await writeSheetValues(spreadsheetId, accessToken, tabName, values);

    await admin.from('audit_log').insert({
      user_id: userId,
      action: 'GOOGLE_SHEET_REPORT_EXPORTED',
      table_name: 'app_config',
      record_id: spreadsheetId,
      new_data: { scope, from, to, department_id: departmentId, include_heads: includeHeads, tab_name: tabName, row_count: rows.length },
    });

    return new Response(
      JSON.stringify({ success: true, spreadsheet_id: spreadsheetId, tab_name: tabName, row_count: rows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
