-- Fase 01.2 — princípio do menor privilégio para o papel `authenticated`.
-- Não edita as migrations já aplicadas (20260718231957, 20260718232030,
-- 20260719000000). Não toca em dados, tabelas, constraints ou triggers —
-- só remove grants de tabela que o cliente nunca precisou.
--
-- Contexto: 20260719000000 já tinha revogado INSERT/DELETE. A verificação
-- pós-aplicação (rodada no banco remoto) mostrou que `authenticated` ainda
-- tinha REFERENCES, TRIGGER e TRUNCATE em profiles/user_preferences —
-- grants padrão que todo projeto Supabase novo concede no schema public,
-- não algo desta migration. Como a API REST/PostgREST usada pelo app nunca
-- emite esses comandos, e RLS é o controle real de acesso por linha, o
-- privilégio de tabela é redundante — removido por clareza e princípio do
-- menor privilégio.
--
-- MAINTAIN não é revogado aqui: a consulta a information_schema.
-- role_table_grants rodada após a migration anterior não listou MAINTAIN
-- para `authenticated` em nenhuma das duas tabelas (grants confirmados:
-- REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) — não há nada a revogar.
-- Se o projeto migrar para uma versão do Postgres que suporte MAINTAIN
-- (adicionado no Postgres 17) e o privilégio vier a ser concedido no
-- futuro, revogue-o então; incluir a palavra-chave aqui sem necessidade
-- arriscaria falhar em versões do Postgres onde ela não existe.
--
-- service_role não é tocado por esta migration.

REVOKE REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.profiles
  FROM authenticated;

REVOKE REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.user_preferences
  FROM authenticated;
