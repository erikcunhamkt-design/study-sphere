-- Migration: Fase 07.1 — Cérebro-mascote (Fundação Técnica)
-- Descrição: Cria a RPC get_brain_state que calcula a saúde cognitiva do usuário.
-- Data: 2026-08-11
-- Autor: Lovable Agent

CREATE OR REPLACE FUNCTION public.get_brain_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_timezone text;
    v_now_tz timestamptz;
    v_today_civil date;
    
    -- Janelas
    v_window_7d_start date;
    v_window_28d_start date;
    
    -- Componentes 7d
    v_duration_seconds_7d int;
    v_active_days_7d int;
    
    -- Domínio 7d (Questões)
    v_q_total_7d int;
    v_q_correct_7d int;
    v_q_rate_7d numeric;
    
    -- Domínio 7d (Flashcards)
    v_f_total_7d int;
    v_f_success_7d int;
    v_f_rate_7d numeric;
    
    v_mastery_rate_7d numeric;
    
    -- Pontuações Base (0-100)
    v_score_time numeric;
    v_score_mastery numeric;
    v_score_consistency numeric;
    v_index_base numeric;
    
    -- Decaimento
    v_last_activity_at timestamptz;
    v_days_absent int;
    v_decay_factor numeric;
    v_decay_message text;
    
    -- Estágio (28d)
    v_duration_seconds_28d int;
    v_q_total_28d int;
    v_q_correct_28d int;
    v_f_total_28d int;
    v_f_success_28d int;
    v_avg_mastery_28d numeric;
    v_stage_base_score numeric;
    v_stage int;
    
    -- Vigor
    v_vigor_base numeric;
    v_vigor_final int;
    
    -- Resultado
    v_final_score int;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- 1. Setup de Contexto e Timezone
    SELECT timezone INTO v_timezone FROM public.profiles WHERE id = v_user_id;
    v_timezone := COALESCE(v_timezone, 'UTC');
    
    v_now_tz := now();
    v_today_civil := (v_now_tz AT TIME ZONE v_timezone)::date;
    
    v_window_7d_start := v_today_civil - 6; -- Hoje + 6 dias anteriores (date - int = date)
    v_window_28d_start := v_today_civil - 27;

    -- 2. Coleta de Dados 7 dias
    
    -- Tempo (minutos)
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO v_duration_seconds_7d
    FROM public.study_sessions
    WHERE user_id = v_user_id 
      AND (started_at AT TIME ZONE v_timezone)::date >= v_window_7d_start;

    -- Dias Ativos (Consistência)
    WITH active_days AS (
        SELECT (started_at AT TIME ZONE v_timezone)::date as d FROM public.study_sessions WHERE user_id = v_user_id AND (started_at AT TIME ZONE v_timezone)::date >= v_window_7d_start
        UNION
        SELECT (attempted_at AT TIME ZONE v_timezone)::date as d FROM public.question_attempts WHERE user_id = v_user_id AND (attempted_at AT TIME ZONE v_timezone)::date >= v_window_7d_start
        UNION
        SELECT (reviewed_at AT TIME ZONE v_timezone)::date as d FROM public.flashcard_reviews WHERE user_id = v_user_id AND (reviewed_at AT TIME ZONE v_timezone)::date >= v_window_7d_start
    )
    SELECT COUNT(*) INTO v_active_days_7d FROM active_days;

    -- Domínio (Questões)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
    INTO v_q_total_7d, v_q_correct_7d
    FROM public.question_attempts
    WHERE user_id = v_user_id AND (attempted_at AT TIME ZONE v_timezone)::date >= v_window_7d_start;
    
    IF v_q_total_7d > 0 THEN
        v_q_rate_7d := v_q_correct_7d::numeric / v_q_total_7d;
    END IF;

    -- Domínio (Flashcards)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE rating IN ('bom', 'facil'))
    INTO v_f_total_7d, v_f_success_7d
    FROM public.flashcard_reviews
    WHERE user_id = v_user_id AND (reviewed_at AT TIME ZONE v_timezone)::date >= v_window_7d_start;

    IF v_f_total_7d > 0 THEN
        v_f_rate_7d := v_f_success_7d::numeric / v_f_total_7d;
    END IF;

    -- Cálculo Mastery 7d (valor neutro 70% se sem dados)
    IF v_q_total_7d > 0 AND v_f_total_7d > 0 THEN
        v_mastery_rate_7d := (v_q_rate_7d * 0.5) + (v_f_rate_7d * 0.5);
    ELSIF v_q_total_7d > 0 THEN
        v_mastery_rate_7d := v_q_rate_7d;
    ELSIF v_f_total_7d > 0 THEN
        v_mastery_rate_7d := v_f_rate_7d;
    ELSE
        v_mastery_rate_7d := 0.7; -- Valor neutro conforme plano
    END IF;

    -- 3. Cálculo Índice Base (7 dias)
    v_score_time := LEAST((v_duration_seconds_7d::numeric / 60.0) / 300.0, 1.0) * 40.0;
    v_score_mastery := v_mastery_rate_7d * 30.0;
    v_score_consistency := LEAST(v_active_days_7d::numeric / 5.0, 1.0) * 30.0;
    v_index_base := v_score_time + v_score_mastery + v_score_consistency;

    -- 4. Cálculo de Decaimento
    SELECT MAX(last_d) INTO v_last_activity_at FROM (
        SELECT MAX(started_at) as last_d FROM public.study_sessions WHERE user_id = v_user_id
        UNION ALL
        SELECT MAX(attempted_at) as last_d FROM public.question_attempts WHERE user_id = v_user_id
        UNION ALL
        SELECT MAX(reviewed_at) as last_d FROM public.flashcard_reviews WHERE user_id = v_user_id
    ) t;

    IF v_last_activity_at IS NULL THEN
        v_days_absent := 0;
        v_decay_factor := 1.0;
    ELSE
        v_days_absent := v_today_civil - (v_last_activity_at AT TIME ZONE v_timezone)::date;
        
        IF v_days_absent <= 1 THEN
            v_decay_factor := 1.0;
        ELSIF v_days_absent <= 4 THEN
            v_decay_factor := 1.0 - (v_days_absent - 1) * 0.05;
        ELSIF v_days_absent = 5 THEN
            v_decay_factor := 0.80;
        ELSE
            v_decay_factor := 0.80 * (0.85 ^ (v_days_absent - 5));
        END IF;
    END IF;

    v_final_score := ROUND(v_index_base * v_decay_factor);
    
    IF v_days_absent <= 1 THEN
        v_decay_message := 'Cérebro em plena atividade! Mantenha o ritmo.';
    ELSE
        v_decay_message := format('Sua saúde cognitiva caiu %s%% após %s dias sem estudar. Estude hoje para reativar!', 
                                  ROUND((1.0 - v_decay_factor) * 100), 
                                  v_days_absent);
    END IF;

    -- 5. Cálculo Estágio (28 dias)
    -- TODO(07.x): estágio regride em degrau ao fim da janela de 28d; refinar para regressão gradual em fase futura.
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO v_duration_seconds_28d
    FROM public.study_sessions
    WHERE user_id = v_user_id AND (started_at AT TIME ZONE v_timezone)::date >= v_window_28d_start;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
    INTO v_q_total_28d, v_q_correct_28d
    FROM public.question_attempts
    WHERE user_id = v_user_id AND (attempted_at AT TIME ZONE v_timezone)::date >= v_window_28d_start;
    
    SELECT COUNT(*), COUNT(*) FILTER (WHERE rating IN ('bom', 'facil'))
    INTO v_f_total_28d, v_f_success_28d
    FROM public.flashcard_reviews
    WHERE user_id = v_user_id AND (reviewed_at AT TIME ZONE v_timezone)::date >= v_window_28d_start;

    IF (v_q_total_28d + v_f_total_28d) > 0 THEN
        v_avg_mastery_28d := (
            COALESCE(v_q_correct_28d::numeric / NULLIF(v_q_total_28d, 0), 0.7) * 0.5 +
            COALESCE(v_f_success_28d::numeric / NULLIF(v_f_total_28d, 0), 0.7) * 0.5
        );
    ELSE
        v_avg_mastery_28d := 0.7;
    END IF;

    v_stage_base_score := (
        LEAST((v_duration_seconds_28d::numeric / 60.0) / 1200.0, 1.0) * 50.0 +
        v_avg_mastery_28d * 50.0
    );

    IF v_stage_base_score <= 20 THEN v_stage := 1;
    ELSIF v_stage_base_score <= 40 THEN v_stage := 2;
    ELSIF v_stage_base_score <= 60 THEN v_stage := 3;
    ELSIF v_stage_base_score <= 80 THEN v_stage := 4;
    ELSE v_stage := 5;
    END IF;

    -- 6. Vigor
    v_vigor_base := LEAST(v_active_days_7d::numeric / 5.0, 1.0) * 100.0;
    v_vigor_final := ROUND(v_vigor_base * v_decay_factor);
    IF v_vigor_final > 100 THEN v_vigor_final := 100; END IF;

    -- 7. Montagem do JSON
    v_result := jsonb_build_object(
        'score', v_final_score,
        'stage', v_stage,
        'vigor', v_vigor_final,
        'breakdown', jsonb_build_object(
            'time', ROUND(v_score_time, 2),
            'mastery', ROUND(v_score_mastery, 2),
            'consistency', ROUND(v_score_consistency, 2)
        ),
        'decay', jsonb_build_object(
            'factor', ROUND(v_decay_factor, 4),
            'days_absent', v_days_absent,
            'message', v_decay_message
        )
    );

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_brain_state() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_brain_state() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_brain_state() TO authenticated;
