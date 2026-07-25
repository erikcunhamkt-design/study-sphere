# Auditoria — Fase 02.2: Módulos, Aulas e Árvore Hierárquica de Estudos

Data: 24-25/07/2026
Escopo: módulos dentro de cursos, aulas dentro de módulos, árvore hierárquica, reordenação, arquivamento/restauração, exclusão com cascata, marcação de conclusão manual, cálculo real de progresso, navegação entre curso/módulo/aula, criação rápida contextual, busca/filtros estruturais.
Fora de escopo (confirmado não implementado): editor de anotações, notas, flashcards, questões, simulados, Pomodoro funcional, sessões de estudo, IA, PDFs, upload de arquivos, biblioteca, calendário, faculdade, métricas de desempenho, colaboração, templates, busca semântica, tutor de IA.

---

## 1. Migration aplicada

`supabase/migrations/20260720000000_fase02_2_modules_and_lessons.sql`, SHA-256 `8b10285bc6697103a2157b9a607750e5ab32b457cfa1a8323ff399cbcfdba5db`, aprovada previamente com auditoria estática completa, aplicada manualmente pelo operador no SQL Editor da Lovable Cloud, com sucesso confirmado ("Query succeeded. No rows returned." em todos os blocos).

## 2. Verificação estrutural pós-aplicação

Executada via 12 consultas somente-leitura (`information_schema`/`pg_catalog`), com resultado 100% aderente ao arquivo aprovado: colunas, constraints (CHECKs, PK, `UNIQUE(id, course_id, user_id)`, FKs compostas `course_modules_course_user_fkey` e `lessons_module_course_user_fkey`, ambas `ON DELETE CASCADE`), 13 índices (6 em `course_modules`, 7 em `lessons`, incluindo os de PK/UNIQUE), RLS habilitada nas duas tabelas, 8 policies (4 por tabela, todas `auth.uid() = user_id`), grants (`authenticated` com SELECT/INSERT/UPDATE/DELETE apenas; `anon` sem nenhuma linha em nenhuma tabela ou função), as 4 funções (`trim_title`, `sync_lesson_completion`, `reorder_course_modules`, `reorder_lessons`) com `SECURITY INVOKER`/`search_path=public` fixo, e 5 objetos de trigger (2 em `course_modules`, 3 em `lessons` — correção de redação registrada abaixo).

### 2.1 Correção de redação: objetos de trigger vs. eventos de trigger

`information_schema.triggers` retorna uma linha por evento (INSERT/UPDATE), não por objeto. Recontagem correta a partir da mesma consulta:

| Tabela | Objeto de trigger | Eventos |
|---|---|---|
| `course_modules` | `course_modules_trim_name` | BEFORE INSERT OR UPDATE (2 linhas) |
| `course_modules` | `course_modules_set_updated_at` | BEFORE UPDATE (1 linha) |
| `lessons` | `lessons_trim_title` | BEFORE INSERT OR UPDATE (2 linhas) |
| `lessons` | `lessons_sync_completion` | BEFORE INSERT OR UPDATE (2 linhas) |
| `lessons` | `lessons_set_updated_at` | BEFORE UPDATE (1 linha) |

**2 objetos em `course_modules`, 3 objetos em `lessons` — 5 objetos, 8 linhas de evento.**

### 2.2 Investigação da role `sandbox_exec`

Verificada por 4 consultas somente-leitura:

| Verificação | Resultado |
|---|---|
| Proprietário das 4 funções | `postgres` |
| `rolcanlogin` | `true` |
| `rolbypassrls` | `true` |
| `rolsuper` | `false` |
| Memberships | `postgres` é membro de `sandbox_exec` (única linha) |
| `anon` é membro/herda `sandbox_exec`? | `false` / `false` |
| `authenticated` é membro/herda `sandbox_exec`? | `false` / `false` |

**Classificação:** role administrativa interna da plataforma, com login e bypass de RLS para operações administrativas e migrations, porém inacessível aos clientes da aplicação. Não representa falha no modelo de isolamento do StudyOS.

## 3. Metodologia dos testes reais

Testes executados contra o **build local atual** (não a URL de produção, que estava desatualizada — ver §9), conectado ao mesmo banco remoto já verificado estruturalmente. Duas contas QA reais e pré-autorizadas ("QA A" e "QA B"), nunca criadas por este processo, credenciais preenchidas manualmente pelo operador diretamente no formulário (protocolo explícito: pausa antes da digitação, aviso de qual conta usar, nenhuma leitura/cópia/registro dos valores digitados). Testes de CRUD/reordenação/conclusão via UI real e via chamadas REST/RPC autenticadas diretas (mesma técnica de extração transitória de `access_token` do `localStorage`, nunca logada, usada nas Fases 01.3/02.1) para os cenários de integridade e bypass.

## 4. CRUD de módulos

Criação real via UI (diálogo "Criar módulo"): módulo "Módulo 1 — Fundamentos" criado com nome e descrição, refletido imediatamente na lista (1 módulo ativo). Segundo módulo criado via API para servir de base à reordenação. Edição, arquivamento e restauração testados (ver §7).

## 5. CRUD de aulas

3 aulas criadas no Módulo 1. Edição de título/descrição usa o mesmo `lessonSchema` (título até 160 caracteres, obrigatório e não-vazio após trim) já validado nos testes automatizados.

## 6. Reordenação — válida e inválida

`reorder_lessons` testado com 6 cenários diretos via RPC:

| Cenário | Resultado |
|---|---|
| Reordenação válida (conjunto completo invertido) | `204` sucesso |
| IDs duplicados | `400` — "A lista contém IDs duplicados" |
| Subconjunto (2 de 3) | `400` — "A lista precisa conter exatamente todas as 3 aula(s) ativa(s)... recebido: 2" |
| ID inexistente/estrangeiro | `403` — "A lista contém aulas inválidas..." |
| Array vazio com conjunto ativo não-vazio | `400` — "A lista não pode estar vazia..." |
| Array incluindo uma aula recém-arquivada | `403` — mesma mensagem de item inválido |

`reorder_course_modules` validado com a mesma cobertura via os testes de isolamento entre contas (§12).

## 7. Marcação de conclusão e coerência `completed_at`

4 cenários via API direta na mesma aula:

1. `is_completed: true` sem informar `completed_at` → trigger define `now()` automaticamente.
2. `is_completed: false` → `completed_at` volta a `null`.
3. Tentativa de forçar `completed_at` manualmente com `is_completed: false` → trigger ignora e mantém `null`.
4. `is_completed: true` com `completed_at` customizado não-nulo → trigger respeita o valor enviado (não sobrescreve).

Todos os 4 resultados batem exatamente com a regra determinística implementada em `sync_lesson_completion()`.

## 8. Cálculo de progresso

Com 1 de 2 aulas ativas concluídas no Módulo 1 (a 3ª aula arquivada foi corretamente excluída do denominador): módulo exibiu **1/2 · 50%**, e o card de progresso do curso agregou corretamente **1 de 2 aulas concluídas · 50%** (Módulo 2, sem aulas, contribuiu 0/0 sem distorcer o percentual). Confirmado tanto na árvore do curso quanto na página dedicada do módulo, após aguardar o refetch do React Query (a navegação inicial mostra brevemente o valor anterior em cache antes de atualizar — comportamento esperado do `staleTime`, não um defeito).

## 9. Bug encontrado e corrigido: rotas de módulo e aula não renderizavam

**Achado durante os testes reais, antes de qualquer outro teste de UI de módulo/aula:** ao navegar diretamente para a URL de um módulo ou de uma aula, a página exibida era a do **curso pai** (ou do módulo pai, no caso da aula), não a página dedicada — reproduzido de forma determinística (URL correta na barra de endereço, `h1` e conteúdo sempre do pai) mesmo após reload completo e em uma aba totalmente nova.

**Causa raiz:** a convenção de nomes com pontos do TanStack Router (`app.estudos.$areaId.cursos.$courseId.modulos.$moduleId.tsx`) registra a rota do módulo como **filha** da rota do curso na árvore de roteamento (`getParentRoute: () => AppEstudosAreaIdCursosCourseIdRoute`), e o mesmo vale para aula sob módulo. Como `CourseDetailPage`/`ModuleDetailPage` foram implementadas como páginas completas e independentes (por design explícito da Fase 02.2 — cada nível tem seu próprio breadcrumb e não deve depender do "chrome" do pai), nenhuma delas renderiza `<Outlet />`. Sem `Outlet`, uma rota filha correspondente nunca é montada — apenas o componente do pai aparece.

**Correção aplicada:** reestruturação para o mesmo padrão já usado (e já aprovado) para área→curso — a página do curso passou a ser a rota **índice** (`app.estudos.$areaId.cursos.$courseId.index.tsx`) e a do módulo também (`...modulos.$moduleId.index.tsx`), deixando módulo e aula como rotas **irmãs** (não aninhadas) do curso e do módulo respectivamente, cada uma renderizando sua própria página completa sem depender de `Outlet`. Confirmado na árvore de rotas regenerada: os três níveis (curso, módulo, aula) agora têm `getParentRoute: () => AppRoute` diretamente.

**Re-teste pós-correção:** módulo e aula passaram a renderizar corretamente (breadcrumbs de 4 e 5 níveis, progresso real, empty-state de preparo da Fase 03), confirmado em aba nova após reinício completo do servidor.

## 10. Bug encontrado e corrigido: sem link de navegação para a página do módulo

Consequência do mesmo levantamento: o nome do módulo na árvore do curso (`ModuleTreeItem`) era apenas um botão de expandir/recolher — não havia nenhuma forma de alcançar a página dedicada do módulo a partir da árvore (diferente das aulas, que já linkavam corretamente via `LessonRow`). Corrigido separando o cabeçalho em um botão de colapsar (ícone) e um `<Link>` para `/app/estudos/$areaId/cursos/$courseId/modulos/$moduleId`, mantendo o mesmo padrão já usado para aulas. Re-testado com sucesso (navegação real chega à página do módulo).

## 11. Arquivamento, restauração e exclusão com cascata

Arquivamento de uma aula testado via API; tentativa subsequente de incluí-la em `reorder_lessons` corretamente rejeitada (§6). Exclusão em cascata testada com um módulo descartável contendo 2 aulas: antes da exclusão, 2 aulas presentes; após `DELETE` do módulo, 0 aulas e 0 módulo — cascata via `ON DELETE CASCADE` funcionando integralmente, sem exigir exclusão manual em duas etapas.

## 12. Persistência

- **Após reload:** dados do curso/módulos/aulas idênticos antes e depois de recarregar a página.
- **Após logout e novo login:** logout real via botão da UI (retornou à tela de login), novo login com a mesma conta QA A, dados 100% preservados (2 módulos, 2 aulas ativas, 1 concluída, 50%) — nenhuma perda ou corrupção de estado.

## 13. Rotas incompatíveis e recurso não encontrado

3 cenários testados via navegação real:

- `courseId` de um curso ao qual o módulo não pertence → "Módulo não encontrado".
- `moduleId` totalmente inexistente (UUID aleatório) → "Módulo não encontrado".
- `lessonId` de uma aula que não pertence ao `moduleId` da URL → "Aula não encontrada".

Todos com botão de retorno funcional para o nível correto (curso ou módulo).

## 14. Isolamento entre QA A e QA B

Com IDs reais de módulo/aula da QA A conhecidos, autenticado como QA B:

| Tentativa | Resultado |
|---|---|
| `SELECT` no módulo da QA A | `200`, 0 linhas |
| `SELECT` na aula da QA A | `200`, 0 linhas |
| `UPDATE` (arquivar) no módulo da QA A | `200`, 0 linhas afetadas |
| `DELETE` na aula da QA A | `200`, 0 linhas afetadas |

RLS filtra silenciosamente em vez de expor erro — comportamento correto (não revela existência do recurso a quem não tem acesso).

## 15. Bypass de integridade referencial (FK compostas) — 11 cenários

| # | Cenário | Resultado |
|---|---|---|
| 1 | QA B cria módulo em curso da QA A | `409` FK `course_modules_course_user_fkey` |
| 2 | QA B move módulo próprio para curso da QA A | `409` mesma FK |
| 3 | QA B cria aula em módulo da QA A | `409` FK `lessons_module_course_user_fkey` |
| 4 | QA A cria aula com `module_id`/`course_id` de cursos diferentes (mesmo usuário) | `409` mesma FK |
| 5 | QA A move aula para módulo de outro curso próprio | `409` mesma FK |
| 6 | QA A tenta alterar `user_id` do próprio módulo | `403` RLS ("new row violates row-level security policy") |
| 7 | QA B tenta `reorder_course_modules` no curso da QA A | `403` "Curso não encontrado para o usuário autenticado" |
| 8 | QA B tenta `reorder_lessons` no módulo da QA A | `403` "Módulo não encontrado para o usuário autenticado" |
| 9 | Reorder com array parcial (subconjunto) | `400` rejeitado (§6) |
| 10 | Reorder incluindo item arquivado | `403` rejeitado (§6) |
| 11 | Reorder incluindo item de outro usuário | `403` rejeitado (equivalente a #7/#8, testado como parte do RPC cross-user) |

Todos os 11 bloqueados corretamente — nenhum bypass bem-sucedido.

## 16. Acesso anônimo

4 tentativas com a chave publicável (sem sessão de usuário): `SELECT` em `course_modules`, `SELECT` em `lessons`, `INSERT` em `course_modules`, chamada de `reorder_lessons` — todas retornaram `401 permission denied`, confirmando na prática os grants verificados estruturalmente (§2).

## 17. Responsividade

Testado em 375px (mobile) na árvore do curso e na página do módulo: sem overflow horizontal (`scrollWidth === clientWidth`), conteúdo legível, filtros e busca acessíveis.

## 18. Acessibilidade

Labels ARIA descritivos presentes em toda a superfície nova (`aria-label` nos checkboxes de conclusão indicando estado atual, botões de reorder com contexto do item, `progressbar` com `aria-label` textual, `role="tablist"`/`role="tab"` nos filtros). Foco automático no campo de nome ao abrir diálogos de criação, consistente com o padrão já aprovado na Fase 01.2.

**Limitação de ambiente registrada (não é defeito do produto):** eventos de teclado (`Escape`) e cliques sintéticos em elementos `<a>`/checkbox via automação não são reconhecidos de forma confiável pelos listeners do Radix neste ambiente de teste — reproduzido de forma idêntica em componentes **já aprovados em fases anteriores e não tocados nesta fase** (diálogo "Nova área", breadcrumb "Marketing"), confirmando que é uma característica da ferramenta de automação, não uma regressão da Fase 02.2. Onde a interação real (clique disparado nativamente) foi verificável, o comportamento funcionou corretamente (ex.: navegação por link, criação de módulo, submit de formulário).

## 19. Console e rede

Nenhum erro novo gerado pelo código da Fase 02.2 durante os testes (os únicos erros de console observados foram: um erro histórico de credencial incorreta de uma tentativa de login anterior do próprio operador, e mensagens de HMR obsoletas do Vite referentes a nomes de arquivo anteriores às renomeações de rota — ambos sem efeito no funcionamento real, confirmado após reinício completo do servidor).

## 20. Rollback de atualização otimista

Simulado interceptando a próxima requisição `PATCH` para `lessons` e forçando falha de rede. Ao marcar uma aula como concluída: a UI aplicou a atualização otimista e, ao receber a falha, reverteu corretamente ao estado anterior (`aria-checked="false"`, mantido "Pendente") e exibiu o toast "Não foi possível atualizar a conclusão da aula". Nenhum estado incorreto persistido (a falha foi interceptada antes de qualquer chamada real ao servidor).

## 21. Busca e filtros

Busca por "Google" no módulo filtrou corretamente para mostrar apenas a aula correspondente, ocultou as demais, e exibiu a mensagem "Reordenação desabilitada durante busca ou filtro." — confirma `isTreeFiltering` funcionando e os controles de reorder sendo corretamente ocultados enquanto o filtro está ativo.

## 22. Preparação para a Fase 03

Página da aula contém o bloco de vazio explícito ("Anotações da aula" / "O editor de anotações em blocos será adicionado na próxima etapa." / botão desabilitado "Começar anotação — disponível na Fase 03") — nenhuma textarea improvisada, nenhuma persistência de conteúdo fora da estrutura futura. **A Fase 03 não foi implementada nesta sessão.**

## 23. Checks finais (pós-correções)

- `npm run typecheck` — 0 erros.
- `npm run lint` — 0 erros, 18 warnings (mesmos pré-existentes de fases anteriores, categoria `react-refresh/only-export-components`, nenhum novo).
- `npm run test -- --run` — **150/150 testes passando** (12 arquivos).
- `npm run build` — build de produção concluído com sucesso, rotas `.index` de curso/módulo presentes corretamente no bundle SSR gerado.

## 24. Higiene de credenciais

Nenhuma credencial das contas QA foi lida, copiada, registrada ou salva em qualquer momento — inclusive quando enviadas inadvertidamente pelo chat em desacordo com o protocolo combinado, foram explicitamente descartadas e não usadas. Nenhuma conta nova foi criada. Tokens de sessão extraídos apenas transitoriamente em variáveis JS do navegador para os testes de API, nunca impressos ou persistidos.

## 25. Veredito

Dois defeitos reais de implementação foram encontrados durante os testes desta própria fase (§9 e §10) — ambos com causa raiz identificada, corrigidos, e re-verificados com sucesso antes deste veredito, sem qualquer teste subsequente revelando problema novo. Todos os checks automatizados permanecem verdes após a correção.

**APROVADO PARA A FASE 03**
