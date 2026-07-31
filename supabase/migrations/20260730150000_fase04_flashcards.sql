-- Fase 04 — Flashcards: cartões de revisão espaçada (SM-2 simplificado).
--
-- Escopo: tabela `flashcards` (cartão com o estado de agendamento
-- embutido na própria linha) e `flashcard_reviews` (log de revisões,
-- base das métricas de retenção), mais a função `submit_flashcard_review`
-- que aplica o algoritmo — toda a matemática do agendamento mora aqui;
-- o cliente nunca calcula nem envia interval/ease/due_at/state, só a
-- nota da revisão (rating).
--
-- Fora de escopo desta fase (decisões do Gate 1): tabela de "baralho"
-- dedicada — agrupamento é implícito por lesson_id, ou avulso quando
-- NULL; questões/simulados (Fase 05); qualquer bloco ou pacote de IA.
--
-- Segue o padrão de segurança das fases 01–03.3: RLS antes de grants,
-- REVOKE ALL antes de GRANT mínimo, FK composta para impedir vínculo
-- cruzado entre usuários, SECURITY INVOKER + SET search_path, SET LOCAL
-- lock_timeout antes de FOR UPDATE, mensagens em português — e, lição da
-- Fase 03.1, NUNCA usar ERRCODE 40001 para erro de negócio (o
-- PostgREST/pooler re-executa serialization_failure em loop infinito e a
-- resposta nunca chega ao cliente).

-- =====================================================================
-- 1) flashcards
-- =====================================================================
-- Estado de agendamento (state/learning_step/interval_days/ease/reps/
-- lapses/due_at) mora na própria linha do card, não em tabela separada:
-- é 1:1 por card (ao contrário das revisões, que são 1:N), então a fila
-- de "cards devidos" é um único SELECT com índice em due_at, e a RPC de
-- revisão trava e atualiza uma linha só.

CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NULL,
  source_block_id TEXT NULL,
  front JSONB NOT NULL,
  back JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'novo',
  learning_step SMALLINT NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease NUMERIC(4, 2) NOT NULL DEFAULT 2.50,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT flashcards_front_is_array_check CHECK (jsonb_typeof(front) = 'array'),
  CONSTRAINT flashcards_back_is_array_check CHECK (jsonb_typeof(back) = 'array'),
  -- 50 KB por lado é generoso para o conteúdo inline de um cartão;
  -- defesa contra payload abusivo, mesmo padrão de lesson_documents.
  CONSTRAINT flashcards_front_size_check CHECK (octet_length(front::text) <= 51200),
  CONSTRAINT flashcards_back_size_check CHECK (octet_length(back::text) <= 51200),
  CONSTRAINT flashcards_state_check CHECK (state IN ('novo', 'aprendendo', 'revisao')),
  CONSTRAINT flashcards_learning_step_check CHECK (learning_step >= 0),
  CONSTRAINT flashcards_interval_days_check CHECK (interval_days >= 0),
  CONSTRAINT flashcards_ease_check CHECK (ease >= 1.30),
  CONSTRAINT flashcards_reps_check CHECK (reps >= 0),
  CONSTRAINT flashcards_lapses_check CHECK (lapses >= 0),

  -- Suporte à FK composta filha de flashcard_reviews (id, user_id).
  CONSTRAINT flashcards_id_user_id_key UNIQUE (id, user_id),

  -- lesson_id NULL pula a checagem (MATCH SIMPLE, padrão do Postgres) —
  -- é assim que o cartão avulso (sem aula) é permitido; quando lesson_id
  -- não é nulo, garante que a aula pertence ao MESMO usuário. ON DELETE
  -- SET NULL só na coluna lesson_id (sintaxe de lista de colunas,
  -- PG15+): apagar a aula não apaga o cartão nem o histórico de
  -- revisões dele — só desvincula, e o cartão sobrevive como avulso.
  CONSTRAINT flashcards_lesson_user_fkey
    FOREIGN KEY (lesson_id, user_id)
    REFERENCES public.lessons(id, user_id)
    ON DELETE SET NULL (lesson_id)
);

CREATE INDEX flashcards_due_queue_idx
  ON public.flashcards (user_id, due_at)
  WHERE is_archived = false;

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.flashcards
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.flashcards
  TO authenticated;

GRANT ALL ON public.flashcards TO service_role;

CREATE POLICY "flashcards_select_own" ON public.flashcards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "flashcards_insert_own" ON public.flashcards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_update_own" ON public.flashcards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_delete_own" ON public.flashcards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reaproveita a set_updated_at() já existente (Fase 01).
CREATE TRIGGER flashcards_set_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- O grant de INSERT/UPDATE acima existe para permitir criação e edição
-- legítima de front/back/lesson_id/is_archived pelo cliente — mas isso
-- também abriria uma via para o cliente escrever DIRETO nas colunas de
-- agendamento (state/learning_step/interval_days/ease/reps/lapses/
-- due_at), seja forjando um agendamento já avançado na CRIAÇÃO (achado
-- da auditoria do Gate 2: o trigger original só cobria UPDATE), seja
-- inflando estatísticas por UPDATE direto depois. Mesmo princípio de
-- enforce_lesson_document_versioning (Fase 03.1): o estado que a UI
-- promete refletir tem que ser garantido pelo banco, não pela disciplina
-- do cliente. A própria submit_flashcard_review sinaliza sua escrita
-- legítima via set_config local (nunca visível/setável pelo cliente
-- através da API pública) antes do UPDATE — INSERT nunca precisa desse
-- sinal, porque todo cartão novo só pode nascer no estado inicial padrão.
CREATE OR REPLACE FUNCTION public.enforce_flashcard_schedule_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.flashcard_schedule_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'novo'
       OR NEW.learning_step <> 0
       OR NEW.interval_days <> 0
       OR NEW.ease <> 2.50
       OR NEW.reps <> 0
       OR NEW.lapses <> 0
       OR NEW.due_at IS NOT NULL THEN
      RAISE EXCEPTION 'Um cartão novo só pode ser criado com o agendamento inicial padrão (sem revisões ainda)'
        USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.state IS DISTINCT FROM OLD.state
     OR NEW.learning_step IS DISTINCT FROM OLD.learning_step
     OR NEW.interval_days IS DISTINCT FROM OLD.interval_days
     OR NEW.ease IS DISTINCT FROM OLD.ease
     OR NEW.reps IS DISTINCT FROM OLD.reps
     OR NEW.lapses IS DISTINCT FROM OLD.lapses
     OR NEW.due_at IS DISTINCT FROM OLD.due_at THEN
    RAISE EXCEPTION 'O estado de agendamento do cartão só pode mudar através de uma revisão real'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_flashcard_schedule_immutability()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER flashcards_enforce_schedule_immutability
  BEFORE INSERT OR UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_flashcard_schedule_immutability();

-- =====================================================================
-- 2) flashcard_reviews — log de revisões, base das métricas de retenção
-- =====================================================================
-- Sem UPDATE nem DELETE para authenticated — o dono do cartão não pode
-- alterar uma revisão já registrada. A única forma de uma revisão
-- desaparecer é em cascata, quando o cartão é excluído (decisão do
-- operador no Gate 1: excluir um flashcard remove o histórico dele das
-- métricas — documentado também na auditoria da fase).

CREATE TABLE public.flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating TEXT NOT NULL,
  resulting_state TEXT NOT NULL,
  resulting_interval_days INTEGER NOT NULL,
  resulting_ease NUMERIC(4, 2) NOT NULL,

  CONSTRAINT flashcard_reviews_rating_check
    CHECK (rating IN ('errei', 'dificil', 'bom', 'facil')),
  CONSTRAINT flashcard_reviews_resulting_state_check
    CHECK (resulting_state IN ('novo', 'aprendendo', 'revisao')),
  CONSTRAINT flashcard_reviews_resulting_interval_days_check
    CHECK (resulting_interval_days >= 0),
  CONSTRAINT flashcard_reviews_resulting_ease_check
    CHECK (resulting_ease >= 1.30),

  -- Chave composta: a revisão só pode apontar para um cartão do MESMO
  -- user_id — impede histórico cruzado entre usuários no banco. Cascade
  -- decidido no Gate 1 (ver comentário acima da tabela).
  CONSTRAINT flashcard_reviews_flashcard_user_fkey
    FOREIGN KEY (flashcard_id, user_id)
    REFERENCES public.flashcards(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX flashcard_reviews_metrics_idx
  ON public.flashcard_reviews (user_id, reviewed_at);

ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.flashcard_reviews
  FROM PUBLIC, anon, authenticated;

-- INSERT é necessário para authenticated porque submit_flashcard_review
-- é SECURITY INVOKER (roda com o privilégio de quem chama, não elevado)
-- — mesmo motivo pelo qual lesson_document_versions concede INSERT
-- direto na Fase 03.1. SELECT/INSERT apenas: nenhuma policy de
-- UPDATE/DELETE para authenticated.
GRANT SELECT, INSERT
  ON TABLE public.flashcard_reviews
  TO authenticated;

GRANT ALL ON public.flashcard_reviews TO service_role;

CREATE POLICY "flashcard_reviews_select_own" ON public.flashcard_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "flashcard_reviews_insert_own" ON public.flashcard_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 3) submit_flashcard_review — aplica o SM-2 simplificado (Gate 1 §1,
--    com o ajuste de graduação imediata em "Fácil" aprovado no fechamento
--    do gate)
-- =====================================================================
-- Toda a lógica de agendamento mora aqui — o cliente nunca calcula nem
-- envia interval/ease/due_at/state, só a nota (rating). Trava a linha do
-- cartão com FOR UPDATE (lock_timeout de 5s: nunca espera indefinidamente
-- — mesma defesa da Fase 03.1) para serializar corretamente duas
-- revisões concorrentes do mesmo cartão. Diferente de
-- save_lesson_document, não há "versão esperada" enviada pelo cliente —
-- cada revisão avança a partir do estado atual travado, então não existe
-- cenário de conflito a rejeitar; só serialização.
--
-- Transições:
--   novo        + facil                            -> revisao (graduação imediata), interval=4d, ease inalterado
--   novo        + errei/dificil/bom                 -> aprendendo, step=0, interval=1d (nota fica no log, não muda o agendamento no 1º contato)
--   aprendendo  + facil                             -> revisao (graduação imediata), interval=4d, ease inalterado
--   aprendendo  + errei                             -> aprendendo, step=0, interval=1d (não é lapso)
--   aprendendo  + dificil/bom, não é o último passo -> aprendendo, avança para o próximo passo
--   aprendendo  + dificil/bom, é o último passo     -> revisao (graduação), interval = passo atual (3d)
--   revisao     + errei   -> LAPSO: lapses+=1, ease=max(1.3, ease-0.20), volta para aprendendo, step=0, interval=1d
--   revisao     + dificil -> ease=max(1.3, ease-0.15), interval=ceil(interval*1.2)
--   revisao     + bom     -> interval=ceil(interval*ease)
--   revisao     + facil   -> ease=ease+0.15, interval=ceil(interval*ease*1.3)
-- due_at = reviewed_at + interval_days dias; reps += 1 em toda revisão.

CREATE FUNCTION public.submit_flashcard_review(
  p_flashcard_id UUID,
  p_rating TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_card public.flashcards%ROWTYPE;
  v_learning_steps INTEGER[] := ARRAY[1, 3];
  v_graduating_interval INTEGER := 4;
  v_reviewed_at TIMESTAMPTZ := now();
  v_new_state TEXT;
  v_new_step SMALLINT;
  v_new_interval INTEGER;
  v_new_ease NUMERIC(4, 2);
  v_new_lapses INTEGER;
  v_new_reps INTEGER;
  v_new_due_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_rating IS NULL OR p_rating NOT IN ('errei', 'dificil', 'bom', 'facil') THEN
    RAISE EXCEPTION 'Nota de revisão inválida' USING ERRCODE = '22023';
  END IF;

  -- Nunca espera o lock da linha indefinidamente (mesma defesa da Fase
  -- 03.1, migration 20260727130000).
  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_card
  FROM public.flashcards f
  WHERE f.id = p_flashcard_id AND f.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cartão não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_card.is_archived THEN
    RAISE EXCEPTION 'Não é possível revisar um cartão arquivado' USING ERRCODE = '22023';
  END IF;

  v_new_lapses := v_card.lapses;
  v_new_ease := v_card.ease;

  IF v_card.state IN ('novo', 'aprendendo') AND p_rating = 'facil' THEN
    -- Graduação imediata (ajuste aprovado no fechamento do Gate 1):
    -- Fácil em novo ou aprendendo pula direto para revisão.
    v_new_state := 'revisao';
    v_new_step := 0;
    v_new_interval := v_graduating_interval;

  ELSIF v_card.state = 'novo' THEN
    v_new_state := 'aprendendo';
    v_new_step := 0;
    v_new_interval := v_learning_steps[1];

  ELSIF v_card.state = 'aprendendo' THEN
    IF p_rating = 'errei' THEN
      v_new_state := 'aprendendo';
      v_new_step := 0;
      v_new_interval := v_learning_steps[1];
    ELSIF v_card.learning_step + 1 >= array_length(v_learning_steps, 1) THEN
      -- Completou o último passo: graduação.
      v_new_state := 'revisao';
      v_new_step := 0;
      v_new_interval := v_learning_steps[array_length(v_learning_steps, 1)];
    ELSE
      v_new_state := 'aprendendo';
      v_new_step := v_card.learning_step + 1;
      v_new_interval := v_learning_steps[v_new_step + 1];
    END IF;

  ELSE -- v_card.state = 'revisao'
    v_new_step := 0;
    IF p_rating = 'errei' THEN
      -- LAPSO: só existe quando um cartão já graduado é esquecido.
      v_new_state := 'aprendendo';
      v_new_lapses := v_card.lapses + 1;
      v_new_ease := GREATEST(1.30, v_card.ease - 0.20);
      v_new_interval := v_learning_steps[1];
    ELSIF p_rating = 'dificil' THEN
      v_new_state := 'revisao';
      v_new_ease := GREATEST(1.30, v_card.ease - 0.15);
      v_new_interval := CEIL(v_card.interval_days * 1.2)::INTEGER;
    ELSIF p_rating = 'bom' THEN
      v_new_state := 'revisao';
      v_new_interval := CEIL(v_card.interval_days * v_card.ease)::INTEGER;
    ELSE -- facil
      v_new_state := 'revisao';
      -- Teto de 5.00: evita estourar o NUMERIC(4,2) em uso legítimo
      -- extremo (muitas revisões "fácil" seguidas).
      v_new_ease := LEAST(v_card.ease + 0.15, 5.00);
      v_new_interval := CEIL(v_card.interval_days * v_card.ease * 1.3)::INTEGER;
    END IF;
  END IF;

  -- Teto de ~100 anos: evita due_at absurdamente distante em uso
  -- legítimo extremo (ease alto composto por muitas revisões).
  v_new_interval := LEAST(v_new_interval, 36500);

  v_new_reps := v_card.reps + 1;
  v_new_due_at := v_reviewed_at + make_interval(days => v_new_interval);

  -- Sinaliza pra enforce_flashcard_schedule_immutability que esta é a
  -- escrita legítima do algoritmo, não um UPDATE direto do cliente. É
  -- local à transação (terceiro argumento true = SET LOCAL): nunca
  -- vaza para fora desta chamada de RPC nem é setável pelo cliente
  -- através da API pública.
  PERFORM set_config('app.flashcard_schedule_update', 'on', true);

  UPDATE public.flashcards
  SET state = v_new_state,
      learning_step = v_new_step,
      interval_days = v_new_interval,
      ease = v_new_ease,
      reps = v_new_reps,
      lapses = v_new_lapses,
      due_at = v_new_due_at
  WHERE id = v_card.id;

  INSERT INTO public.flashcard_reviews
    (user_id, flashcard_id, reviewed_at, rating, resulting_state, resulting_interval_days, resulting_ease)
  VALUES
    (auth.uid(), v_card.id, v_reviewed_at, p_rating, v_new_state, v_new_interval, v_new_ease);

  RETURN jsonb_build_object(
    'flashcard_id', v_card.id,
    'state', v_new_state,
    'learning_step', v_new_step,
    'interval_days', v_new_interval,
    'ease', v_new_ease,
    'reps', v_new_reps,
    'lapses', v_new_lapses,
    'due_at', v_new_due_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_flashcard_review(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_flashcard_review(UUID, TEXT) TO authenticated;
