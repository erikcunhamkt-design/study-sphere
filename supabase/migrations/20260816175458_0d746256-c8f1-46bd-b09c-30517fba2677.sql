ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_state TEXT NOT NULL DEFAULT 'new_user',
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_cycle_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_events_user_event_idx ON public.onboarding_events (user_id, event, created_at DESC);

GRANT SELECT, INSERT ON public.onboarding_events TO authenticated;
GRANT ALL ON public.onboarding_events TO service_role;

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own onboarding events" ON public.onboarding_events;
CREATE POLICY "Users can read their own onboarding events"
ON public.onboarding_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own onboarding events" ON public.onboarding_events;
CREATE POLICY "Users can insert their own onboarding events"
ON public.onboarding_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);