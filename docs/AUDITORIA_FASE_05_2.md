# Auditoria — Fase 05.2 (Métodos de estudo + integração no dashboard)

Data: 03/08/2026
Auditor: sessão de auditoria (Claude) · Implementação: sessão paralela (Sonnet 5)
Veredito: **APROVADA** (residuais manuais documentados na §6)

---

## 1. Escopo e commits

| Commit | Conteúdo |
|---|---|
| `90c3262` | Migration `20260802160000_fase05_2_study_sessions.sql` (SHA-256 `50a4b714…1f0e72`, aplicada pelo operador após auditoria — Gate 2) |
| `a1d9109` | Código da fase: 25 arquivos, 1767 inserções (métodos, hooks, dashboard, topbar) |
| `eaedcd2` | Correção A1 (clamp do `ended_at`) |
| `f48f3e6` | Correções A2/A3 (comentário do schema.ts, código morto, fallback ISO) |

## 2. Gate 3 — leitura integral do código

Qualidade geral alta. Destaques positivos:

- **`pomodoro-engine.ts`**: recomputação pura e stateless a partir de `elapsedSeconds` — é o que torna a retomada de órfã trivial (mesmo cálculo para sessão viva e retomada). Testado (8 casos, incluindo 1 ciclo sem pausa curta e elapsed negativo).
- **`timezone.ts`**: a decisão (a) do Gate 1 foi honrada de verdade — `startOfDayIso` resolve o instante UTC real da meia-noite em `profile.timezone` via `Intl` com `longOffset` (DST coberto), nunca o fuso do navegador. Testado, incluindo o caso da virada de meia-noite UTC.
- Query keys todas escopadas por `userId`; invalidação cobre as três listas.
- Recordação ativa corretamente **sem** sessão própria (hub de links) — evita contagem dupla com `flashcard_reviews`/`question_attempts`.
- Isolamento de bundle preservado: BlockNote só em `lesson-editor-*.js`; chunk `app.estudar` com 18 KB; `service_role` ausente do bundle cliente.

### Achados

**A1 (bloqueante, corrigido em `eaedcd2`)** — `finishStudySession` gravava `ended_at` do relógio do **cliente**, mas `started_at` vem do `now()` do **servidor** (~3,8 s à frente, medição do Gate 4 da 05.1). Concluir uma sessão nos primeiros ~4 s violava o `CHECK (ended_at >= started_at)` → erro `23514` → toast de falha, 100% reprodutível ("Concluir" habilitado desde o primeiro segundo em todos os métodos). Nota de honestidade da auditoria: a suspeita inicial era de órfã *permanente*; a releitura mostrou que o retry passa após a janela — o bug real era o erro transitório garantido. Correção: clamp `ended_at = max(now, started_at)` no cliente, sem migration e sem reabrir a decisão "sem RPC" do Gate 1. No caso extremo grava duração 0 — honesto, a sessão durou menos de 1 s.

**A2 (documentação/limpeza, corrigido em `f48f3e6`)** — o comentário do `schema.ts` afirmava validação Zod "chamada em runtime antes de qualquer UPDATE", mas nenhum componente a invocava. Comentário reescrito (schemas = especificação testada; barreira real é tipos TS + `maxLength` + CHECK do banco). Código morto removido: `updateStudySessionDetails`, `useUpdateStudySessionDetails` e `detailsSchemaByMethod` (este último descoberto pelo próprio implementador, aplicando o mesmo critério).

**A3 (menor, corrigido em `f48f3e6`)** — fallback `new Date().toISOString()` recriado a cada render pré-sessão em livre/blurting; estabilizado como constante de módulo `NO_SESSION_ISO`.

### Observações registradas (sem ação)

- `session?.started_at ?? ""` produziria `RangeError` se alcançado com `""` — inalcançável (botão só renderiza com `session` não-nulo, mesmo padrão do `session?.id ?? ""`), e cairia no `try/catch` com toast.
- `NO_SESSION_ISO` é o epoch (1970): pré-sessão o `useElapsedSeconds` calcula um valor gigante nunca exibido — inócuo.
- Métodos de texto não recuperam texto digitado de aba fechada (só o aviso `beforeunload`) — residual aceito e documentado no próprio código.

### Verificações independentes (rodadas pelo auditor em cada commit)

`typecheck` 0 erros · `lint` 0 erros (21 warnings pré-existentes) · **303/303 testes** (25 arquivos) · `build` ok.

## 3. Gate 4 — QA no preview (QA A e QA B, login manual do operador)

Incidente de ambiente no início: o dev server havia morrido e a aba rodava o SPA em memória com HMR aplicado pela metade (`ReferenceError: QUICK_CREATE_UNAVAILABLE`, constante que não existe mais no código — grep confirmou). Servidor reiniciado limpo → console zerado. Não era bug de código.

| Teste | Resultado |
|---|---|
| **A1 ao vivo**: concluir sessão em <4 s | ✓ 2× (Livre e Pomodoro): duração 0 gravada, sem `23514`, sem toast de erro |
| Pomodoro lê preferências reais | ✓ Foco 30:00, Ciclo 1/6 — valores não-default, vindos de `user_preferences` |
| Órfã → banner → retomada | ✓ banner "1 sessão não finalizada"; retomada com timer recalculado (28:45 após ~75 s do `started_at` persistido) |
| Finalizar no meio da fase | ✓ `cycles_completed` 0, duração 1 min nas atividades |
| Feynman com aula vinculada + texto | ✓ "Feynman · Aula 2 — Google Ads básico" nas atividades recentes |
| Cornell (3 campos) e Blurting (timer) | ✓ concluídos; timer contando de 0 sem flash negativo |
| Recordação ativa | ✓ hub de links, nenhuma sessão criada |
| Meta diária (dashboard + topbar) | ✓ 3/90 min · 3% nos dois lugares; aria-label correto |
| Atividades recentes | ✓ ordenação por início desc, limite 5, só finalizadas |
| Saudação por fuso do perfil | ✓ "Boa noite" às 22h, "Boa madrugada" após 0h (falso alarme de fuso descartado por medição: navegador em America/Sao_Paulo) |
| Console/erros | ✓ limpo após servidor limpo |
| **Isolamento QA B** | ✓ zero atividades da A visíveis; meta 0/**60** (prefs próprias da B); flashcard próprio da B intacto; sem banner de órfãs da A |

## 4. Nota de método

Cliques sintéticos da automação não abrem dropdowns Radix (mesma limitação da Fase 04 §7.2) — o menu de criação rápida da topbar fica como verificação manual (§6). Screenshots do painel oscilaram durante o QA; verificações feitas por árvore de acessibilidade, texto de página e DOM, que são determinísticos.

## 5. O que a fase entrega (auditado)

Os 6 métodos do plano (Pomodoro, Feynman, Blurting, Cornell, Recordação ativa, Livre) sobre a tabela `study_sessions` da migration do Gate 2 (RLS, FK composta, `duration_seconds` GENERATED, trigger de imutabilidade de timing, ERRCODE customizado — nunca 40001). Dashboard integrado: meta diária real por fuso do perfil, atividades recentes, indicador na topbar, criação rápida apontando para páginas reais.

## 6. Residuais para o operador (não bloqueiam a fase)

1. **1 clique**: menu "+" (Criação rápida) na topbar → conferir "Novo flashcard", "Nova questão", "Nova sessão de estudo" e que o último navega para /app/estudar.
2. **1 consulta SQL** (opcional, fecha a evidência de `details`): conferir os JSONs gravados pelas sessões do QA — esperado `explicacao` no Feynman, `notas/pistas/resumo` no Cornell, `texto` no Blurting, `cycles_completed` no Pomodoro.
3. Pendência herdada da Fase 04 §7.2: "Criar flashcard" no menu de arrastar do editor.
