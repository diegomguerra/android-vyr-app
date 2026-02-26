
-- ============================================================
-- 1. TABELAS FALTANTES
-- ============================================================

-- computed_states
CREATE TABLE public.computed_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  score NUMERIC,
  pillars JSONB NOT NULL DEFAULT '{}'::jsonb,
  level TEXT,
  phase TEXT,
  raw_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

-- action_logs
CREATE TABLE public.action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- checkpoints
CREATE TABLE public.checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  checkpoint_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_reviews
CREATE TABLE public.daily_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  focus_score INTEGER,
  energy_score INTEGER,
  mood_score INTEGER,
  clarity_score INTEGER,
  stress_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

-- notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notification_preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_summary BOOLEAN NOT NULL DEFAULT true,
  insight_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles (sem FK para auth.users)
CREATE TYPE public.app_role AS ENUM ('admin', 'participant', 'researcher');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- user_baselines
CREATE TABLE public.user_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric TEXT NOT NULL,
  mean NUMERIC NOT NULL,
  stddev NUMERIC NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  window_start DATE,
  window_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric)
);

-- ============================================================
-- 2. UNIQUE CONSTRAINT em ring_daily_data
-- ============================================================
ALTER TABLE public.ring_daily_data
  ADD CONSTRAINT ring_daily_data_user_day_provider_unique
  UNIQUE (user_id, day, source_provider);

-- ============================================================
-- 3. ENABLE RLS em TODAS as novas tabelas
-- ============================================================
ALTER TABLE public.computed_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_baselines ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES - NOVAS TABELAS (SELECT/INSERT/UPDATE/DELETE)
-- ============================================================

-- computed_states
CREATE POLICY "cs_select" ON public.computed_states FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cs_insert" ON public.computed_states FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cs_update" ON public.computed_states FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cs_delete" ON public.computed_states FOR DELETE USING (auth.uid() = user_id);

-- action_logs
CREATE POLICY "al_select" ON public.action_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "al_insert" ON public.action_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "al_update" ON public.action_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "al_delete" ON public.action_logs FOR DELETE USING (auth.uid() = user_id);

-- checkpoints
CREATE POLICY "ck_select" ON public.checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ck_insert" ON public.checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ck_update" ON public.checkpoints FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ck_delete" ON public.checkpoints FOR DELETE USING (auth.uid() = user_id);

-- daily_reviews
CREATE POLICY "dr_select" ON public.daily_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dr_insert" ON public.daily_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dr_update" ON public.daily_reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dr_delete" ON public.daily_reviews FOR DELETE USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- notification_preferences
CREATE POLICY "np_select" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "np_insert" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np_update" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np_delete" ON public.notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ur_insert" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ur_update" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ur_delete" ON public.user_roles FOR DELETE USING (auth.uid() = user_id);

-- user_baselines
CREATE POLICY "ub_select" ON public.user_baselines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ub_insert" ON public.user_baselines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ub_update" ON public.user_baselines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ub_delete" ON public.user_baselines FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. RLS POLICIES FALTANTES - TABELAS EXISTENTES
-- ============================================================

-- ring_daily_data: faltam INSERT, UPDATE, DELETE
CREATE POLICY "rdd_insert" ON public.ring_daily_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rdd_update" ON public.ring_daily_data FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rdd_delete" ON public.ring_daily_data FOR DELETE USING (auth.uid() = user_id);

-- user_integrations: faltam INSERT, UPDATE, DELETE
CREATE POLICY "ui_insert" ON public.user_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ui_update" ON public.user_integrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ui_delete" ON public.user_integrations FOR DELETE USING (auth.uid() = user_id);

-- user_consents: faltam UPDATE, DELETE
CREATE POLICY "uc_update" ON public.user_consents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uc_delete" ON public.user_consents FOR DELETE USING (auth.uid() = user_id);

-- participantes: falta DELETE
CREATE POLICY "p_delete" ON public.participantes FOR DELETE USING (auth.uid() = user_id);

-- webhook_logs: bloquear tudo para anon (nenhuma policy = service_role only, RLS já está enabled)

-- ============================================================
-- 6. has_role SECURITY DEFINER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- 7. TRIGGERS updated_at para novas tabelas
-- ============================================================
CREATE TRIGGER update_computed_states_updated_at BEFORE UPDATE ON public.computed_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_action_logs_updated_at BEFORE UPDATE ON public.action_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checkpoints_updated_at BEFORE UPDATE ON public.checkpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_reviews_updated_at BEFORE UPDATE ON public.daily_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_baselines_updated_at BEFORE UPDATE ON public.user_baselines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
