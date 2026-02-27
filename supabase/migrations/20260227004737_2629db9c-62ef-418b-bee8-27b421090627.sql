
-- Add missing columns to participantes
ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS nome_publico text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS sexo text DEFAULT 'NAO_INFORMAR',
  ADD COLUMN IF NOT EXISTS altura_cm numeric,
  ADD COLUMN IF NOT EXISTS peso_kg numeric,
  ADD COLUMN IF NOT EXISTS objetivo_principal text,
  ADD COLUMN IF NOT EXISTS codigo text;

-- Add missing columns to user_integrations
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS scopes text[];

-- Add missing columns to referencias_populacionais
ALTER TABLE public.referencias_populacionais
  ADD COLUMN IF NOT EXISTS metrica text,
  ADD COLUMN IF NOT EXISTS faixa_min numeric,
  ADD COLUMN IF NOT EXISTS faixa_max numeric;

-- Add unique constraint for user_integrations upsert
CREATE UNIQUE INDEX IF NOT EXISTS user_integrations_user_provider_idx ON public.user_integrations (user_id, provider);

-- Add unique constraint for participantes upsert
CREATE UNIQUE INDEX IF NOT EXISTS participantes_user_id_idx ON public.participantes (user_id);
