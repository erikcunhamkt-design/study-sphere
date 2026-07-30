# Auditoria — Fase 03.3: Blocos acadêmicos de estudo

Data: 30/07/2026
Escopo: evolução do callout genérico para o vocabulário acadêmico real do StudyOS — os blocos que conectam o editor ao restante do produto (flashcards na Fase 04, buscas por definição, revisão espaçada ancorada em conceito).

---

## 1. Veredito

**APROVADO PARA A FASE 04**

---

## 2. Desenho

**Um único tipo de bloco (`studyBlock`) com a variante em `props.kind`**, em vez de 13 tipos separados. Razões: schema enxuto (uma entrada no Zod e no editor), transformação futura entre variantes preservando ID trivial (`updateBlock` só de props — a base validada na 03.0 §12), e identificação estável para as fases seguintes: um flashcard da Fase 04 referencia `block.id` + `kind === "perguntaRevisao"` sem precisar de tabela própria por tipo.

As 13 variantes do plano: conceito, definição, exemplo, dúvida, atenção, resumo, fórmula, linha do tempo, pergunta de revisão, referência, aplicação prática, causa e consequência, erro comum. Cada uma com ícone, rótulo em português, cor própria (borda esquerda + fundo tingido, funcionando em tema claro e escuro) e `role="note"` com `aria-label` do rótulo. Fórmula renderiza o conteúdo em fonte mono.

**Callout genérico (info/attention/success) permanece no schema** por compatibilidade com documentos já persistidos — nenhuma migração de conteúdo foi necessária.

**Fallback de runtime**: `kind` desconhecido vindo de dado persistido degrada para "conceito" em vez de quebrar o render — defesa contra o achado da 03.0 §13 (propSchema do BlockNote não valida em runtime). Na prática o Zod de carregamento rejeita o documento antes; o fallback é a segunda camada.

## 3. Banco

**Nenhuma migration nesta fase.** O documento continua no mesmo JSONB com as mesmas RLS/policies/funções auditadas nas fases 03.1–03.2; a superfície de segurança não mudou, portanto QA B/anônimo não foram re-executados (a última execução completa, na 03.2, permanece válida).

## 4. Validação Zod

`studyBlock` aceito com `kind` restrito ao enum **importado da fonte única** (`STUDY_KIND_VALUES` de `study-block.tsx`) — sem lista duplicada; um teste automatizado trava drift entre o Zod, o propSchema do editor e a lista do plano. Kind desconhecido rejeita o documento no carregamento e no save.

## 5. i18n (pendência da 03.2 fechada)

Dicionário `pt` do BlockNote ativado no editor (`dictionary: pt`). Confirmado ao vivo: o bloco de imagem vazio agora mostra **"Adicionar imagem"** (antes "Add image"). Menu `/`, blocos custom e mensagens do produto já eram 100% português.

## 6. QA funcional (preview real, conta QA B)

| Cenário | Resultado |
|---|---|
| Persistir documento com as 13 variantes + reload | ✅ todas renderizam com `data-study-kind`, rótulo e `role="note"` corretos |
| Fórmula em fonte mono | ✅ |
| Edição dentro de bloco de estudo + autosave | ✅ "Salvo" (passa pela validação Zod do performSave) |
| Criação de documento em conta limpa (primeiro save, expected_version 0) | ✅ v1 criada |
| Dicionário pt | ✅ "Adicionar imagem" |
| 320 px | ✅ sem overflow horizontal |
| Console | ✅ zero erros |

## 7. Bundle

`lesson-editor-*.js`: **249 KB gzip** (+3 KB sobre a 03.2 — bloco de estudo + dicionário pt). Continua chunk único; **zero** outros chunks com BlockNote.

## 8. Comandos finais

- `npm run typecheck` — 0 erros.
- `npm run lint` — 0 erros; 21 warnings `react-refresh/only-export-components` (classe benigna conhecida, +1 do novo arquivo de bloco).
- `npm run test` — **225/225** (19 arquivos; +2 novos: variantes do bloco de estudo no schema e no Zod).
- `npm run build` — sucesso.

## 9. Observações registradas

1. **Menu `/` ficou grande** (30 itens em 4 grupos). A filtragem por digitação mitiga; se incomodar no uso real, reavaliar agrupamento/ordem na Fase 04.
2. **Transformar variante de bloco de estudo** (ex.: dúvida → conceito) ainda não tem UI própria — só recriando o bloco. Como `updateBlock` de props preserva ID, é melhoria barata para quando os flashcards tornarem isso relevante.
3. **Linha do tempo é uma variante de callout**, não um layout estruturado de eventos — coerente com o plano ("blocos de callout evoluem"), registrado para expectativa.
4. **Resíduo de QA**: aula "Aula QA 03.3" na conta QA B com as 13 variantes + módulo "Módulo QA 03.3" (se criado). Base para re-execução; pode ser apagado.
5. Pendências herdadas que permanecem: mídia órfã sem coleta (03.2 §12.1), teste manual de drag-and-drop de imagem (03.2 §12.3).

## 10. Commits da fase (locais, sem push)

`f19fbd8` (bloco de estudo + dicionário pt) → este documento.

**APROVADO PARA A FASE 04**
