import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_METRIC_KEYS = 64;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. JWT required
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized — Bearer token required" }, 401);
  }

  // 2. Client with ANON_KEY + caller JWT (RLS active)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // 3. Validate token & extract user_id
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return json({ error: "Invalid or expired token" }, 401);
  }
  const userId = user.id;

  // 4. Parse & validate body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const day = typeof body?.day === "string" ? body.day : "";
  const sourceProvider =
    typeof body?.source_provider === "string" && body.source_provider.trim().length > 0
      ? body.source_provider.trim()
      : "api";
  const metrics = body?.metrics;

  if (!DAY_REGEX.test(day)) {
    return json({ error: "Invalid day. Expected YYYY-MM-DD" }, 400);
  }
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return json({ error: "Invalid metrics. Expected non-empty object" }, 400);
  }
  const metricKeys = Object.keys(metrics as Record<string, unknown>);
  if (metricKeys.length === 0 || metricKeys.length > MAX_METRIC_KEYS) {
    return json({ error: `metrics must have 1–${MAX_METRIC_KEYS} keys` }, 400);
  }

  // 5. Upsert via RLS (anon + user JWT)
  try {
    const { data, error } = await supabase
      .from("ring_daily_data")
      .upsert(
        [{ user_id: userId, day, source_provider: sourceProvider, metrics }],
        { onConflict: "user_id,day,source_provider" },
      )
      .select();

    if (error) {
      return json({ error: error.message }, 500);
    }
    return json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
