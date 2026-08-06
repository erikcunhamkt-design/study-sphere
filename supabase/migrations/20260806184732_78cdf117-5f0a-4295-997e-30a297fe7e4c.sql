
BEGIN;

-- 1) Registrar a migration auditada (181700) como aplicada, com statements VAZIO
--    (a tabela já existe; nada deve ser reexecutado a partir deste registro).
INSERT INTO supabase_migrations.schema_migrations
  (version, name, statements, rollback, created_by)
VALUES
  ('20260806181700',
   'fase06_1_planned_studies',
   '{}',
   NULL,
   'audit-reconcile')
ON CONFLICT (version) DO NOTHING;

-- 2) Remover o registro da duplicata (182402), cujo arquivo já foi apagado do repo.
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260806182402';

-- 3) Verificação: deve haver a 181700 presente e a 182402 ausente.
--    Se a checagem falhar, aborta tudo.
DO $$
DECLARE
  v_has_181700 INT;
  v_has_182402 INT;
BEGIN
  SELECT count(*) INTO v_has_181700 FROM supabase_migrations.schema_migrations
    WHERE version = '20260806181700';
  SELECT count(*) INTO v_has_182402 FROM supabase_migrations.schema_migrations
    WHERE version = '20260806182402';
  IF v_has_181700 <> 1 OR v_has_182402 <> 0 THEN
    RAISE EXCEPTION 'Reconciliação inconsistente (181700=%, 182402=%). Abortando.',
      v_has_181700, v_has_182402;
  END IF;
END $$;

-- 4) Confirmar que a tabela real segue intacta (só leitura, não altera).
-- Esta consulta será verificada no retorno da migração.
SELECT count(*) AS colunas_planned_studies
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'planned_studies';

COMMIT;
