-- Fase 03.2 — Storage de mídia do caderno (bucket privado + RLS por dono).
-- Migration nova e incremental: não toca em nenhuma tabela do produto,
-- não altera migrations anteriores. Cria o bucket 'lesson-media' e as
-- policies de acesso em storage.objects.
--
-- Modelo de segurança:
--   • Bucket PRIVADO — nenhum acesso público; exibição via URL assinada,
--     que só pode ser criada por quem tem SELECT na própria pasta.
--   • Convenção de caminho: {user_id}/{lesson_id}/{arquivo}. A PRIMEIRA
--     pasta é a fronteira de segurança: todas as policies exigem
--     (storage.foldername(name))[1] = auth.uid()::text — usuário A não
--     lê, grava, altera nem apaga nada fora de A/...
--   • anon não recebe nenhuma policy → nenhum acesso.
--   • Limite de 50 MB por objeto e allowlist de MIME types no próprio
--     bucket (o cliente valida por categoria antes do upload; o bucket é
--     o teto duro). SVG deliberadamente fora da lista (vetor de XSS).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-media',
  'lesson-media',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lesson_media_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lesson_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lesson_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'lesson-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lesson_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
