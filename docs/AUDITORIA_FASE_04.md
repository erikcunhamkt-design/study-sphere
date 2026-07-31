# Auditoria — Fase 04: Flashcards

Data: 30/07/2026
Escopo: flashcards manuais, conversão de bloco→cartão, repetição espaçada (SM-2 simplificado) e métricas de retenção.

Processo: primeira fase executada integralmente no modelo de **4 gates** com papéis separados — sessão implementadora (Sonnet 5) coda, sessão auditora (Fable 5, autora deste documento) audita cada gate: (1) plano, (2) SQL antes de aplicar, (3) código antes do QA, (4) QA + este veredito.

---

## 1. Veredito

**APROVADO PARA A FASE 05**

---

## 2. Decisões de produto (Gate 1, aprovadas pelo operador)

SM-2 simplificado com 4 notas (Errei/Difícil/Bom/Fácil) e learning steps de [1, 3] dias; **Fácil gradua imediatamente** de novo/aprendendo (4d); `ease`/`interval` internos, nunca expostos como configuração. Cards avulsos permitidos (`lesson_id` nullable, `ON DELETE SET NULL (lesson_id)` — excluir a aula desvincula o card, não o destrói). DELETE de card permitido, com o histórico de revisões dele removido em cascata — comunicado explicitamente na UI de exclusão. Sem tabela de decks nesta fase. Criação manual v1 com textarea; front/back persistem como JSONB inline-content (formato do caderno).

## 3. Banco (Gate 2)

Migration `20260730150000_fase04_flashcards.sql` — SHA-256 `23478dee1bc513c99ddc56e14c8deb87f6551176a19d8e20c8bd47f28c815081` (commits `afa6202` → `4ad4de6`).

- `flashcards` com estado de agendamento na própria linha; CHECKs completos; FK composta com lessons; índice parcial da fila.
- `flashcard_reviews` — log imutável (sem UPDATE/DELETE para authenticated), base das métricas.
- RPC `submit_flashcard_review` (SECURITY INVOKER, `lock_timeout` antes do `FOR UPDATE`, sem ERRCODE 40001): **única** fonte da matemática de agendamento; o cliente só envia a nota.
- **Trigger `enforce_flashcard_schedule_immutability`** (iniciativa da implementadora, aprovada): as colunas de agendamento só mudam pela RPC, sinalizada via `set_config` local. A auditoria do Gate 2 encontrou e mandou fechar um furo real — o trigger original cobria só UPDATE, e um INSERT forjado criava card "já graduado"; agora `BEFORE INSERT OR UPDATE`, com INSERT exigindo o estado inicial exato. Caps adicionados: ease ≤ 5.00, intervalo ≤ 36500d.
- Validação funcional da auditoria no banco real: matriz de transições **8/8 exata** (aprendizado→graduação, difícil/bom/fácil, lapso com ease 2.35→2.15, graduação imediata do Fácil), cerca de imutabilidade bloqueando os 3 vetores de fraude, cascade de exclusão conferido.

## 4. Código (Gate 3)

`src/features/flashcards/` — schema Zod chamado em runtime (criação/edição/conversão), api/hooks com query keys por `userId`, sessão de revisão com fila congelada, métricas 100% reais (exibe "—" sem dados, nunca fabrica valor), espelho TS do SM-2 **confinado a testes** (verificado por grep). Rota `/app/flashcards` completa; conversão via item condicional no side menu (só `studyBlock` + `perguntaRevisao`), atravessando o BlockNote por um Context estreito (`flashcard-bridge`).

Dois achados da auditoria corrigidos no gate:
1. **Formatação perdida na conversão/edição** (violava critério do Gate 1): o fluxo achatava tudo para texto. Corrigido (`103a03b`): a ponte carrega o inline-content original; se o usuário não editar a frente, o conteúdo rico persiste intacto — cobrindo também a edição de card rico existente.
2. **(Auto-achado da implementadora, confirmado pela auditoria):** importar `isSafeUrl` do editor arrastava o BlockNote inteiro (220 KB gzip) para o chunk de flashcards; corrigido com cópia local documentada. Verificação independente do build: **chunks de flashcards com zero BlockNote**; `lesson-editor` segue o único.

## 5. QA (Gate 4, preview real, credenciais manuais do operador)

| Cenário | Resultado |
|---|---|
| Criação manual pela UI (diálogo, validação, toast) | ✅ |
| Conversão: `source_block_id`, vínculo com a aula, **negrito preservado no JSONB** | ✅ |
| Sessão de revisão completa pela UI (mostrar resposta → 4 notas → conclusão) | ✅ "2 cartões revisados" |
| Efeitos das notas conferidos contra a matriz (Bom→aprendendo 1d; Fácil→revisão 4d) | ✅ exatos, log correto |
| Métricas pós-sessão (retenção 100% real, estados, 0 devidos) | ✅ |
| Isolamento entre contas (ver/revisar/arquivar/excluir card alheio) | ✅ 0 linhas / 42501 |
| Anônimo (SELECT/INSERT/EXECUTE) | ✅ 42501 em tudo |
| 320 px | ✅ após correção (ver §6) |
| Console | ✅ zero erros |

## 6. Achado do QA corrigido

Overflow horizontal de ~14px em 320px na página de flashcards, causado pelos ticks do eixo X do gráfico recharts. Corrigido (`0f818d7`): `interval="preserveStartEnd"` + `minTickGap` + `overflow-hidden` em duas camadas. **Re-verificado ao vivo pela auditoria**: gráfico renderizado em 320px com 4 ticks e `scrollWidth == 320`.

## 7. Residuais e limitações (documentados, aceitos)

1. **INSERT direto em `flashcard_reviews` pelo cliente é possível** (consequência do SECURITY INVOKER — mesma classe aceita na 03.1). O agendamento real da fila está protegido pelo trigger; apenas o log de métricas do próprio usuário é inflável por ele mesmo.
2. **Dropdown do menu do bloco não abre com eventos sintéticos** (limitação de ambiente §17, recorrente desde a 02.1): a conversão foi validada com o item condicional visível, ponte/diálogo/persistência exercitados de verdade e formatação conferida no banco. Recomendado 1 clique manual do operador como verificação visual final.
3. Sem limite diário de cards novos na fila; conversão só a partir de `perguntaRevisao` (outros kinds são candidatos futuros); "prévia do próximo intervalo" nos botões deliberadamente não implementada (evita duplicar o algoritmo no cliente).

## 8. Comandos finais (re-executados pela auditoria)

`npm run typecheck` 0 erros · `npm run lint` 0 erros/21 warnings pré-existentes · `npm run test` **261/261** (21 arquivos; 36 novos na fase) · `npm run build` ok, bundle estanque.

## 9. Commits da fase (locais, sem push)

`afa6202` (migration p/ aprovação) → `4ad4de6` (fix do trigger + caps, Gate 2) → `39b25bf` (implementação completa) → `103a03b` (formatação preservada, Gate 3) → `0f818d7` (overflow do gráfico, Gate 4) → este documento.

**APROVADO PARA A FASE 05** (questões, simulados e métodos de estudo: Feynman, recordação ativa, blurting, Cornell e Pomodoro).
