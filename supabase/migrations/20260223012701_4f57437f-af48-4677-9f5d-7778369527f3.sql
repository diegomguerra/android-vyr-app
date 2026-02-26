
-- =============================================
-- BLOCO 1: Recreate ALL RLS policies as PERMISSIVE
-- + Create avatars storage bucket
-- =============================================

-- action_logs
DROP POLICY IF EXISTS "action_logs_select" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_insert" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_update" ON public.action_logs;
DROP POLICY IF EXISTS "action_logs_delete" ON public.action_logs;
CREATE POLICY "action_logs_select" ON public.action_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "action_logs_insert" ON public.action_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_update" ON public.action_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_logs_delete" ON public.action_logs FOR DELETE USING (auth.uid() = user_id);

-- checkpoints
DROP POLICY IF EXISTS "checkpoints_select" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_insert" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_update" ON public.checkpoints;
DROP POLICY IF EXISTS "checkpoints_delete" ON public.checkpoints;
CREATE POLICY "checkpoints_select" ON public.checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checkpoints_insert" ON public.checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_update" ON public.checkpoints FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkpoints_delete" ON public.checkpoints FOR DELETE USING (auth.uid() = user_id);

-- computed_states
DROP POLICY IF EXISTS "computed_states_select" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_insert" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_update" ON public.computed_states;
DROP POLICY IF EXISTS "computed_states_delete" ON public.computed_states;
CREATE POLICY "computed_states_select" ON public.computed_states FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "computed_states_insert" ON public.computed_states FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_update" ON public.computed_states FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "computed_states_delete" ON public.computed_states FOR DELETE USING (auth.uid() = user_id);

-- daily_reviews
DROP POLICY IF EXISTS "daily_reviews_select" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_insert" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_update" ON public.daily_reviews;
DROP POLICY IF EXISTS "daily_reviews_delete" ON public.daily_reviews;
CREATE POLICY "daily_reviews_select" ON public.daily_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_reviews_insert" ON public.daily_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_update" ON public.daily_reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_reviews_delete" ON public.daily_reviews FOR DELETE USING (auth.uid() = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- participantes
DROP POLICY IF EXISTS "participantes_select" ON public.participantes;
DROP POLICY IF EXISTS "participantes_insert" ON public.participantes;
DROP POLICY IF EXISTS "participantes_update" ON public.participantes;
DROP POLICY IF EXISTS "participantes_delete" ON public.participantes;
CREATE POLICY "participantes_select" ON public.participantes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "participantes_insert" ON public.participantes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_update" ON public.participantes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participantes_delete" ON public.participantes FOR DELETE USING (auth.uid() = user_id);

-- registros_dose
DROP POLICY IF EXISTS "registros_dose_select" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_insert" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_update" ON public.registros_dose;
DROP POLICY IF EXISTS "registros_dose_delete" ON public.registros_dose;
CREATE POLICY "registros_dose_select" ON public.registros_dose FOR SELECT USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_insert" ON public.registros_dose FOR INSERT WITH CHECK (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_update" ON public.registros_dose FOR UPDATE USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "registros_dose_delete" ON public.registros_dose FOR DELETE USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));

-- resumos_diarios
DROP POLICY IF EXISTS "resumos_diarios_select" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_insert" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_update" ON public.resumos_diarios;
DROP POLICY IF EXISTS "resumos_diarios_delete" ON public.resumos_diarios;
CREATE POLICY "resumos_diarios_select" ON public.resumos_diarios FOR SELECT USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_insert" ON public.resumos_diarios FOR INSERT WITH CHECK (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_update" ON public.resumos_diarios FOR UPDATE USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));
CREATE POLICY "resumos_diarios_delete" ON public.resumos_diarios FOR DELETE USING (participante_id IN (SELECT id FROM participantes WHERE user_id = auth.uid()));

-- ring_daily_data
DROP POLICY IF EXISTS "ring_daily_data_select" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_insert" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_update" ON public.ring_daily_data;
DROP POLICY IF EXISTS "ring_daily_data_delete" ON public.ring_daily_data;
CREATE POLICY "ring_daily_data_select" ON public.ring_daily_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_insert" ON public.ring_daily_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_update" ON public.ring_daily_data FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ring_daily_data_delete" ON public.ring_daily_data FOR DELETE USING (auth.uid() = user_id);

-- user_baselines
DROP POLICY IF EXISTS "user_baselines_select" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_insert" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_update" ON public.user_baselines;
DROP POLICY IF EXISTS "user_baselines_delete" ON public.user_baselines;
CREATE POLICY "user_baselines_select" ON public.user_baselines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_baselines_insert" ON public.user_baselines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_update" ON public.user_baselines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_baselines_delete" ON public.user_baselines FOR DELETE USING (auth.uid() = user_id);

-- user_consents
DROP POLICY IF EXISTS "user_consents_select" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_insert" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_update" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_delete" ON public.user_consents;
CREATE POLICY "user_consents_select" ON public.user_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_consents_insert" ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_update" ON public.user_consents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_consents_delete" ON public.user_consents FOR DELETE USING (auth.uid() = user_id);

-- user_integrations
DROP POLICY IF EXISTS "user_integrations_select" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_insert" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_update" ON public.user_integrations;
DROP POLICY IF EXISTS "user_integrations_delete" ON public.user_integrations;
CREATE POLICY "user_integrations_select" ON public.user_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_integrations_insert" ON public.user_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_update" ON public.user_integrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_integrations_delete" ON public.user_integrations FOR DELETE USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE USING (auth.uid() = user_id);

-- referencias_populacionais
DROP POLICY IF EXISTS "referencias_select" ON public.referencias_populacionais;
CREATE POLICY "referencias_select" ON public.referencias_populacionais FOR SELECT USING (true);

-- Storage: avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
