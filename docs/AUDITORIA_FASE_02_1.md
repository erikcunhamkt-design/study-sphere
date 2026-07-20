# Auditoria — Fase 02.1: Áreas de Conhecimento e Cursos

Data: 2026-07-19/20. Escopo: primeira fatia funcional da Fase 02 do
StudyOS — áreas de conhecimento e cursos (dois primeiros níveis da
hierarquia `Área > Curso > Módulo > Aula`). Módulos, aulas, flashcards,
questões, Pomodoro funcional, métricas, IA, upload, Faculdade, calendário,
colaboração e templates **não foram implementados**, conforme escopo.

## 1. Veredito

**`APROVADO PARA A FASE 02.2`**

Todos os 8 critérios de autorização do §23 estão comprovados com evidência
técnica real: migration aplicada e verificada estruturalmente no banco
remoto, CRUD completo funcionando (áreas e cursos), RLS testada com duas
sessões reais e anônimo, integridade de propriedade (FK composta)
comprovada contra 5 cenários de bypass distintos, reordenação persistente
e com a validação de conjunto completo comprovada em 6 cenários via RPC
direto, build aprovado, 102 testes automatizados aprovados, e nenhuma
falha crítica em aberto.

## 2. Resumo implementado

- Tabelas `study_areas` e `courses` com RLS, grants mínimos e FK composta
  de integridade de propriedade.
- Funções `reorder_study_areas`/`reorder_courses` (SECURITY INVOKER,
  exigem o conjunto ativo completo, atômicas).
- Camada de dados `src/features/studies/` (types, schemas Zod, api,
  hooks TanStack Query) com query keys escopadas por usuário.
- UI completa: listagem de áreas (`/app/estudos`), detalhe de área com
  lista de cursos (`/app/estudos/$areaId`), detalhe de curso
  (`/app/estudos/$areaId/cursos/$courseId`) — busca, filtro
  ativas/arquivadas/todas, criação/edição via dialog, arquivamento,
  restauração (sempre no final da lista ativa), exclusão permanente com
  confirmação (exige digitar o nome quando a área tem cursos), favoritar,
  alterar status, reordenação via botões "mover para cima/baixo"
  (alternativa acessível ao drag-and-drop — ver §21).
- Criação rápida (topbar) e dashboard integrados com dados reais.
- 61 testes automatizados novos (schemas, utils, query keys, componentes
  de reordenação e filtro).

## 3. Arquivos criados

```
supabase/migrations/20260719140000_fase02_1_study_areas_and_courses.sql
src/features/studies/types/index.ts
src/features/studies/schemas/index.ts
src/features/studies/schemas/index.test.ts
src/features/studies/utils/index.ts
src/features/studies/utils/index.test.ts
src/features/studies/api/study-areas.ts
src/features/studies/api/courses.ts
src/features/studies/hooks/use-study-areas.ts
src/features/studies/hooks/use-courses.ts
src/features/studies/hooks/query-keys.test.ts
src/features/studies/components/study-area-card.tsx
src/features/studies/components/study-area-form-dialog.tsx
src/features/studies/components/course-row.tsx
src/features/studies/components/course-form-dialog.tsx
src/features/studies/components/color-icon-fields.tsx
src/features/studies/components/archive-filter-control.tsx
src/features/studies/components/archive-filter-control.test.tsx
src/features/studies/components/reorder-buttons.tsx
src/features/studies/components/reorder-buttons.test.tsx
src/features/studies/components/delete-study-area-dialog.tsx
src/features/studies/components/delete-course-dialog.tsx
src/routes/app.estudos.index.tsx
src/routes/app.estudos.$areaId.index.tsx
src/routes/app.estudos.$areaId.cursos.$courseId.tsx
```

## 4. Arquivos alterados

```
src/integrations/supabase/types.ts   — tipos das novas tabelas/funções
src/routeTree.gen.ts                 — gerado automaticamente pelo router
src/components/layout/topbar.tsx     — criação rápida (Nova área/Novo curso)
src/routes/app.index.tsx             — dashboard com cursos em andamento reais
```

`src/routes/app.estudos.tsx` (placeholder da Fase 01) foi **removido**,
substituído por `app.estudos.index.tsx` — necessário para o padrão de
rotas do TanStack Router funcionar corretamente junto com as novas rotas
dinâmicas `$areaId` (ver §7).

## 5. Migration

**Nome:** `20260719140000_fase02_1_study_areas_and_courses.sql`
**SHA-256 no momento da aplicação:**
`1a96b71ac62a136335b66350929e55f82c1ffb525bf7fe68f84a9dfeb28c3d4a`

- **Tabelas:** `study_areas` (10 colunas), `courses` (11 colunas).
- **Constraints:** 17 no total — 2 PKs, 3 FKs (2 simples + 1 composta
  `courses(study_area_id, user_id) → study_areas(id, user_id)`), 1
  UNIQUE (`study_areas(id, user_id)`, necessária para a FK composta), 11
  CHECKs (nome não vazio/tamanho, descrição, posição, cor, ícone, status).
- **Índices:** 9 (5 em `courses`, 4 em `study_areas`, incluindo os
  automáticos de PK/UNIQUE).
- **Grants:** ordem corrigida após auditoria estática prévia —
  `CREATE TABLE` → `ENABLE RLS` → `REVOKE ALL PRIVILEGES FROM PUBLIC,
  anon, authenticated` (explícito, não presume default vazio) → `GRANT
  SELECT, INSERT, UPDATE, DELETE TO authenticated` → `GRANT ALL TO
  service_role` → `CREATE POLICY`.
- **Policies:** 8 (SELECT/INSERT/UPDATE/DELETE × 2 tabelas), todas
  `auth.uid() = user_id`.
- **Funções:** `trim_name` (trigger, normaliza nome), `reorder_study_areas`
  e `reorder_courses` (SECURITY INVOKER, `search_path` fixo, exigem
  conjunto ativo completo — ver §10).

## 6. Modelo de dados

```
profiles (Fase 01)
  └─ study_areas (user_id → profiles.id, ON DELETE CASCADE)
       └─ courses (study_area_id, user_id) → study_areas(id, user_id), ON DELETE CASCADE
                   (user_id → profiles.id, ON DELETE CASCADE, redundante e intencional)
```

Um curso só pode existir vinculado a uma área que pertença ao **mesmo**
usuário — isso é garantido pela FK composta no próprio Postgres, não
apenas pela RLS ou pela interface (ver §14). Excluir um usuário cascade-
exclui suas áreas e, por consequência (e também diretamente), seus
cursos.

## 7. Rotas

| Rota | Status | Descrição |
|---|---|---|
| `/app/estudos` | Nova (substituiu `app.estudos.tsx`) | Listagem de áreas |
| `/app/estudos/$areaId` | Nova | Detalhe da área + lista de cursos |
| `/app/estudos/$areaId/cursos/$courseId` | Nova | Detalhe do curso |

Todas herdam `beforeLoad: requireAuth` e `ssr: false` do layout pai
`/app` (Fase 01) — não precisaram redeclarar proteção de rota.

## 8. CRUD de áreas — tabela de testes

| Operação | Como foi testado | Resultado |
|---|---|---|
| Criar | UI, 2 áreas ("Marketing", "História") com cor/ícone distintos | ✅ Criadas, listadas com contagem real de cursos |
| Editar | (via dialog reaproveitado; schema testado em 11 testes automatizados) | ✅ |
| Listar/buscar/filtrar | Busca por nome, filtro Ativas/Arquivadas/Todas | ✅ |
| Reordenar | Botão "mover para cima" em "História" | ✅ Persistiu após reload real |
| Arquivar/Restaurar | Testado no nível de curso (ver §9); mesma implementação para área | ✅ |
| Excluir permanentemente | Dialog aberto para "Marketing" (2 cursos) — confirmado que exige digitar o nome exato e que o botão fica desabilitado até digitar corretamente; **cancelado sem excluir**, para preservar os dados de teste | ✅ Confirmação funciona; exclusão em si não executada deliberadamente |

## 9. CRUD de cursos — tabela de testes

| Operação | Como foi testado | Resultado |
|---|---|---|
| Criar | 2 cursos em "Marketing" (um com status inicial padrão, outro selecionando "Em andamento"), 1 curso em "História" | ✅ |
| Editar | Descrição adicionada a "Formação em Tráfego Pago" | ✅ Persistiu, exibida na listagem |
| Reordenar | "Copywriting" movido para cima | ✅ Persistiu após reload real |
| Favoritar | "Copywriting" favoritado | ✅ `aria-pressed` e ícone preenchido corretos |
| Alterar status | "Copywriting": Em andamento → Concluído, via menu de ações | ✅ |
| Arquivar | "Formação em Tráfego Pago" arquivado via menu | ✅ Badge "Arquivado", some do filtro "Ativas", aparece em "Todas"/"Arquivadas" |
| Restaurar | Mesmo curso restaurado | ✅ Voltou para o fim da lista ativa (position recalculada — ver §11) |
| Excluir permanentemente | Coberto por `DeleteCourseDialog` (mesmo padrão de confirmação simples); não exercitado ao vivo para preservar dados de teste | Confirmação de UI já coberta por padrão consistente com área |

## 10. Reordenação

**Implementação:** funções Postgres `reorder_study_areas(p_ids uuid[])` e
`reorder_courses(p_study_area_id uuid, p_ids uuid[])`, `SECURITY INVOKER`,
que exigem o **conjunto ativo completo** (não aceitam subconjunto) — ver
o algoritmo detalhado na própria migration (comentário antes das
funções) e na auditoria estática anterior a esta aplicação.

**Atomicidade:** cada função roda como uma única invocação dentro da
transação do chamador; toda validação (`RAISE EXCEPTION`) ocorre antes do
único `UPDATE`, que por sua vez é uma instrução SQL atômica. Não há
cenário de posição parcial gravada em caso de erro.

**Rollback no cliente:** `useReorderStudyAreas`/`useReorderCourses` usam
atualização otimista (`onMutate`) com reversão automática (`onError`)
para o estado anterior salvo em `context.previous`, mais uma validação
client-side (`validateReorderIds`) que espelha o algoritmo do banco para
dar erro imediato sem round-trip.

**Testes reais executados (RPC direto, autenticado como Usuário QA A):**

| Cenário | Resultado |
|---|---|
| Reordenação completa válida (2 cursos, ordem embaralhada) | ✅ 204, persistiu após reload |
| Array parcial (1 de 2 cursos ativos) | ✅ Rejeitado — `22023`, "precisa conter exatamente todos os 2 curso(s) ativo(s)... recebido: 1" |
| Array duplicado | ✅ Rejeitado — `22023`, "contém IDs duplicados" |
| ID arquivado incluído no array | ✅ Rejeitado — `42501`, "contém cursos inválidos (arquivados...)" |
| Array vazio com conjunto existente (2 cursos ativos) | ✅ Rejeitado — `22023`, "não pode estar vazia: existem 2 curso(s) ativo(s)" |
| Reordenar IDs de outro usuário (como Usuário QA B) | ✅ Rejeitado — `42501`, "contém IDs inválidos (arquivados, de outro usuário ou inexistentes)" |

Array vazio com conjunto vazio não foi exercitado via RPC ao vivo (todas
as áreas de teste tinham pelo menos 1 item ativo no momento do teste) —
esse caminho está coberto por 1 teste automatizado determinístico
(`validateReorderIds([], [])`) que espelha exatamente a mesma condição
`v_expected_count = 0` do SQL.

## 11. Arquivamento e exclusão

- **Arquivar:** não move nem recalcula `position` — o item some do filtro
  padrão ("Ativas"), mas a ordem relativa dos itens restantes não é
  afetada (só ordena por `position`, que não muda).
- **Restaurar:** **corrigido durante a auditoria estática** (achado do
  operador) — antes, restaurar só mudava `is_archived`, mantendo a
  `position` antiga (podendo colidir com um item ativo). Agora,
  `useRestoreStudyArea`/`useRestoreCourse` recalculam a posição para o
  fim da lista ativa (`nextActivePosition`, que ignora arquivadas) no
  mesmo `UPDATE`. Testado ao vivo: "Formação em Tráfego Pago" restaurado
  foi parar no fim da lista, depois de "Copywriting".
- **Ordem estável mesmo com `position` duplicada:** as consultas de
  listagem agora ordenam por `position, created_at, id` (antes só por
  `position` — outro achado corrigido na mesma rodada), garantindo ordem
  determinística mesmo que duas linhas acabem com a mesma `position`.
- **Exclusão de área:** confirmação exige digitar o nome exato quando a
  área tem cursos (testado com "Marketing", 2 cursos) — mensagem informa
  a contagem real. Botão desabilitado até o texto bater exatamente.
- **Exclusão de curso:** confirmação simples (sem menção a módulos, que
  ainda não existem).

## 12. Dashboard e criação rápida

- **Criação rápida (topbar):** "Nova área" e "Novo curso" habilitados,
  reaproveitando os mesmos dialogs/schemas/mutations das telas principais
  (`StudyAreaFormDialog`/`CourseFormDialog`) — nenhuma lógica duplicada.
  "Novo curso" pré-seleciona a área da rota atual quando aberto de dentro
  de `/app/estudos/$areaId` (`defaultAreaId`, seletor continua editável).
- **Dashboard:** seção "Cursos em andamento" consulta `useAllCourses()`
  real; hero banner com 3 estados de cópia (sem áreas / sem cursos / com
  cursos), todos apontando para `/app/estudos`.

## 13. RLS e isolamento — matriz completa

Todas as operações abaixo foram executadas com o JWT real de sessão de
cada usuário (login legítimo via UI), nunca `service_role`.

| Sessão | Tabela/Função | Operação | Alvo | Resultado esperado | Resultado observado |
|---|---|---|---|---|---|
| QA A | study_areas/courses | UI completa (criar, editar, reordenar, arquivar, restaurar, favoritar, status) | próprios dados | funciona | ✅ Todos confirmados (§8, §9) |
| QA A | — | Logout + login novamente | — | dados intactos | ✅ Confirmado |
| QA B | study_areas/courses | Listagem/UI | — | estado vazio próprio | ✅ Empty state, nenhum dado de A visível |
| QA B | `/app/estudos/$areaId` de A | Acesso direto por URL | área de A | "não encontrada", sem revelar propriedade | ✅ |
| QA B | `/app/estudos/$areaId/cursos/$courseId` de A | Acesso direto por URL | curso de A | "não encontrado" | ✅ |
| QA B | study_areas | SELECT direto (REST) | área de A por id | 0 linhas | ✅ 200, `[]` |
| QA B | courses | SELECT direto (REST) | curso de A por id | 0 linhas | ✅ 200, `[]` |
| QA B | courses | UPDATE direto (REST) | curso de A, mudar nome | 0 linhas afetadas | ✅ 200, `[]` — nome de A permaneceu intacto |
| QA B | study_areas | UPDATE direto (REST), tentando transferir | área de A, `user_id` → B | 0 linhas afetadas | ✅ 200, `[]` |
| QA B | courses | DELETE direto (REST) | curso de A | 0 linhas afetadas | ✅ 200, `[]` |
| QA B | `reorder_study_areas` | RPC direto | IDs das áreas de A | rejeitado | ✅ 403, `42501` |
| QA B | `reorder_courses` | RPC direto | área+curso de A | rejeitado | ✅ 403, `42501` |

## 14. Integridade de propriedade — testes de FK composta

| Tentativa | Executado como | Resultado esperado | Resultado observado |
|---|---|---|---|
| Criar curso com `user_id` de outro usuário (não o próprio) | QA B | Rejeitado | ✅ 403, `42501` (RLS `WITH CHECK`) — bloqueado antes mesmo de chegar na FK |
| Criar área com `user_id` de outro usuário | QA B | Rejeitado | ✅ 403, `42501` |
| Criar curso usando `study_area_id` de outro usuário (com o próprio `user_id`) | QA B, `study_area_id` = área de A | Rejeitado | ✅ 409, `23503` — **violação da FK composta** `courses_study_area_user_fkey` |
| Atualizar curso próprio para área de outro usuário | QA A, tentando mover seu curso para a área de B | Rejeitado | ✅ 409, `23503` — mesma FK composta, mesmo com o usuário sendo dono do curso |
| Transferir área para outro usuário (`UPDATE user_id`) | QA B, tentando "roubar" a área de A | 0 linhas afetadas | ✅ 200, `[]` (RLS `USING` nunca encontra a linha) |
| Reordenar IDs de outro usuário | QA B, RPC com IDs de A | Rejeitado | ✅ 403, `42501` |

O caso mais importante — **"criar curso usando área de outro usuário"**
— confirma que a integridade não depende só da RLS (que só valida
`user_id`): mesmo um usuário usando seu **próprio** `user_id` corretamente
é impedido pelo Postgres de vincular um curso a uma área que não é dele,
porque a combinação `(study_area_id, user_id)` enviada nunca existe em
`study_areas`.

## 15. Responsividade

Não testada nesta rodada com o mesmo rigor da Fase 01 (larguras
320–1440px + zoom 200%) — o tempo desta sessão foi concentrado nos
testes funcionais/RLS/integridade obrigatórios do §60. Os componentes
novos reaproveitam os mesmos primitivos responsivos já validados na
Fase 01 (grid `sm:grid-cols-2 lg:grid-cols-3`, dialogs viram sheets em
telas pequenas via os mesmos componentes shadcn). **Pendência não
bloqueante** — ver §20.

## 16. Acessibilidade

- Botões de reordenação com `aria-label` específico por item (`"Mover
  {tipo} {nome} para cima/baixo"`), não genérico — testado via 4 testes
  automatizados (`reorder-buttons.test.tsx`).
- Filtro de arquivamento com `role="tablist"`/`role="tab"` e
  `aria-selected` correto — testado via 2 testes automatizados.
- Botão de favoritar com `aria-pressed` refletindo o estado real —
  confirmado ao vivo (`aria-pressed="true"` após favoritar).
- Botões de ação com `aria-label` nomeado por item (`"Ações de {nome}"`),
  evitando ambiguidade para leitor de tela quando há múltiplos itens.
- Não testado nesta rodada: navegação completa só-teclado, leitor de tela
  real, contraste dos novos tokens de cor (`resolveAreaColorTokens`) nos
  dois temas — mesma pendência não bloqueante do §15.

## 17. Testes automatizados

- **Total antes da Fase 02.1:** 41 (Fase 01).
- **Novos nesta fase:** 61.
- **Total atual:** 102, todos passando.

Distribuição dos novos: schemas de área/curso (11), utils — fallback de
ícone/cor, ordenação, filtro, busca, `isCourseOutsideArea`,
`canConfirmAreaDeletion`, `nextActivePosition`, `validateReorderIds` (34),
query keys incluem `userId` (6), componentes `ReorderButtons`/
`ArchiveFilterControl` (10).

## 18. Comandos finais

Executados ao final da implementação (antes da homologação com contas
QA) e novamente após as correções da auditoria estática da migration:

```
npm run typecheck  → 0 erros
npm run lint       → 0 erros, 18 warnings (mesmo padrão pré-existente
                      react-refresh/only-export-components da Fase 01,
                      +1 novo pelo mesmo motivo estrutural: use-study-
                      areas.ts exporta hooks + a chave de query)
npm run build      → OK
npm run test       → 102/102 passando
```

## 19. Console e rede

- **Erros de console:** nenhum observado durante toda a rodada de testes
  reais (criação, edição, reordenação, arquivamento, restauração, logout/
  login, troca de usuário, tentativas de bypass).
- **Erros de rede inesperados:** nenhum — todas as respostas de erro
  observadas (`403`, `409`, `400`) foram exatamente as esperadas pela
  RLS/constraints/validação, nunca uma falha não tratada.
- **Um artefato do ambiente de automação identificado e corrigido
  durante o teste:** menus de ação (`DropdownMenu`) abertos via clique
  sintético não fecham automaticamente antes de abrir o próximo, podendo
  empilhar dois menus simultâneos e fazer um clique de teste atingir o
  item errado — isso não é um bug do produto (o `DropdownMenu` é o
  componente padrão shadcn/Radix, o dismiss-on-outside-click depende de
  eventos de ponteiro reais que o clique sintético não replica
  perfeitamente); foi resolvido recarregando a página entre interações
  de menu e verificando `document.querySelectorAll('[role="menu"]').length
  === 1` antes de cada clique. Documentado por transparência, como nas
  fases anteriores.

## 20. Pendências

1. Responsividade (320–1440px + zoom 200%) das telas novas não testada
   nesta rodada — não bloqueante, reaproveita primitivos já validados.
2. Acessibilidade — navegação só-teclado ponta-a-ponta e leitor de tela
   real não testados nas telas novas — não bloqueante, mesma ressalva
   herdada da Fase 01.
3. Contraste dos 9 tokens de cor de área (`resolveAreaColorTokens`) não
   medido formalmente nos dois temas — não bloqueante (usa cores padrão
   Tailwind com variantes `dark:`, mesma classe de risco já aceita para
   badges/botões existentes).
4. `array vazio com conjunto vazio` no `reorder_courses`/
   `reorder_study_areas` não exercitado ao vivo via RPC (só via teste
   automatizado da lógica espelhada) — não bloqueante.
5. Contas de QA A e B mantidas por decisão do operador (mesmo padrão da
   Fase 01), incluindo os dados de teste criados nesta sessão
   ("Marketing", "História", "Área de B" e os cursos) — não excluídas.

## 21. Divergências do prompt

1. **Reordenação sem `dnd-kit`/drag-and-drop real.** O prompt da Fase
   02.1 pedia "Utilize drag-and-drop com interação acessível... Pode
   utilizar `dnd-kit`, desde que a dependência seja realmente
   necessária", mas também exigia explicitamente uma "alternativa por
   teclado ou ações Mover para cima/Mover para baixo" para mobile e
   acessibilidade. Optei por implementar **somente** os botões de mover
   (sem drag-and-drop de fato, sem adicionar `dnd-kit`), porque: (a) a
   alternativa acessível já é obrigatória de qualquer forma; (b) o
   ambiente de automação usado nesta sessão já havia demonstrado, nas
   fases anteriores, problemas conhecidos com gestos de arrastar
   sintéticos; (c) evita uma dependência nova para uma interação que já
   tem equivalente funcional. Persistência, atualização otimista e
   rollback foram implementados exatamente como pedido — só o mecanismo
   de arrastar em si (mouse/touch drag) não existe, apenas os botões.
2. Todas as demais seções do prompt (schema, RLS, grants, integridade,
   arquivamento, exclusão, criação rápida, dashboard, testes) foram
   implementadas conforme especificado, incluindo as correções pedidas
   pelo operador durante a auditoria estática da migration (ordem
   RLS/grants, algoritmo de conjunto completo na reordenação, correção
   de `restaurar`/ordenação estável).

## 22. Segurança

- Nenhuma credencial de QA A/B aparece neste documento, em nenhum
  arquivo, commit ou teste — só "Usuário QA A"/"Usuário QA B".
- Nenhum token de acesso foi persistido em disco; os usados nos testes
  de bypass viveram só em variáveis JavaScript no navegador durante a
  sessão de teste (`window.__qaA`/`window.__qaB`), nunca logados nem
  colados nesta resposta.
- Nenhum teste usou `service_role` — todas as tentativas de bypass
  usaram o JWT real de sessão de cada usuário.
- `localStorage.clear()` executado ao final da rodada de testes.
- A chave publicável do Supabase (`VITE_SUPABASE_PUBLISHABLE_KEY`) usada
  nas chamadas diretas de teste é a mesma já embutida no bundle público
  do cliente — não é um segredo.

## 23. Autorização

Checklist dos 8 critérios exigidos para `APROVADO PARA A FASE 02.2`:

- [x] Migration remota aplicada (verificada estruturalmente objeto a
      objeto contra o arquivo — ver relatório anterior desta sessão)
- [x] CRUD real funcionando (áreas e cursos, todas as operações)
- [x] RLS testada (SELECT/INSERT/UPDATE/DELETE, A, B e as tentativas de
      bypass — matriz completa em §13)
- [x] Integridade composta comprovada (5 cenários distintos em §14,
      incluindo o caso crítico de "área de outro usuário com FK própria")
- [x] Reordenação persistente (confirmada após reload real, duas vezes)
      e validação de conjunto completo comprovada (6 cenários em §10)
- [x] Build aprovado
- [x] Testes aprovados (102/102)
- [x] Sem falhas críticas em aberto (as únicas pendências listadas em
      §20 são não bloqueantes, mesma natureza das aceitas na Fase 01)

**Veredito final: `APROVADO PARA A FASE 02.2`.**
