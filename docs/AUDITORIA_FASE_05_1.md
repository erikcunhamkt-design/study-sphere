# Auditoria — Fase 05.1: Questões e simulados

Data: 02/08/2026
Escopo: banco de questões manual (múltipla escolha de resposta única e discursiva com autoavaliação), prática avulsa com feedback imediato, simulados compostos manualmente, execução com timer consultivo e placar congelado, histórico de tentativas.

Modelo de 4 gates com papéis separados (implementadora Sonnet 5 / auditora Fable 5, autora deste documento). Métodos de estudo e integração do dashboard ficam para a **Fase 05.2**.

---

## 1. Veredito

**APROVADO PARA A FASE 05.2**

---

## 2. Decisões do Gate 1 (operador delegou às recomendações da auditoria)

Fatiamento 05.1/05.2; conteúdo das questões em **texto plano** (sem JSONB inline-content — não há bridge de conversão bloco→questão nesta fase; se uma fase futura adicionar essa ponte, o formato precisa ser revisto); tipos v1 múltipla escolha (resposta única) e discursiva; composição de simulado manual com filtro por aula só na UI; limite de tempo **consultivo** (client-side, sem enforcement — ferramenta de estudo, não proctoring); triggers de imutabilidade desde a migration original.

## 3. Banco (Gate 2)

Migration `20260802000000_fase05_1_questions_exams.sql` — SHA-256 `bd254a48fb1f34ba57782beb392065500da000a6106a1cd6ffe0e3c5357bdc52` (commits `dac18ad` → `f12bbb1`).

Tabelas: `questions` (CHECK de forma por tipo com CASE aninhado — `jsonb_typeof` antes de `jsonb_array_length`, porque a ordem de avaliação de `AND` não é garantida em constraint), `exams`, `exam_questions` (FK composta nos dois lados com `user_id` compartilhado: só entra questão sua em exame seu, por construção), `exam_attempts` (`duration_seconds` como coluna GERADA), `question_attempts` (log imutável, UNIQUE parcial de uma resposta por questão dentro da tentativa). RPCs `submit_question_attempt` (correção de múltipla escolha sempre server-side) e `finish_exam_attempt` (idempotente, `FOR UPDATE` + `lock_timeout`).

**Dois triggers `set_config`:** `exam_attempts` (nasce sempre "em andamento"; `started_at` imutável — protege a coluna gerada; resultado só via RPC) e `question_attempts` (**INSERT só via RPC** — diferente do residual aceito em `flashcard_reviews`, aqui um attempt forjado contaminaria o placar de um simulado pela porta legítima da agregação).

**Achado do Gate 2 (bug real, corrigido antes de aplicar):** `finish_exam_attempt` contava acertos direto em `question_attempts` — remover questões do exame com uma tentativa em andamento produzia `score_correct > score_total`, estourando o CHECK e deixando a tentativa **permanentemente infinalizável** (todo retry falharia igual). Corrigido com consulta única ancorada em `exam_questions` (LEFT JOIN): `correct ⊆ total` por construção, sem clamp.

**Validação funcional da auditoria no banco real:** formas inválidas bloqueadas pelos CHECKs; INSERT direto no log → `42501`; correção server-side exata (certo/errado/índice fora do range); tentativa forjada já-finalizada → `22023`; resposta duplicada bloqueada; **regressão do fix: 1/1 após remoção de questão com tentativa em andamento**; finalização idempotente; placar forjado por UPDATE → `22023`; responder após finalização bloqueado.

## 4. Código (Gate 3) — aprovado sem correções

`src/features/questions/`: schema Zod com `discriminatedUnion` por tipo + checagem extra do índice contra o array real, chamado em runtime nos dois formulários; api/hooks com query keys por `userId`; UI `/app/questoes` com banco de questões, prática avulsa, composição, execução e histórico.

O cliente **nunca** calcula acerto nem placar — prática e simulado exibem apenas o que as RPCs devolvem (mesmo em múltipla escolha, onde teria os dados para calcular). O runner não revela acerto por questão durante o simulado (UX de prova) e retoma tentativa em andamento pulando as já respondidas. Histórico mostra só tentativas finalizadas, com placar congelado e rótulo explícito para simulado excluído (`exam_id` NULL vindo do `ON DELETE SET NULL`).

Verificação independente de bundle: chunk de `/app/questoes` **sem BlockNote e sem recharts**; zero chunks cliente com BlockNote fora do `lesson-editor`.

## 5. QA (Gate 4, preview real, credenciais manuais do operador)

| Cenário | Resultado |
|---|---|
| Criação de questão de múltipla escolha pela UI | ✅ (validação Zod barrou alternativa vazia corretamente durante o teste) |
| Criação de questão discursiva | ✅ |
| Prática avulsa com resposta errada | ✅ "Você errou" vindo da RPC |
| Criação e composição de simulado (2 questões) | ✅ |
| Execução completa (discursiva + múltipla escolha) | ✅ |
| Placar final × banco | ✅ **1/2 (50%)** idêntico |
| Histórico (placar congelado, duração 35s) | ✅ |
| Isolamento QA B: ver questões/exames/tentativas/respostas/composição | ✅ 0 linhas em tudo |
| QA B: responder questão da A / finalizar tentativa da A | ✅ `42501` |
| QA B: editar questão / excluir simulado da A | ✅ 0 linhas (RLS) |
| QA B: adicionar questão da A a um exame próprio | ✅ **`23503`** (FK composta) |
| Anônimo | ✅ validado no Gate 2 (42501 em tudo) |
| 320 px (ambas as abas) | ✅ sem overflow |
| Console | ✅ zero erros |

## 6. Achado do QA corrigido

**Timer do simulado exibia tempo negativo** ("-1:-2 decorridos") nos primeiros segundos. Causa-raiz medida pela auditoria: o relógio do servidor estava **~3,8 s à frente** do cliente, e o cronômetro fazia `Date.now() - started_at` sem piso. Corrigido (`44d53ed`) com `Math.max(0, …)` — como o timer é consultivo, não há necessidade de sincronizar relógios. **Re-verificado ao vivo:** `00:00 → 00:01 → 00:03`, sem negativo.

## 7. Residuais documentados (classe aceita — autoinfligidos, sem impacto entre usuários)

1. O autor da questão vê a própria resposta correta em qualquer SELECT — RLS protege contra outro usuário, não contra o próprio se autoenganar. Mesma classe da autoavaliação em discursiva.
2. `started_at` de `exam_attempts` é aceito como enviado no INSERT (imutável só a partir daí) — o dono pode retroagir e inflar a própria duração.
3. `exam_id` de uma tentativa é reapontável pelo dono via UPDATE comum — necessário para o `ON DELETE SET NULL` funcionar; não recalcula placar já congelado.
4. Corrida entre `submit_question_attempt` e `finish_exam_attempt` em duas abas: a resposta entra ou não no placar final, nunca fica inconsistente.
5. `submit_question_attempt` sem `FOR UPDATE` (não há leitura-modificação de linha compartilhada; o índice único resolve a corrida real com erro limpo).
6. Reordenação da composição não é atômica (posições transitórias duplicadas possíveis) — afeta só exibição, nunca placar.

## 8. Observações para a Fase 05.2

- Dropdown "Criação rápida" ainda lista **Flashcard e Questão como "Em breve"** embora ambos existam — arrumar junto com o trabalho de dashboard da 05.2.
- Verificar `user_preferences` antes de hardcodar a meta diária de 90 min (decisão condicional do Gate 1).

## 9. Comandos finais (re-executados pela auditoria)

`npm run typecheck` 0 erros · `npm run lint` 0 erros / 21 warnings pré-existentes · `npm run test` **278/278** (22 arquivos; 17 novos) · `npm run build` ok, bundle estanque.

## 10. Commits da fase (locais, sem push)

`dac18ad` (migration p/ aprovação) → `f12bbb1` (fix do placar, Gate 2) → `521d0f3` (implementação completa, Gate 3) → `44d53ed` (fix do timer, Gate 4) → este documento.

**APROVADO PARA A FASE 05.2** (métodos de estudo: Feynman, recordação ativa, blurting, Cornell, Pomodoro + integração do dashboard).
