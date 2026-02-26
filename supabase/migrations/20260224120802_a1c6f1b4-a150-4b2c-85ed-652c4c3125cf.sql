
-- ============================
-- 1. DEVICES TABLE
-- ============================
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor text NOT NULL,
  model text NOT NULL,
  device_uid text NOT NULL,
  fw_version text,
  paired_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);

CREATE UNIQUE INDEX devices_unique_per_user ON public.devices(user_id, device_uid);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "devices_insert" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "devices_update" ON public.devices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "devices_delete" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- ============================
-- 2. BIOMARKER_SAMPLES TABLE
-- ============================
CREATE TABLE public.biomarker_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  type text NOT NULL,
  ts timestamptz NOT NULL,
  end_ts timestamptz,
  value numeric,
  payload_json jsonb,
  source text,
  raw_hash text NOT NULL
);

CREATE INDEX biomarker_lookup ON public.biomarker_samples(user_id, device_id, type, ts);
CREATE UNIQUE INDEX biomarker_raw_hash_unique ON public.biomarker_samples(raw_hash);

ALTER TABLE public.biomarker_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biomarker_samples_select" ON public.biomarker_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "biomarker_samples_insert" ON public.biomarker_samples FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "biomarker_samples_update" ON public.biomarker_samples FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "biomarker_samples_delete" ON public.biomarker_samples FOR DELETE USING (auth.uid() = user_id);

-- ============================
-- 3. DEVICE_SYNC_STATE TABLE
-- ============================
CREATE TABLE public.device_sync_state (
  user_id uuid NOT NULL,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  cursor_by_type jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, device_id)
);

ALTER TABLE public.device_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_sync_state_select" ON public.device_sync_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "device_sync_state_insert" ON public.device_sync_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "device_sync_state_update" ON public.device_sync_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "device_sync_state_delete" ON public.device_sync_state FOR DELETE USING (auth.uid() = user_id);
