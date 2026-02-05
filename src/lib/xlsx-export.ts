import * as XLSX from 'xlsx';

export interface AttendanceReportRow {
  date: string;
  employee_name: string;
  employee_email: string;
  department: string;
  status: 'PRESENTE' | 'TARDE' | 'AUSENTE' | 'DESCANSO' | 'NO_LABORABLE';
  in_time: string | null;
  out_time: string | null;
  lateness_minutes: number | null;
  inside_geofence: boolean | null;
  distance_m: number | null;
}

export function exportToXLSX(data: AttendanceReportRow[], filename: string) {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet format with headers in Spanish
  const wsData = data.map(row => ({
    'Fecha': row.date,
    'Empleado': row.employee_name,
    'Email': row.employee_email,
    'Departamento': row.department,
    'Estado': row.status,
    'Hora Entrada': row.in_time || '-',
    'Hora Salida': row.out_time || '-',
    'Minutos Tardanza': row.lateness_minutes ?? '-',
    'Dentro Geofence': row.inside_geofence === null ? '-' : (row.inside_geofence ? 'Sí' : 'No'),
    'Distancia (m)': row.distance_m ?? '-',
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 25 },  // Empleado
    { wch: 30 },  // Email
    { wch: 18 },  // Departamento
    { wch: 15 },  // Estado
    { wch: 12 },  // Hora Entrada
    { wch: 12 },  // Hora Salida
    { wch: 18 },  // Minutos Tardanza
    { wch: 15 },  // Dentro Geofence
    { wch: 12 },  // Distancia
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

  // Generate file and download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
