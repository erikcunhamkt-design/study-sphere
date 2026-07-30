# Auditoria — Fase 03.1: Caderno real em blocos com autosave, IndexedDB, histórico e controle de conflito

Data: 29/07/2026
Escopo: substituição do placeholder da aula por um caderno BlockNote real com persistência em `lesson_documents` (JSONB), autosave com debounce e retry, draft local em IndexedDB, controle otimista de versão com conflito explícito, histórico com snapshots (automático/manual/before_restore) e restauração transacional.

Processo desta fase: duas sessões Claude em papéis separados — uma implementadora (Sonnet 5) e uma auditora (Fable 5, autora deste documento). Todo artefato passou por verificação cruzada independente (hash, commit e leitura integral) antes de aprovação.

---

## 1. Veredito

**APROVADO PARA A FASE 03.2**

---

## 2. Migrations aplicadas (todas auditadas antes da aplicação, SHA-256 conferido)

| Arquivo | SHA-256 | Conteúdo |
|---|---|---|
| `20260727120000_fase03_1_lesson_documents.sql` | `5003b8edfab27270c603d796e605224a9dc222ea33a7e7c22c7197ccd38fb6c2` | Tabelas `lesson_documents` e `lesson_document_versions`, RLS, grants mínimos, FKs compostas, trigger de coerência de versionamento, funções `save_lesson_document`, `checkpoint_lesson_document`, `restore_lesson_document_version`, `prune_lesson_document_versions` |
| `20260727130000_fase03_1_lock_timeout.sql` | `726a3afab86b17fc215d87e1e52ba8e2121f928607b73c88a436ca70d705fbf7` | `SET LOCAL lock_timeout = '5s'` antes de cada `FOR UPDATE` (defesa contra locks presos; ver §6 — o travamento que motivou esta migration tinha outra causa-raiz, mas o timeout permanece como proteção válida) |
| `20260729210000_fase03_1_conflict_errcode.sql` | `4e83074054ceb81841abdb3ed4614233785f77906d6f04c331d7013ce7b7589c` | Troca do ERRCODE de conflito de `40001` para `VC409` em `save_lesson_document` (ver §6 — bug bloqueante achado no QA) |

Verificação estrutural pós-aplicação via SQL Editor: tabelas, RLS ligado, 3+3 policies, triggers, 4 funções presentes, `lock_timeout` nas três funções de escrita, `VC409` na função de save, `authenticated` sem UPDATE em versões (imutabilidade do histórico), grants mínimos confirmados.

## 3. Modelo de segurança (herda o padrão das fases 01–02.2)

- RLS `auth.uid() = user_id` em ambas as tabelas; REVOKE ALL explícito antes de GRANT mínimo.
- `lesson_documents`: authenticated com SELECT/INSERT/UPDATE (sem DELETE — documento morre em cascata com a aula).
- `lesson_document_versions`: SELECT/INSERT/DELETE, **sem UPDATE** — nenhuma versão histórica pode ser alterada pelo cliente.
- FK composta `(lesson_id, user_id) → lessons(id, user_id)` e `(document_id, user_id) → lesson_documents(id, user_id)`: impossível vincular documento/snapshot a dado de outro usuário, mesmo por INSERT direto.
- Trigger `enforce_lesson_document_versioning`: nem UPDATE direto consegue trocar conteúdo sem incrementar a versão em exatamente 1 — a proteção contra sobrescrita silenciosa é regra do banco, não disciplina do cliente.
- Funções SECURITY INVOKER com `search_path = public`; EXECUTE revogado de PUBLIC/anon.

## 4. Implementação (cliente)

`src/features/lesson-editor/` — validação Zod (`document-schema.ts`: raiz array, ≤5.000 blocos, profundidade ≤10, IDs únicos, tipos/props restritos ao schema aprovado na 03.0, callout só info/attention/success, URLs `javascript:`/`data:`/`vbscript:`/`file:` rejeitadas), drafts IndexedDB chaveados por usuário+aula (`drafts-db.ts`), autosave serializado com debounce 1,5s e retry limitado (`use-autosave.ts`), detecção de outra aba via BroadcastChannel (`tab-presence.ts`, com `pagehide`), diálogo de conflito, painel de histórico, indicador de estados, side menu com mover/duplicar/transformar tipo (preservação de ID comprovada em `side-menu.test.ts`). Rota da aula com `ssr: false` e editor em chunk lazy client-only (duas camadas independentes).

Query keys incluem `userId` (sem vazamento de cache entre contas). Sem `any` sem justificativa, sem service_role, sem log de conteúdo de aula.

## 5. Auditoria cruzada do código (pré-QA)

A sessão auditora leu integralmente as ~1.900 linhas do commit `4032d5f` e reprovou a primeira versão com 7 achados (4 bloqueantes): validação Zod era código morto em runtime; BroadcastChannel ausente; ref desatualizado fazia o 1º clique de "Manter minhas alterações" sempre falhar; saves podiam executar em paralelo; draft de versão antiga era apagado silenciosamente; debounce fora da faixa do plano; comentário citava documento inexistente. **Todos corrigidos no commit `71eaed7` e re-auditados linha a linha.**

## 6. Bugs bloqueantes encontrados no QA real (e corrigidos)

**6.1 — Conflito de versão nunca chegava ao cliente (ERRCODE 40001).** O QA de duas abas revelou que o save conflitante ficava "Salvando…" para sempre e o diálogo de conflito nunca abria. Diagnóstico com fetch instrumentado: a request `POST /rpc/save_lesson_document` saía e o servidor nunca respondia. Causa-raiz: `40001` é `serialization_failure` — o PostgREST/pooler re-executa a transação automaticamente, e como o conflito é determinístico, re-executava em loop infinito. Contraprova medida: erro com ERRCODE `22023` responde em ~500ms; com `40001`, pendura indefinidamente (>10s). Correção: SQLSTATE customizado `VC409` (migration `20260729210000` + `VERSION_CONFLICT_ERROR_CODE` no cliente, commit `8d504f3`). Validado pós-fix: conflito responde em **375ms** com o código e a mensagem corretos. Nota de transparência: o 40001 foi proposto pela sessão auditora na migration original e sobreviveu à dupla auditoria — só o QA de cenário real expôs a colisão semântica. A migration de `lock_timeout` (130000) tratou um sintoma mal-diagnosticado desse mesmo bug; permanece como defesa legítima contra locks reais.

**6.2 — Restauração não recarregava o editor.** A restauração funcionava no banco (snapshot `before_restore` criado, conteúdo restaurado, versão incrementada), mas o editor continuava mostrando o conteúdo antigo e o autosave ficava com a versão esperada defasada — a próxima digitação gerava um **conflito falso** ("editada em outro lugar"), confirmado ao vivo. Correção (commit `ced30f1`): `HistoryPanel` recebe `onRestored` e remonta o editor após restauração (mesmo mecanismo do "Carregar versão mais recente"), com o `onSuccess` do restore aguardando o refetch do documento para o remount encontrar o conteúdo novo no cache. Validado pós-fix: restauração da v6 refletiu no editor imediatamente e a edição seguinte salvou normal, sem conflito.

## 7. QA A — funcional (conta QA A, preview real, preenchimento manual de credenciais)

| Cenário | Resultado |
|---|---|
| Digitação → autosave | ✅ "Salvo"; documento criado (v1) |
| Reload / nova sessão | ✅ Conteúdo retorna do remoto (IndexedDB vazio no momento — não era draft) |
| Offline (fetch bloqueado) | ✅ Draft gravado em IndexedDB **antes** da rede; "Sem conexão — tentando de novo…"; retries com backoff; após esgotar, "Não foi possível salvar" visível — nunca silencioso, nada perdido |
| Retorno online | ✅ Nova edição ressincroniza tudo; draft limpo |
| Duas abas | ✅ Aviso "Esta aula está aberta em outra aba" nas duas direções (announce/ack/bye + pagehide) |
| Conflito de versão | ✅ Diálogo abre na aba defasada; **"Manter minhas alterações" salva no 1º clique**; "Carregar versão mais recente" recarrega o remoto e descarta o local por escolha explícita; draft preservado durante todo o conflito |
| Draft de versão antiga | ✅ Banner explícito diferenciado com Recuperar/Descartar; nada apagado sozinho; Recuperar aplica e salva |
| Histórico | ✅ Checkpoint manual (toast + entrada na lista); reasons corretos; restauração com confirmação, snapshot before_restore e remount imediato |
| Console | ✅ Zero erros em toda a sessão de QA |

## 8. QA B — isolamento (conta separada, userId distinto confirmado)

- UI: nenhuma área/curso/aula da QA A visível.
- URL direta da aula da QA A: "Aula não encontrada".
- Banco direto como B: `lesson_documents` e `lesson_document_versions` da A → 0 linhas (RLS); `save`/`checkpoint`/`restore` na aula da A → `42501`.
- INSERT direto com `user_id` de B apontando para aula da A → **`23503`** (FK composta recusa, camada independente da RLS).
- IndexedDB: nenhum draft acessível (chaves escopadas por usuário; store vazio).

## 9. Anônimo (sem sessão)

SELECT em `lesson_documents`/`lesson_document_versions`/`lessons`, INSERT e EXECUTE das funções: **tudo `42501`** — negação dura de permissão (grants revogados), não apenas resultado vazio por RLS.

## 10. Bundle e responsividade

- BlockNote existe em **um único chunk** (`lesson-editor-*.js`), carregado só na rota da aula: **827 KB bruto / 242 KB gzip** (medido no build real, não estimado). Os outros 67 chunks do build não contêm BlockNote — bundle inicial das demais rotas inalterado.
- 320×700: sem overflow horizontal (`scrollWidth == clientWidth`), editor presente, digitação e autosave funcionando. Zoom 200% coberto por equivalência (viewport de 320 CSS px).

## 11. Estados visuais

Implementados: Editando…, Salvando…, Salvo, Sem conexão (offline), Não foi possível salvar (erro), Conflito de versão, banner de recuperação de rascunho (normal/versão antiga/corrompido) e tela de documento remoto inválido com diagnóstico. Nomes internos dos estados misturam inglês/português (cosmético, registrado).

## 12. Critérios de aprovação do plano (§10.10), um a um

| Critério | Status |
|---|---|
| Documento persiste sem perda após reload e nova sessão | ✅ |
| IndexedDB protege mudanças offline | ✅ |
| Conflito nunca sobrescreve conteúdo silenciosamente | ✅ (garantido também no banco, por trigger) |
| Duas abas são detectadas | ✅ |
| Histórico e restauração preservam o estado anterior | ✅ (before_restore + versão nunca retrocede) |
| IDs dos blocos permanecem estáveis | ✅ (round trip da 03.0 + teste automatizado do transformar-tipo) |
| QA B e anônimo não acessam dados da QA A | ✅ |
| Editor utilizável em 320 px e zoom 200% | ✅ |
| Chunk do editor não aumenta o bundle inicial das outras rotas | ✅ (medido) |
| Typecheck, lint, build e testes sem falha crítica | ✅ (0 erros TS; lint 0 erros/18 warnings pré-existentes; 205/205 testes; build ok) |

## 13. Observações registradas (não bloqueiam; candidatas à Fase 03.2)

1. "Reiniciar caderno" (documento remoto inválido) confia no snapshot automático do save — dentro da janela de 5 minutos do último snapshot, o conteúdo corrompido pode não ir ao histórico apesar da mensagem prometer. Mitigação simples: chamar `checkpoint_lesson_document` antes do save vazio.
2. Conflito detectado enquanto há conteúdo pendente na fila: o diálogo referencia o conteúdo em voo (mais antigo), não o pendente. Mitigado na prática: o editor mantém o conteúdo mais novo e a próxima edição envia o documento inteiro.
3. Janela estreita (microtask) entre `deleteDraft` do save concluído e `saveDraft` de um save iniciando — teoricamente pode apagar um draft recém-gravado; nunca observado no QA.
4. Recomendação de processo: os dois bugs do §6 só apareceram em QA de cenário real — as 205 unidades não exercitam a camada PostgREST. Vale adicionar na 03.2 um teste de integração contra o banco real cobrindo o caminho de conflito (assert: resposta < 2s com code VC409).
5. `VC409` é SQLSTATE customizado — qualquer cliente futuro do banco precisa conhecê-lo; documentado aqui e nos comentários da migration.

## 14. Limitações de ambiente (transparência)

Cliques/teclas sintéticos e screenshots do painel de automação continuam pouco confiáveis quando o painel não está focado — mesma limitação documentada nas Fases 02.1/02.2/03.0. Onde a interação visual não foi verificável, a validação usou DOM/IndexedDB/RPCs reais (mais rigorosa, não menos). Leitores de tela seguem não testados diretamente (sem NVDA/VoiceOver no ambiente) — recomendação de teste manual antes de produção real permanece.

## 15. Comandos finais

- `npm run typecheck` — 0 erros.
- `npm run lint` — 0 erros, 18 warnings pré-existentes (`react-refresh/only-export-components`), nenhum novo.
- `npm run test` — 205/205 (17 arquivos).
- `npm run build` — sucesso; BlockNote confinado ao chunk da aula.

## 16. Commits da fase (locais, sem push)

`0da98bb` (migration inicial) → `4032d5f` (editor + lock_timeout) → `453c6e4` (formatação) → `71eaed7` (correções da auditoria cruzada) → `8d504f3` (VC409) → `ced30f1` (restore recarrega editor) → este documento.

**APROVADO PARA A FASE 03.2**
