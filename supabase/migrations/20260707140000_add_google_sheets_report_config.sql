-- ID de la hoja de cálculo de Google donde se exportan los reportes por departamento/global
INSERT INTO public.app_config (key, value, description)
SELECT 'google_sheets_report_spreadsheet_id', '""'::jsonb, 'ID del Google Sheet destino para "Enviar a Google Sheets" desde el Panel Global'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_config WHERE key = 'google_sheets_report_spreadsheet_id'
);
