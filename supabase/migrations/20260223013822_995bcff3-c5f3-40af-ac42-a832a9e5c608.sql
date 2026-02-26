
-- ============================================================
-- FIX: Recriar TODAS as policies como PERMISSIVE
-- Causa raiz: policies anteriores criadas como RESTRICTIVE
-- ============================================================

-- 1. action_logs
DROP POLICY IF EXISTS "action_logs_select" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_insert" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_update" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_delete" ON public.action_logs;

CREATE POLICY "action_logs_select" ON public.action_logs AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "action_logs_insert" ON public.action_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_update" ON public.action_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_delete" ON public.action_logs AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. checkpoints
DROP POLICY IF EXISTS "checkpoints_select" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_insert" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_update" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_delete" ON public.checkpoints;

CREATE POLICY "checkpoints_select" ON public.checkpoints AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "checkpoints_insert" ON public.checkpoints AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_update" ON public.checkpoints AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_delete" ON public.checkpoints AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. computed_states
DROP POLICY IF EXISTS "computed_states_select" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_insert" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_update" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_delete" ON public.computed_states;

CREATE POLICY "computed_states_select" ON public.computed_states AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "computed_states_insert" ON public.computed_states AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_update" ON public.computed_states AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_delete" ON public.computed_states AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. daily_reviews
DROP POLICY IF EXISTS "daily_reviews_select" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_insert" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_update" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_delete" ON public.daily_reviews;

CREATE POLICY "daily_reviews_select" ON public.daily_reviews AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "daily_reviews_insert" ON public.daily_reviews AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_update" ON public.daily_reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_delete" ON public.daily_reviews AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete" ON public.notification_preferences;

CREATE POLICY "notification_preferences_select" ON public.notification_preferences AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update" ON public.notification_preferences AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. participantes
DROP POLICY IF EXISTS "participantes_select" ON public.participantes;
DROP POLICY IF EXISTS "participantes_insert" ON public.participantes;
DROP POLICY IF EXISTS "participantes_update" ON public.participantes;
DROP POLICY IF EXISTS "participantes_delete" ON public.participantes;

CREATE POLICY "participantes_select" ON public.participantes AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "participantes_insert" ON public.participantes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_update" ON public.participantes AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_delete" ON public.participantes AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. registros_dose (usa participante_id via subquery)
DROP POLICY IF EXISTS "registros_dose_select" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_insert" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_update" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_delete" ON public.registros_dose;

CREATE POLICY "registros_dose_select" ON public.registros_dose AS PERMISSIVE FOR SELECT TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_insert" ON public.registros_dose AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_update" ON public.registros_dose AS PERMISSIVE FOR UPDATE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_delete" ON public.registros_dose AS PERMISSIVE FOR DELETE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));

-- 9. resumos_diarios (usa participante_id via subquery)
DROP POLICY IF EXISTS "resumos_diarios_select" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_insert" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_update" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_delete" ON public.resumos_diarios;

CREATE POLICY "resumos_diarios_select" ON public.resumos_diarios AS PERMISSIVE FOR SELECT TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_insert" ON public.resumos_diarios AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_update" ON public.resumos_diarios AS PERMISSIVE FOR UPDATE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_delete" ON public.resumos_diarios AS PERMISSIVE FOR DELETE TO authenticated USING (participante_id IN (SELECT id FROM public.participantes WHERE user_id = auth.uid()));

-- 10. ring_daily_data
DROP POLICY IF EXISTS "ring_daily_data_select" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_insert" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_update" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_delete" ON public.ring_daily_data;

CREATE POLICY "ring_daily_data_select" ON public.ring_daily_data AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_insert" ON public.ring_daily_data AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_update" ON public.ring_daily_data AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_delete" ON public.ring_daily_data AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 11. user_baselines
DROP POLICY IF EXISTS "user_baselines_select" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_insert" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_update" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_delete" ON public.user_baselines;

CREATE POLICY "user_baselines_select" ON public.user_baselines AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_baselines_insert" ON public.user_baselines AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_update" ON public.user_baselines AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_delete" ON public.user_baselines AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 12. user_consents
DROP POLICY IF EXISTS "user_consents_select" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_insert" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_update" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_delete" ON public.user_consents;

CREATE POLICY "user_consents_select" ON public.user_consents AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_consents_insert" ON public.user_consents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_update" ON public.user_consents AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_delete" ON public.user_consents AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 13. user_integrations
DROP POLICY IF EXISTS "user_integrations_select" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_insert" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_update" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_delete" ON public.user_integrations;

CREATE POLICY "user_integrations_select" ON public.user_integrations AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_integrations_insert" ON public.user_integrations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_update" ON public.user_integrations AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_delete" ON public.user_integrations AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 14. user_roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_update" ON public.user_roles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_delete" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 15. referencias_populacionais (SELECT público)
DROP POLICY IF EXISTS "referencias_select" ON public.referencias_populacionais;
CREATE POLICY "referencias_select" ON public.referencias_populacionais AS PERMISSIVE FOR SELECT TO authenticated USING (true);
