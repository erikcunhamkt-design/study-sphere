-- RPC create_course_concept — primeiro (e único, por ora) ponto de
-- criação de concepts em todo o app. Chamada pelo cliente uma vez, em
-- silêncio, sempre que um Flashcard ou Questão é criado a partir da
-- Escrita Livre de um curso — nunca exposta ao usuário como um passo
-- separado ("conceito" continua sendo jargão interno).
--
-- SECURITY INVOKER (não DEFINER): não precisa de privilégio elevado, só
-- confirma posse do curso antes do INSERT — mesmo padrão de
-- save_lesson_document/checkpoint_lesson_document.

CREATE FUNCTION public.create_course_concept(
  p_course_id UUID,
  p_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_concept_id UUID;
  v_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses WHERE id = p_course_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Curso não encontrado para o usuário autenticado' USING ERRCODE = '42501';
  END IF;

  v_title := NULLIF(btrim(left(coalesce(p_title, ''), 200)), '');
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Título do conceito não pode ser vazio' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.concepts (user_id, course_id, title)
  VALUES (auth.uid(), p_course_id, v_title)
  RETURNING id INTO v_concept_id;

  RETURN v_concept_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_course_concept(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_course_concept(UUID, TEXT) TO authenticated;
