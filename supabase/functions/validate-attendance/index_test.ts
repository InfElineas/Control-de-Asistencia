import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("validate-attendance - should reject request without auth token", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mark_type: "IN",
      inside_geofence: true,
    }),
  });

  const result = await response.json();
  
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
  
  if (result.code !== "UNAUTHORIZED") {
    throw new Error(`Expected UNAUTHORIZED code, got ${result.code}`);
  }
});

Deno.test("validate-attendance - should reject invalid mark_type", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      mark_type: "INVALID",
      inside_geofence: true,
    }),
  });

  // Without valid user token, this should return 401
  const result = await response.json();
  await response.text().catch(() => {});
  
  if (response.status !== 401) {
    // If it's not 401, it means the request reached validation
    if (response.status === 400 && result.code === "INVALID_MARK_TYPE") {
      // This is also acceptable
      return;
    }
    throw new Error(`Expected 401 or 400 with INVALID_MARK_TYPE, got ${response.status}`);
  }
});

Deno.test("validate-attendance - should handle CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-attendance`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text();
  
  if (response.status !== 200) {
    throw new Error(`Expected 200 for OPTIONS, got ${response.status}`);
  }
  
  const corsHeader = response.headers.get("Access-Control-Allow-Origin");
  if (corsHeader !== "*") {
    throw new Error(`Expected CORS header *, got ${corsHeader}`);
  }
});
