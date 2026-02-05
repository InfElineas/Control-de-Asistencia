import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidationRequest {
  mark_type: 'IN' | 'OUT';
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  distance_to_center?: number | null;
  inside_geofence?: boolean;
}

interface ValidationResult {
  allowed: boolean;
  reason: string | null;
  department_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get user info
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating attendance for user: ${user.id}`);

    // Parse request body
    const body: ValidationRequest = await req.json();
    const { mark_type, latitude, longitude, accuracy, distance_to_center, inside_geofence } = body;

    if (!mark_type || !['IN', 'OUT'].includes(mark_type)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de marcaje inválido', code: 'INVALID_MARK_TYPE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Call the validation function
    const { data: validationResult, error: validationError } = await supabaseAdmin
      .rpc('validate_attendance_mark', {
        _user_id: user.id,
        _mark_type: mark_type
      });

    if (validationError) {
      console.error('Validation error:', validationError);
      return new Response(
        JSON.stringify({ error: 'Error al validar asistencia', code: 'VALIDATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = validationResult?.[0] as ValidationResult | undefined;
    
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Error en la validación', code: 'VALIDATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validation result: allowed=${result.allowed}, reason=${result.reason}`);

    // If not allowed, return 403
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ 
          error: result.reason || 'No autorizado para registrar asistencia',
          code: 'FORBIDDEN',
          allowed: false
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check geofence if provided
    if (inside_geofence === false) {
      return new Response(
        JSON.stringify({ 
          error: 'Debes estar dentro de la zona permitida para marcar asistencia',
          code: 'OUTSIDE_GEOFENCE',
          allowed: false
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All validations passed - insert the attendance mark
    const { data: markData, error: insertError } = await supabaseAdmin
      .from('attendance_marks')
      .insert({
        user_id: user.id,
        mark_type: mark_type,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        distance_to_center: distance_to_center,
        inside_geofence: inside_geofence ?? true,
        blocked: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al registrar asistencia', code: 'INSERT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attendance marked successfully: ${markData.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        allowed: true,
        mark: markData,
        message: mark_type === 'IN' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
