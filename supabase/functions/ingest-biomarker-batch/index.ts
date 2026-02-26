import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Deterministic hash for dedup — SHA-256 of canonical fields */
async function computeRawHash(
  userId: string,
  deviceUid: string,
  type: string,
  ts: string,
  endTs: string | null,
  value: number | null,
  payloadJson: Record<string, unknown> | null,
): Promise<string> {
  const payloadStr = payloadJson ? JSON.stringify(payloadJson, Object.keys(payloadJson).sort()) : '';
  const input = `${userId}|${deviceUid}|${type}|${ts}|${endTs ?? ''}|${value ?? ''}|${payloadStr}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Allowed biomarker types (core + V5 extended) */
const ALLOWED_TYPES = new Set([
  // Core (X3 + J5Vital)
  'sleep', 'hrv', 'spo2', 'temp', 'steps', 'hr',
  // V5 extended
  'ecg_history', 'ecg_raw', 'ppg', 'ppi', 'rr_interval',
]);

/** Max payload_json size per sample (bytes) — prevents ECG raw floods */
const MAX_SAMPLE_PAYLOAD_BYTES = 256 * 1024; // 256 KB

interface SampleInput {
  type: string;
  ts: string;
  end_ts?: string;
  value?: number | null;
  payload_json?: Record<string, unknown>;
  payload?: Record<string, unknown>; // alias accepted
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Auth
  const authHeader =
    req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized — Bearer token required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return json({ error: "Invalid or expired token" }, 401);
  }
  const userId = user.id;

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const deviceUid = typeof body.device_uid === "string" ? body.device_uid.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const vendor = typeof body.vendor === "string" ? body.vendor.trim() : "jstyle";
  const fwVersion = typeof body.fw_version === "string" ? body.fw_version.trim() : null;
  const samples = Array.isArray(body.samples) ? body.samples as SampleInput[] : [];

  if (!deviceUid) return json({ error: "device_uid is required" }, 400);
  if (!model) return json({ error: "model is required" }, 400);
  if (samples.length === 0) return json({ error: "samples array is required and must not be empty" }, 400);
  if (samples.length > 1000) return json({ error: "Max 1000 samples per batch" }, 400);

  // 3. Validate sample types
  const invalidTypes = samples.filter((s) => !ALLOWED_TYPES.has(s.type)).map((s) => s.type);
  if (invalidTypes.length > 0) {
    return json({ error: `Invalid sample types: ${[...new Set(invalidTypes)].join(', ')}` }, 400);
  }

  // 4. Check individual payload sizes
  const oversized: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const pj = samples[i].payload_json ?? samples[i].payload;
    if (pj) {
      const size = new TextEncoder().encode(JSON.stringify(pj)).length;
      if (size > MAX_SAMPLE_PAYLOAD_BYTES) oversized.push(i);
    }
  }
  if (oversized.length > 0) {
    return json({
      error: `${oversized.length} sample(s) exceed max payload size of ${MAX_SAMPLE_PAYLOAD_BYTES} bytes`,
      oversized_indices: oversized,
    }, 400);
  }

  // 5. Upsert device
  const { data: deviceData, error: deviceErr } = await supabase
    .from("devices")
    .upsert(
      {
        user_id: userId,
        device_uid: deviceUid,
        vendor,
        model,
        fw_version: fwVersion,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_uid" },
    )
    .select("id")
    .single();

  if (deviceErr || !deviceData) {
    return json({ error: deviceErr?.message ?? "Failed to upsert device" }, 500);
  }
  const deviceId = deviceData.id;

  // 6. Build rows with hashes
  let inserted = 0;
  let duplicates = 0;
  let errors = 0;
  const typesIngested = new Set<string>();

  const requestId = `req-${Date.now()}`;
  console.log(`[ingest][${requestId}] user=${userId} device=${deviceUid} model=${model} samples=${samples.length}`);

  const rows = await Promise.all(
    samples.map(async (s) => {
      const rawHash = await computeRawHash(
        userId,
        deviceUid,
        s.type,
        s.ts,
        s.end_ts ?? null,
        s.value ?? null,
        s.payload_json ?? null,
      );
      return {
        user_id: userId,
        device_id: deviceId,
        type: s.type,
        ts: s.ts,
        end_ts: s.end_ts ?? null,
        value: s.value ?? null,
        payload_json: s.payload_json ?? s.payload ?? null,
        source: s.source ?? "jstyle",
        raw_hash: rawHash,
      };
    }),
  );

  // 7. Bulk upsert in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from("biomarker_samples")
      .upsert(chunk, { onConflict: "raw_hash", ignoreDuplicates: true })
      .select("id, type");

    if (error) {
      console.error("Chunk insert error:", error.message);
      errors += chunk.length;
    } else {
      inserted += (data?.length ?? 0);
      duplicates += chunk.length - (data?.length ?? 0);
      data?.forEach((r: { type: string }) => typesIngested.add(r.type));
    }
  }

  // 8. Update sync state
  const cursorByType: Record<string, string> = {};
  for (const t of typesIngested) {
    const latestSample = rows
      .filter((r) => r.type === t)
      .sort((a, b) => b.ts.localeCompare(a.ts))[0];
    if (latestSample) cursorByType[t] = latestSample.ts;
  }

  await supabase.from("device_sync_state").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      last_sync_at: new Date().toISOString(),
      last_success_at: errors === 0 ? new Date().toISOString() : undefined,
      last_error: errors > 0 ? `${errors} samples failed` : null,
      cursor_by_type: cursorByType,
    },
    { onConflict: "user_id,device_id" },
  );

  console.log(`[ingest][${requestId}] done inserted=${inserted} duplicates=${duplicates} errors=${errors} types=${Array.from(typesIngested).join(',')}`);

  return json({
    success: true,
    device_id: deviceId,
    inserted,
    duplicates,
    errors,
    types: Array.from(typesIngested),
  });
});
