
-- ============================================================
-- Dropar todas as policies RESTRICTIVE e recriar como PERMISSIVE
-- ============================================================

-- TABELAS EXISTENTES (policies originais já eram restrictive)

-- participantes
DROP POLICY IF EXISTS "Users can insert their own participante" ON public.participantes;
DROP POLICY IF EXISTS "Users can update their own participante" ON public.participantes;
DROP POLICY IF EXISTS "Users can view their own participante" ON public.participantes;
DROP POLICY IF EXISTS "p_delete" ON public.participantes;

CREATE POLICY "participantes_select" ON public.participantes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "participantes_insert" ON public.participantes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_update" ON public.participantes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_delete" ON public.participantes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- registros_dose (via participante_id)
DROP POLICY IF EXISTS "Users can insert their own registros" ON public.registros_dose;
DROP POLICY IF EXISTS "Users can update their own registros" ON public.registros_dose;
DROP POLICY IF EXISTS "Users can view their own registros" ON public.registros_dose;

CREATE POLICY "registros_dose_select" ON public.registros_dose FOR SELECT TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_insert" ON public.registros_dose FOR INSERT TO authenticated WITH CHECK (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_update" ON public.registros_dose FOR UPDATE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_delete" ON public.registros_dose FOR DELETE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));

-- resumos_diarios (via participante_id)
DROP POLICY IF EXISTS "Users can insert their own resumos" ON public.resumos_diarios;
DROP POLICY IF EXISTS "Users can update their own resumos" ON public.resumos_diarios;
DROP POLICY IF EXISTS "Users can view their own resumos" ON public.resumos_diarios;

CREATE POLICY "resumos_diarios_select" ON public.resumos_diarios FOR SELECT TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_insert" ON public.resumos_diarios FOR INSERT TO authenticated WITH CHECK (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_update" ON public.resumos_diarios FOR UPDATE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_delete" ON public.resumos_diarios FOR DELETE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));

-- referencias_populacionais
DROP POLICY IF EXISTS "Anyone can view referencias" ON public.referencias_populacionais;

CREATE POLICY "referencias_select" ON public.referencias_populacionais FOR SELECT USING (true);

-- ring_daily_data
DROP POLICY IF EXISTS "Users can view their own ring daily data" ON public.ring_daily_data;
DROP POLICY IF EXISTS "rdd_insert" ON public.ring_daily_data;
DROP POLICY IF EXISTS "rdd_update" ON public.ring_daily_data;
DROP POLICY IF EXISTS "rdd_delete" ON public.ring_daily_data;

CREATE POLICY "ring_daily_data_select" ON public.ring_daily_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_insert" ON public.ring_daily_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_update" ON public.ring_daily_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_delete" ON public.ring_daily_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_consents
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can view their own consents" ON public.user_consents;
DROP POLICY IF EXISTS "uc_update" ON public.user_consents;
DROP POLICY IF EXISTS "uc_delete" ON public.user_consents;

CREATE POLICY "user_consents_select" ON public.user_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_consents_insert" ON public.user_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_update" ON public.user_consents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_delete" ON public.user_consents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_integrations
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "ui_insert" ON public.user_integrations;
DROP POLICY IF EXISTS "ui_update" ON public.user_integrations;
DROP POLICY IF EXISTS "ui_delete" ON public.user_integrations;

CREATE POLICY "user_integrations_select" ON public.user_integrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_integrations_insert" ON public.user_integrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_update" ON public.user_integrations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_delete" ON public.user_integrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOVAS TABELAS (dropar restrictive e recriar permissive)

-- computed_states
DROP POLICY IF EXISTS "cs_select" ON public.computed_states;
DROP POLICY IF EXISTS "cs_insert" ON public.computed_states;
DROP POLICY IF EXISTS "cs_update" ON public.computed_states;
DROP POLICY IF EXISTS "cs_delete" ON public.computed_states;

CREATE POLICY "computed_states_select" ON public.computed_states FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "computed_states_insert" ON public.computed_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_update" ON public.computed_states FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_delete" ON public.computed_states FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- action_logs
DROP POLICY IF EXISTS "al_select" ON public.action_logs;
DROP POLICY IF EXISTS "al_insert" ON public.action_logs;
DROP POLICY IF EXISTS "al_update" ON public.action_logs;
DROP POLICY IF EXISTS "al_delete" ON public.action_logs;

CREATE POLICY "action_logs_select" ON public.action_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "action_logs_insert" ON public.action_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_update" ON public.action_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_delete" ON public.action_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- checkpoints
DROP POLICY IF EXISTS "ck_select" ON public.checkpoints;
DROP POLICY IF EXISTS "ck_insert" ON public.checkpoints;
DROP POLICY IF EXISTS "ck_update" ON public.checkpoints;
DROP POLICY IF EXISTS "ck_delete" ON public.checkpoints;

CREATE POLICY "checkpoints_select" ON public.checkpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "checkpoints_insert" ON public.checkpoints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_update" ON public.checkpoints FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_delete" ON public.checkpoints FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- daily_reviews
DROP POLICY IF EXISTS "dr_select" ON public.daily_reviews;
DROP POLICY IF EXISTS "dr_insert" ON public.daily_reviews;
DROP POLICY IF EXISTS "dr_update" ON public.daily_reviews;
DROP POLICY IF EXISTS "dr_delete" ON public.daily_reviews;

CREATE POLICY "daily_reviews_select" ON public.daily_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "daily_reviews_insert" ON public.daily_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_update" ON public.daily_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_delete" ON public.daily_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "np_select" ON public.notification_preferences;
DROP POLICY IF EXISTS "np_insert" ON public.notification_preferences;
DROP POLICY IF EXISTS "np_update" ON public.notification_preferences;
DROP POLICY IF EXISTS "np_delete" ON public.notification_preferences;

CREATE POLICY "notification_preferences_select" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "ur_select" ON public.user_roles;
DROP POLICY IF EXISTS "ur_insert" ON public.user_roles;
DROP POLICY IF EXISTS "ur_update" ON public.user_roles;
DROP POLICY IF EXISTS "ur_delete" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_baselines
DROP POLICY IF EXISTS "ub_select" ON public.user_baselines;
DROP POLICY IF EXISTS "ub_insert" ON public.user_baselines;
DROP POLICY IF EXISTS "ub_update" ON public.user_baselines;
DROP POLICY IF EXISTS "ub_delete" ON public.user_baselines;

CREATE POLICY "user_baselines_select" ON public.user_baselines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_baselines_insert" ON public.user_baselines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_update" ON public.user_baselines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_delete" ON public.user_baselines FOR DELETE TO authenticated USING (auth.uid() = user_id);
