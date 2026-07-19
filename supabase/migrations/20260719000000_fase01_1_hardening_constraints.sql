-- Fase 01.1 — hardening de constraints e privilégios.
-- Não edita as migrations já aplicadas (20260718231957, 20260718232030);
-- apenas estreita CHECKs frouxos e reduz grants desnecessários no cliente.

-- 1) Limites superiores coerentes para as preferências numéricas.
-- Os CHECKs originais só tinham piso (>0 / >=0), sem teto — um cliente mal-
-- intencionado ou com bug podia gravar, por exemplo, pomodoro_cycles = 999.
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_daily_study_goal_minutes_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_daily_study_goal_minutes_check
  CHECK (daily_study_goal_minutes BETWEEN 1 AND 1440);

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_pomodoro_focus_minutes_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_pomodoro_focus_minutes_check
  CHECK (pomodoro_focus_minutes BETWEEN 1 AND 240);

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_pomodoro_short_break_minutes_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_pomodoro_short_break_minutes_check
  CHECK (pomodoro_short_break_minutes BETWEEN 1 AND 120);

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_pomodoro_long_break_minutes_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_pomodoro_long_break_minutes_check
  CHECK (pomodoro_long_break_minutes BETWEEN 1 AND 240);

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_pomodoro_cycles_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_pomodoro_cycles_check
  CHECK (pomodoro_cycles BETWEEN 1 AND 20);

-- (week_starts_on já é BETWEEN 0 AND 6 e theme já é IN ('system','light',
-- 'dark') desde a migration inicial — nada a fazer nesses dois.)

-- 2) Campos de texto não podem virar "só espaços em branco".
-- timezone é NOT NULL mas nada impedia ''; full_name pode ficar vazio (é o
-- default quando o cadastro não envia nome), mas não pode virar '   '.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_timezone_not_blank_check
  CHECK (btrim(timezone) <> '');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_full_name_not_blank_check
  CHECK (full_name = '' OR btrim(full_name) <> '');

-- 3) Privilégios mínimos: profiles e user_preferences só são criados pelo
-- trigger on_auth_user_created (SECURITY DEFINER, ignora GRANTs), e nenhum
-- código do cliente faz INSERT/DELETE nessas tabelas (só SELECT/UPDATE do
-- próprio registro — ver src/hooks/use-preferences.tsx). Não há política de
-- RLS para DELETE em nenhuma das duas tabelas, então o GRANT DELETE já era
-- inofensivo; removemos mesmo assim por clareza de menor privilégio.
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
REVOKE INSERT, DELETE ON public.user_preferences FROM authenticated;

-- As políticas de INSERT ficam órfãs sem o GRANT correspondente (nunca mais
-- disparam) e são removidas para não sugerir que o cliente pode inserir
-- essas linhas diretamente — a única via de criação é o trigger.
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "prefs_insert_own" ON public.user_preferences;
