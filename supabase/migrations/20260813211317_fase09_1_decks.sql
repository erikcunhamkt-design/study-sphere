-- Migration: Decks (Baralhos) + deck_id em Flashcards
-- Fase 09 - Fatia 1.1 - Gate 2

-- 1. Tabela public.decks
CREATE TABLE public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  is_archived boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- UNIQUE constraint para permitir FK composta (id, user_id)
  CONSTRAINT decks_id_user_unique UNIQUE (id, user_id),
  
  CONSTRAINT decks_name_check CHECK (btrim(name) <> '' AND char_length(name) <= 100),
  CONSTRAINT decks_color_check CHECK (color IS NULL OR char_length(color) <= 32)
);

-- 2. Índices
CREATE INDEX decks_user_id_idx ON public.decks(user_id);
CREATE INDEX decks_listing_idx ON public.decks(user_id, is_archived);

-- 3. RLS
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decks_select_own" ON public.decks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "decks_insert_own" ON public.decks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "decks_update_own" ON public.decks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "decks_delete_own" ON public.decks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT ALL ON public.decks TO service_role;

-- 5. Trigger updated_at
CREATE TRIGGER set_decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Coluna deck_id em flashcards + FK composta
ALTER TABLE public.flashcards
  ADD COLUMN deck_id uuid;

ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_deck_fkey
  FOREIGN KEY (deck_id, user_id)
  REFERENCES public.decks(id, user_id)
  ON DELETE SET NULL;

CREATE INDEX flashcards_deck_idx ON public.flashcards(user_id, deck_id);

