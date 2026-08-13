CREATE TABLE public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  note text,
  course_id uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_materials_course_fkey FOREIGN KEY (course_id, user_id) REFERENCES public.courses(id, user_id) ON DELETE SET NULL,
  CONSTRAINT study_materials_title_check CHECK (btrim(title) <> '' AND char_length(title) <= 255),
  CONSTRAINT study_materials_url_check CHECK (btrim(url) <> '' AND char_length(url) <= 2048),
  CONSTRAINT study_materials_type_check CHECK (type IN ('pdf', 'video', 'artigo', 'link', 'livro', 'outro')),
  CONSTRAINT study_materials_note_check CHECK (note IS NULL OR char_length(note) <= 2000)
);

CREATE INDEX study_materials_user_id_idx ON public.study_materials (user_id);
CREATE INDEX study_materials_user_archived_idx ON public.study_materials (user_id, is_archived);
CREATE INDEX study_materials_course_idx ON public.study_materials (user_id, course_id);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_materials_select_own" ON public.study_materials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "study_materials_insert_own" ON public.study_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_materials_update_own" ON public.study_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_materials_delete_own" ON public.study_materials FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;

CREATE TRIGGER set_study_materials_updated_at BEFORE UPDATE ON public.study_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();