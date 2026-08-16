# DOMINUS — Arquitetura de Integridade de Dados

Status: **DATA INTEGRITY HARDENING CONCLUÍDO**
Escopo: cadeia cognitiva completa (área → curso → aula → documento → conceito → questão → evidência → memory state → FSRS → domínio → next action).
Nenhuma funcionalidade nova foi criada; nenhuma tela foi redesenhada.

---

## 1. Cadeia e ownership

Todas as tabelas do domínio têm `user_id` NOT NULL com FK para `public.profiles(id) ON DELETE CASCADE`.
As relações internas usam **FK composta com `user_id`** (ex.: `lessons(module_id, course_id, user_id) → course_modules`), o que torna impossível apontar para uma entidade de outro usuário no nível do banco — não só via RLS.

## 2. Foreign keys auditadas (49)

| Origem | Referência | ON DELETE | Racional |
|---|---|---|---|
| profiles.id | auth.users | CASCADE | conta removida = dados removidos |
| study_areas / courses / course_modules / lessons | pai + user | CASCADE | estrutura hierárquica |
| lessons(course_id, user_id) | courses | CASCADE | **adicionado nesta auditoria** |
| lesson_documents / versions | lesson / document | CASCADE | conteúdo pertence à aula |
| concepts.lesson_id | lessons | SET NULL | conceito sobrevive à aula |
| questions.lesson_id | lessons | SET NULL | histórico de questão sobrevive |
| study_sessions.lesson_id | lessons | SET NULL | sessão histórica sobrevive |
| cognitive_evidences.concept_id | concepts | **SET NULL** (antes CASCADE) | evidência é histórico imutável |
| cognitive_evidences.lesson/question/session | — | SET NULL | idem |
| memory_states.concept_id | concepts | CASCADE | estado só existe com conceito válido |
| flashcards.concept/deck/lesson | — | SET NULL | cartão sobrevive |
| flashcard_reviews / question_attempts | pai + user | CASCADE | log preso ao objeto avaliado |
| planned_studies.* | área/curso/sessão | SET NULL | planejamento sobrevive |

Relações **opcionais por design** (documentado): `cognitive_evidences.concept_id`, `.lesson_id`, `.question_id`, `.session_id`, `concepts.lesson_id`, `questions.lesson_id`, `study_sessions.lesson_id` (sessão livre).

### Bug crítico encontrado e corrigido
`lessons.course_id` **não possuía FK própria** (só existia via `course_modules`). O PostgREST não conseguia resolver `study_areas → courses → lessons → concepts`, retornando **400 PGRST200** e deixando o Mapa de Domínio permanentemente em carregamento. Corrigido com `lessons_course_user_fkey` + índice.

## 3. Constraints e unicidade

- `memory_states (user_id, concept_id)` UNIQUE → **um memory state por usuário + conceito** (0 duplicatas encontradas).
- Chaves `(id, user_id)` únicas em courses, lessons, questions, study_sessions, exams, flashcards, decks — base das FKs compostas.
- Histórico imutável por RLS: `cognitive_evidences`, `flashcard_reviews`, `question_attempts`, `onboarding_events` não permitem UPDATE/DELETE.
- Imutabilidade transacional por trigger: agendamento de flashcards, timing de sessões, resultado de simulados, versionamento de documentos.

## 4. Índices adicionados

`concepts(user_id)`, `concepts(lesson_id)`, `concepts(user_id, is_archived)`,
`memory_states(user_id, due)`, `memory_states(concept_id)`,
`cognitive_evidences(user_id, concept_id, attempted_at DESC)`, `cognitive_evidences(session_id)`,
`questions(concept_id)`, `study_sessions(lesson_id)`, `lesson_documents(lesson_id, published_version)`,
`lessons(course_id, user_id)`.

Objetivo: manter Revisar, Desempenho, Domain Model e Next Action estáveis conforme o histórico cresce.

## 5. RLS

RLS habilitada em **todas** as tabelas públicas (0 exceções). Todas as políticas escopam por `auth.uid() = user_id`. Verificações cruzadas de propriedade retornaram 0 registros com dono divergente entre evidência/memória e conceito.

## 6. RPCs e SECURITY DEFINER

Quatro funções `SECURITY DEFINER`: `handle_new_user`, `on_cognitive_evidence_insert`, `apply_evidence_to_memory_state`, `rebuild_memory_state_from_history`. Todas com `search_path = public`.
Correção aplicada: **EXECUTE revogado de `anon`/`authenticated`/`PUBLIC`** — elas são acionadas apenas por triggers internos. `rebuild_memory_state_from_history` recebia `p_user_id` arbitrário e era chamável pela API (risco de escrita em nome de terceiros). `jsonb_text_array_within_length` passou a ter `search_path` fixo.
As RPCs invocadas pelo app (`save/publish/restore_lesson_document`, `record_recall_attempt`, `submit_*`, `reorder_*`, `finish_exam_attempt`, `get_brain_state`) são `SECURITY INVOKER`, validam `auth.uid()` e a posse da linha antes de escrever.

## 7. Arquivamento vs delete

Preferência absoluta por `is_archived` em áreas, cursos, módulos, aulas, conceitos, questões e flashcards. Entidade arquivada:
- **preserva** todo o histórico cognitivo já registrado;
- **não gera** novas ações (filtrada no Domain Model e no Next Action Engine).

## 8. Transações

`record_recall_attempt` grava a evidência e atualiza o log da sessão na mesma transação; o trigger `on_cognitive_evidence_insert` aplica o memory state dentro dessa mesma transação. Não existe caminho que produza "evidência salva + memória quebrada".

## 9. Fallback global e observabilidade

Novo utilitário `src/lib/data-integrity.ts`:

```text
dado cognitivo inválido
↓ safeArray()/guards → entidade ignorada
↓ logIntegrityIssue() → console estruturado
↓ agregação continua e a Home renderiza
```

Tipos de ocorrência registrados: `invalid_relation`, `missing_concept`, `missing_question`, `invalid_session`, `rpc_failure`, `query_failure`. Somente metadados estruturais — **nunca** a resposta do usuário. Erros não são silenciados: aparecem no log e a rota tem `errorComponent` no root.

Aplicado em `use-domain-model.ts` e `use-next-best-action.ts` (sessão sem id, conceito ausente, curso/aula arquivados, coleções em formato inesperado).

## 10. Dados de teste

`is_test_data` existe em toda a cadeia cognitiva e é filtrado em: memory states, evidências, sessões, cursos, aulas, flashcards, elegibilidade (`src/lib/eligibility.ts`), Domain Model (inclusive conceitos, corrigido nesta auditoria) e Next Action.

## 11. Cache (TanStack Query)

Após nova evidência ou revisão FSRS agora também são invalidados `performance-dashboard` e `domain-model` — antes o Mapa de Domínio e o painel de memória só atualizavam com reload manual.

## 12. Testes executados

| Teste | Resultado |
|---|---|
| Duplicidade de memory state | 0 |
| Evidências órfãs / sem conceito / sem sessão | 0 |
| Dono divergente evidência↔conceito e memória↔conceito | 0 |
| Memory state em conceito arquivado | 0 |
| Tabelas sem RLS | 0 |
| Home usuário com histórico (browser) | renderiza, sem erro de rede |
| Home antes da correção | 400 PGRST200 + card travado em carregamento |
| Home depois da correção | 0 requisições com falha |
| Typecheck | limpo |

## 13. Critério de sucesso

- Nenhum elo quebrado da cadeia derruba o aplicativo: coleções inválidas são ignoradas, registradas e a renderização segue.
- O histórico cognitivo sobrevive ao arquivamento e à exclusão do conteúdo atual (evidências passaram a usar `SET NULL` em vez de `CASCADE`).
