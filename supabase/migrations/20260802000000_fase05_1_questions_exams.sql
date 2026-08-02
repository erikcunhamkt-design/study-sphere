-- Fase 05.1 — Questões e simulados.
--
-- Escopo: banco de questões manual (múltipla escolha de resposta única e
-- discursiva com autoavaliação), simulados compostos manualmente a partir
-- do próprio banco, e o log imutável de tentativas que alimenta o placar.
-- Métodos de estudo (Feynman/recordação ativa/blurting/Cornell/Pomodoro)
-- e a integração com o dashboard ficam para a Fase 05.2 (gates próprios).
--
-- Decisão de formato (Gate 1): statement/options/expected_answer em TEXTO
-- PLANO, não JSONB inline-content como em flashcards — lá o formato rico
-- se justificava pela conversão bloco→cartão (preservar negrito/links do
-- caderno); esta fase não tem bridge de conversão de bloco para questões
-- (fora de escopo). Se uma fase futura adicionar essa ponte, este formato
-- precisará ser revisto (registrar na auditoria da fase).
--
-- Segue o padrão de segurança das fases 01–04: RLS antes de grants,
-- REVOKE ALL antes de GRANT mínimo, FK composta contra vínculo cruzado
-- entre usuários, SECURITY INVOKER + SET search_path, SET LOCAL
-- lock_timeout antes de FOR UPDATE, mensagens em português, nenhum
-- ERRCODE 40001. Dois triggers de imutabilidade via set_config (mesmo
-- mecanismo de enforce_flashcard_schedule_immutability, Fase 04):
--   - exam_attempts: colunas de resultado (ended_at/score_correct/
--     score_total) só mudam por finish_exam_attempt.
--   - question_attempts: INSERT só é aceito vindo de submit_question_
--     attempt — diferente do residual aceito em flashcard_reviews (lá um
--     INSERT forjado só infla as próprias métricas do usuário; aqui um
--     question_attempt forjado contaminaria o placar de um simulado pela
--     porta legítima do finish_exam_attempt, que agrega esses registros).
--
-- Residual aceito (documentar, não é um furo): o autor da questão vê a
-- própria resposta correta/esperada em qualquer SELECT — RLS protege
-- contra acesso de OUTRO usuário, não contra o próprio usuário se
-- autoenganar ao responder sua própria questão. Mesma classe da
-- autoavaliação em discursiva e das notas de flashcard: o dado é do
-- dono, a honestidade da resposta é dele.
--
-- Residuais aceitos adicionais (achado do Gate 2, mesma classe —
-- autoinfligidos pelo próprio dono dos dados, sem impacto entre
-- usuários):
--   - started_at de exam_attempts é aceito como enviado no INSERT (sem
--     trigger de "não pode ser passado" além do CHECK de forma); o
--     próprio usuário pode inserir uma tentativa com início retroativo,
--     inflando artificialmente duration_seconds a favor dele mesmo.
--   - exam_id de uma exam_attempts pode ser reapontado pelo dono via
--     UPDATE comum (não é coberto pelo trigger de imutabilidade, que só
--     protege ended_at/score_*/started_at) — necessário para o próprio
--     ON DELETE SET NULL (exam_id) permanecer o único jeito de "limpar"
--     o vínculo sem apagar o histórico; reapontar para outro exame seu é
--     uma ação legítima de dono, não uma falsificação de resultado (o
--     placar já congelado por finish_exam_attempt não recalcula sozinho
--     por causa disso).
--   - Uma question_attempts inserida por submit_question_attempt na
--     janela entre a checagem EXISTS (tentativa ainda em andamento) e o
--     SELECT ... FOR UPDATE de finish_exam_attempt em outra aba fica de
--     fora do retrato que finish_exam_attempt já tinha começado a
--     congelar — como finish_exam_attempt sempre recalcula score_correct/
--     score_total no momento do lock (não usa um snapshot anterior), na
--     prática essa resposta ou entra no placar final (se o INSERT
--     comitar antes do lock) ou não entra (se comitar depois) — nunca
--     fica “perdida” de forma inconsistente, só é uma corrida de
--     resultado incerto entre abas do mesmo usuário, aceita pela mesma
--     razão do residual de FOR UPDATE já documentado acima na RPC.

-- =====================================================================
-- 0) Função auxiliar — valida array JSONB de strings com tamanho máximo
-- =====================================================================
-- Usada dentro do CHECK de questions.options. Precisa existir antes da
-- tabela (referenciada na constraint) e precisa de EXECUTE concedido a
-- authenticated — diferente de uma função de trigger, uma função
-- chamada DENTRO de um CHECK roda com o privilégio de quem faz o
-- INSERT/UPDATE, então revogar EXECUTE quebraria toda criação de questão.

CREATE FUNCTION public.jsonb_text_array_within_length(p_array JSONB, p_max_length INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_array) AS elem(value)
    WHERE length(elem.value) = 0 OR length(elem.value) > p_max_length
  );
$$;

REVOKE ALL ON FUNCTION public.jsonb_text_array_within_length(JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jsonb_text_array_within_length(JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_text_array_within_length(JSONB, INTEGER) TO service_role;

-- =====================================================================
-- 1) questions — banco de questões manual
-- =====================================================================
-- A validação de forma por tipo usa CASE aninhado (não AND simples) de
-- propósito: jsonb_array_length lança erro se o valor não for array, e a
-- ordem de avaliação de operandos de AND não é garantida pelo Postgres
-- dentro de uma CHECK constraint — o CASE aninhado garante que
-- jsonb_typeof só libera a chamada de jsonb_array_length depois de
-- confirmar que options é mesmo um array.

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NULL,
  type TEXT NOT NULL,
  statement TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_option_index INTEGER NULL,
  expected_answer TEXT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT questions_type_check CHECK (type IN ('multipla_escolha', 'discursiva')),
  CONSTRAINT questions_statement_length_check
    CHECK (char_length(statement) BETWEEN 1 AND 5000),
  -- Sempre um array (vazio para discursiva, 2-6 itens para múltipla
  -- escolha) — jsonb_typeof nunca lança erro, seguro incondicional.
  CONSTRAINT questions_options_is_array_check CHECK (jsonb_typeof(options) = 'array'),
  CONSTRAINT questions_options_size_check CHECK (octet_length(options::text) <= 8192),

  CONSTRAINT questions_type_shape_check CHECK (
    CASE type
      WHEN 'multipla_escolha' THEN
        CASE WHEN jsonb_typeof(options) <> 'array' THEN false
          ELSE
            jsonb_array_length(options) BETWEEN 2 AND 6
            AND public.jsonb_text_array_within_length(options, 500)
            AND correct_option_index IS NOT NULL
            AND correct_option_index BETWEEN 0 AND jsonb_array_length(options) - 1
            AND expected_answer IS NULL
        END
      WHEN 'discursiva' THEN
        options = '[]'::jsonb
        AND correct_option_index IS NULL
        AND expected_answer IS NOT NULL
        AND char_length(expected_answer) BETWEEN 1 AND 5000
      ELSE false
    END
  ),

  CONSTRAINT questions_id_user_id_key UNIQUE (id, user_id),

  -- lesson_id NULL pula a checagem (MATCH SIMPLE) — questão avulsa,
  -- mesmo padrão de flashcards. ON DELETE SET NULL só em lesson_id:
  -- apagar a aula desvincula a questão, nunca a apaga.
  CONSTRAINT questions_lesson_user_fkey
    FOREIGN KEY (lesson_id, user_id)
    REFERENCES public.lessons(id, user_id)
    ON DELETE SET NULL (lesson_id)
);

CREATE INDEX questions_lesson_active_idx
  ON public.questions (user_id, lesson_id)
  WHERE is_archived = false;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.questions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

CREATE POLICY "questions_select_own" ON public.questions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "questions_insert_own" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "questions_update_own" ON public.questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "questions_delete_own" ON public.questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER questions_set_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 2) exams — simulados (definição/composição)
-- =====================================================================

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  -- Consultivo: contador regressivo no cliente. Sem enforcement forte no
  -- servidor — ferramenta de estudo pessoal, não prova com proctoring;
  -- decisão do Gate 1, registrada aqui como escolha, não omissão.
  time_limit_minutes INTEGER NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT exams_title_length_check CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT exams_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT exams_time_limit_check CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),

  CONSTRAINT exams_id_user_id_key UNIQUE (id, user_id)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.exams FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;

CREATE POLICY "exams_select_own" ON public.exams
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exams_insert_own" ON public.exams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams_update_own" ON public.exams
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams_delete_own" ON public.exams
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER exams_set_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 3) exam_questions — composição manual do simulado
-- =====================================================================
-- Lista de composição "atual" — editar depois de um simulado já ter sido
-- respondido não altera retroativamente tentativas passadas (o placar
-- delas já foi congelado por finish_exam_attempt). Só afeta tentativas
-- futuras (e uma tentativa em andamento, se a composição mudar no meio).

CREATE TABLE public.exam_questions (
  exam_id UUID NOT NULL,
  question_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (exam_id, question_id),

  CONSTRAINT exam_questions_position_check CHECK (position >= 0),

  -- FK composta em ambos os lados: só entra questão SUA num exame SEU.
  CONSTRAINT exam_questions_exam_user_fkey
    FOREIGN KEY (exam_id, user_id)
    REFERENCES public.exams(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT exam_questions_question_user_fkey
    FOREIGN KEY (question_id, user_id)
    REFERENCES public.questions(id, user_id)
    ON DELETE CASCADE
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.exam_questions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;

CREATE POLICY "exam_questions_select_own" ON public.exam_questions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exam_questions_insert_own" ON public.exam_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_questions_update_own" ON public.exam_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_questions_delete_own" ON public.exam_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================================
-- 4) exam_attempts — tentativas de simulado (resultado congelado)
-- =====================================================================
-- duration_seconds é coluna GERADA: nunca pode divergir de started_at/
-- ended_at, nem por escrita direta (Postgres proíbe UPDATE em coluna
-- GENERATED), nem pela RPC — fecha essa dimensão sem precisar de
-- trigger.

CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  score_correct INTEGER NULL,
  score_total INTEGER NULL,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,

  CONSTRAINT exam_attempts_ended_after_started_check
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  -- Em andamento: sem nenhum dado de resultado. Finalizada: os três
  -- juntos, nunca um sem o outro (score_total pode ser 0 se o simulado
  -- não tinha questões).
  CONSTRAINT exam_attempts_score_shape_check CHECK (
    (ended_at IS NULL AND score_correct IS NULL AND score_total IS NULL)
    OR
    (ended_at IS NOT NULL AND score_correct IS NOT NULL AND score_total IS NOT NULL
     AND score_correct >= 0 AND score_total >= 0 AND score_correct <= score_total)
  ),

  CONSTRAINT exam_attempts_id_user_id_key UNIQUE (id, user_id),

  -- exam_id NULL pula a checagem — igual lesson_id em flashcards: apagar
  -- o simulado não apaga o histórico de tentativas dele, só desvincula.
  CONSTRAINT exam_attempts_exam_user_fkey
    FOREIGN KEY (exam_id, user_id)
    REFERENCES public.exams(id, user_id)
    ON DELETE SET NULL (exam_id)
);

CREATE INDEX exam_attempts_user_exam_idx ON public.exam_attempts (user_id, exam_id);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.exam_attempts FROM PUBLIC, anon, authenticated;

-- INSERT/UPDATE concedidos porque o cliente cria a tentativa diretamente
-- (começar um simulado é CRUD simples, sem algoritmo a proteger) e
-- porque finish_exam_attempt (SECURITY INVOKER) precisa do grant
-- subjacente para gravar o resultado — o trigger abaixo é quem
-- realmente impede o cliente de forjar o resultado por conta própria.
-- DELETE permitido: usuário pode apagar o próprio histórico de
-- tentativas (cascateia question_attempts, mesma filosofia de
-- flashcards).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;

CREATE POLICY "exam_attempts_select_own" ON public.exam_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exam_attempts_insert_own" ON public.exam_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_attempts_update_own" ON public.exam_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_attempts_delete_own" ON public.exam_attempts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_exam_attempt_result_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.exam_attempt_finish', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.ended_at IS NOT NULL OR NEW.score_correct IS NOT NULL OR NEW.score_total IS NOT NULL THEN
      RAISE EXCEPTION 'Uma tentativa só pode ser criada em andamento, sem resultado'
        USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE': started_at é sempre imutável (nenhuma RPC precisa
  -- mudá-lo — se pudesse, duration_seconds, gerada a partir dele,
  -- mudaria "de graça" mesmo depois de finalizada). Resultado só muda
  -- através de finish_exam_attempt.
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'O início da tentativa é imutável' USING ERRCODE = '22023';
  END IF;

  IF NEW.ended_at IS DISTINCT FROM OLD.ended_at
     OR NEW.score_correct IS DISTINCT FROM OLD.score_correct
     OR NEW.score_total IS DISTINCT FROM OLD.score_total THEN
    RAISE EXCEPTION 'O resultado da tentativa só pode ser gravado ao finalizar o simulado'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_exam_attempt_result_immutability()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER exam_attempts_enforce_result_immutability
  BEFORE INSERT OR UPDATE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_exam_attempt_result_immutability();

-- =====================================================================
-- 5) question_attempts — log imutável de respostas
-- =====================================================================
-- Ao contrário de flashcard_reviews, o INSERT direto do cliente NÃO é
-- tolerado aqui (ver nota no cabeçalho): só submit_question_attempt
-- pode criar uma linha.

CREATE TABLE public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  exam_attempt_id UUID NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  selected_option_index INTEGER NULL,
  self_assessed_correct BOOLEAN NULL,
  is_correct BOOLEAN NOT NULL,

  CONSTRAINT question_attempts_selected_option_index_check
    CHECK (selected_option_index IS NULL OR selected_option_index >= 0),
  -- Checagem grosseira aqui (pelo menos uma resposta presente); a forma
  -- exata por tipo (múltipla escolha exige índice, discursiva exige
  -- autoavaliação) é validada na RPC, que tem acesso ao tipo da questão
  -- — CHECK não pode fazer lookup em outra tabela.
  CONSTRAINT question_attempts_answer_present_check
    CHECK (selected_option_index IS NOT NULL OR self_assessed_correct IS NOT NULL),

  CONSTRAINT question_attempts_question_user_fkey
    FOREIGN KEY (question_id, user_id)
    REFERENCES public.questions(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT question_attempts_exam_attempt_user_fkey
    FOREIGN KEY (exam_attempt_id, user_id)
    REFERENCES public.exam_attempts(id, user_id)
    ON DELETE CASCADE
);

-- No máximo uma resposta por questão dentro de uma mesma tentativa de
-- simulado (prática avulsa, exam_attempt_id NULL, não entra nessa regra
-- — pode responder a mesma questão várias vezes fora de simulado).
CREATE UNIQUE INDEX question_attempts_one_per_exam_question_idx
  ON public.question_attempts (exam_attempt_id, question_id)
  WHERE exam_attempt_id IS NOT NULL;

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.question_attempts FROM PUBLIC, anon, authenticated;

-- INSERT concedido só porque submit_question_attempt (SECURITY INVOKER)
-- precisa do grant subjacente — o trigger abaixo é quem de fato bloqueia
-- o INSERT direto do cliente. Sem UPDATE/DELETE: log verdadeiramente
-- imutável; a única forma de uma linha sumir é em cascata (questão ou
-- tentativa excluída).
GRANT SELECT, INSERT ON TABLE public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;

CREATE POLICY "question_attempts_select_own" ON public.question_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "question_attempts_insert_own" ON public.question_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_question_attempt_via_rpc()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.question_attempt_insert', true) = 'on' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Respostas só podem ser registradas através da revisão de questão'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_question_attempt_via_rpc()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER question_attempts_enforce_via_rpc
  BEFORE INSERT ON public.question_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_question_attempt_via_rpc();

-- =====================================================================
-- 6) submit_question_attempt — única porta de entrada para respostas
-- =====================================================================
-- Múltipla escolha: is_correct sempre calculado aqui, comparando com
-- correct_option_index — o cliente nunca envia acerto/erro bruto para
-- esse tipo. Discursiva: sem correção automática possível sem IA (fora
-- de escopo), então is_correct vem da autoavaliação do próprio usuário
-- — mesma classe de confiança já aceita nas notas de flashcard.
--
-- Sem FOR UPDATE/lock_timeout aqui: não há leitura-modificação de uma
-- linha compartilhada (diferente de finish_exam_attempt) — o pior caso
-- de corrida é o próprio usuário respondendo a mesma tentativa em duas
-- abas ao mesmo tempo, um cenário raro e autoinfligido; registrado como
-- residual aceito, não vale a complexidade de travar aqui também.

CREATE FUNCTION public.submit_question_attempt(
  p_question_id UUID,
  p_selected_option_index INTEGER DEFAULT NULL,
  p_self_assessed_correct BOOLEAN DEFAULT NULL,
  p_exam_attempt_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_question public.questions%ROWTYPE;
  v_is_correct BOOLEAN;
  v_attempt_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_question
  FROM public.questions q
  WHERE q.id = p_question_id AND q.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Questão não encontrada para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_exam_attempt_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.exam_attempts ea
      WHERE ea.id = p_exam_attempt_id AND ea.user_id = auth.uid() AND ea.ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Tentativa de simulado não encontrada ou já finalizada'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_question.type = 'multipla_escolha' THEN
    IF p_selected_option_index IS NULL
       OR p_selected_option_index < 0
       OR p_selected_option_index > jsonb_array_length(v_question.options) - 1 THEN
      RAISE EXCEPTION 'Selecione uma alternativa válida' USING ERRCODE = '22023';
    END IF;
    v_is_correct := (p_selected_option_index = v_question.correct_option_index);
  ELSIF v_question.type = 'discursiva' THEN
    IF p_self_assessed_correct IS NULL THEN
      RAISE EXCEPTION 'Informe se você acertou a questão discursiva' USING ERRCODE = '22023';
    END IF;
    v_is_correct := p_self_assessed_correct;
  ELSE
    RAISE EXCEPTION 'Tipo de questão desconhecido' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.question_attempt_insert', 'on', true);

  BEGIN
    INSERT INTO public.question_attempts
      (user_id, question_id, exam_attempt_id, selected_option_index, self_assessed_correct, is_correct)
    VALUES
      (auth.uid(), p_question_id, p_exam_attempt_id,
       CASE WHEN v_question.type = 'multipla_escolha' THEN p_selected_option_index END,
       CASE WHEN v_question.type = 'discursiva' THEN p_self_assessed_correct END,
       v_is_correct)
    RETURNING id INTO v_attempt_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta questão já foi respondida nesta tentativa' USING ERRCODE = '22023';
  END;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'is_correct', v_is_correct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_question_attempt(UUID, INTEGER, BOOLEAN, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_question_attempt(UUID, INTEGER, BOOLEAN, UUID) TO authenticated;

-- =====================================================================
-- 7) finish_exam_attempt — congela o resultado do simulado
-- =====================================================================
-- score_total vem da contagem de exam_questions do exame NO MOMENTO da
-- finalização (não da contagem de respostas dadas) — questão não
-- respondida conta contra o placar, não é descontada do total. Trava a
-- linha (lock_timeout de 5s, mesma defesa da Fase 03.1/04) para
-- serializar corretamente uma corrida de finalização duplicada; chamada
-- repetida (retry de rede) é idempotente e devolve o resultado já
-- gravado em vez de erro.
--
-- score_correct e score_total vêm da MESMA consulta, ancorada em
-- exam_questions (LEFT JOIN question_attempts) — se uma questão for
-- removida do exame com a tentativa em andamento, o acerto dela some
-- junto do total, não só do total. Isso garante score_correct <=
-- score_total por construção da query, não por clamp: contar acertos
-- direto em question_attempts (sem passar por exam_questions) permitiria
-- a tentativa contar o acerto de uma questão já removida do simulado,
-- estourando o CHECK exam_attempts_score_shape_check e deixando a
-- tentativa permanentemente infinalizável (todo retry falharia igual).

CREATE FUNCTION public.finish_exam_attempt(
  p_exam_attempt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_attempt public.exam_attempts%ROWTYPE;
  v_total INTEGER;
  v_correct INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  SET LOCAL lock_timeout = '5s';

  SELECT * INTO v_attempt
  FROM public.exam_attempts ea
  WHERE ea.id = p_exam_attempt_id AND ea.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tentativa de simulado não encontrada para o usuário autenticado'
      USING ERRCODE = '42501';
  END IF;

  IF v_attempt.ended_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exam_attempt_id', v_attempt.id,
      'score_correct', v_attempt.score_correct,
      'score_total', v_attempt.score_total,
      'duration_seconds', v_attempt.duration_seconds
    );
  END IF;

  IF v_attempt.exam_id IS NULL THEN
    RAISE EXCEPTION 'Não é possível finalizar: o simulado desta tentativa foi excluído'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE qa.id IS NOT NULL AND qa.is_correct = true)
  INTO v_total, v_correct
  FROM public.exam_questions eq
  LEFT JOIN public.question_attempts qa
    ON qa.exam_attempt_id = p_exam_attempt_id AND qa.question_id = eq.question_id
  WHERE eq.exam_id = v_attempt.exam_id;

  PERFORM set_config('app.exam_attempt_finish', 'on', true);

  UPDATE public.exam_attempts
  SET ended_at = now(),
      score_correct = v_correct,
      score_total = v_total
  WHERE id = v_attempt.id;

  RETURN jsonb_build_object(
    'exam_attempt_id', v_attempt.id,
    'score_correct', v_correct,
    'score_total', v_total,
    'duration_seconds', EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INTEGER
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finish_exam_attempt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_exam_attempt(UUID) TO authenticated;
