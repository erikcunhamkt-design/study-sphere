ALTER TABLE public.study_sessions 
DROP CONSTRAINT study_sessions_method_check,
ADD CONSTRAINT study_sessions_method_check 
CHECK (method = ANY (ARRAY['pomodoro'::text, 'feynman'::text, 'recordacao_ativa'::text, 'blurting'::text, 'cornell'::text, 'livre'::text, 'aprender'::text, 'flashcards'::text, 'exame'::text]));