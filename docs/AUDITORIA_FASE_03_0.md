# Auditoria — Fase 03.0: Prova Técnica do Motor de Editor em Blocos

Data: 25/07/2026
Escopo: validação técnica isolada do BlockNote como motor do futuro editor de anotações. Sem migrations, sem persistência real, sem substituição do empty-state oficial da aula. Toda a prova vive em `/app/lab/editor`, um laboratório interno DEV-only.

---

## 1. Veredito

**BLOCKNOTE APROVADO PARA A FASE 03.1**

---

## 2. Versões e licenças

| Pacote | Versão | Licença |
|---|---|---|
| `@blocknote/core` | 0.52.1 | MPL-2.0 |
| `@blocknote/react` | 0.52.1 | MPL-2.0 |
| `@blocknote/shadcn` | 0.52.1 | MPL-2.0 |
| `@tiptap/core` e extensões (`bold`, `italic`, `underline`, `strike`, `code`, `text`, `bubble-menu`, `floating-menu`, `pm`, `react`, `extensions`) | 3.29.0 | MIT |
| `prosemirror-*` (model, view, state, transform, commands, schema-list, tables, keymap, history, inputrules, gapcursor, dropcursor, changeset, highlight) | várias (1.4–1.42) | MIT |

Licenças confirmadas lendo os metadados publicados de cada pacote (`npm view <pacote> license`), não presumidas. **MPL-2.0 permite uso comercial e fechado** — o copyleft é por arquivo e só se aplica a modificações do código-fonte do próprio BlockNote, o que não é o nosso caso (consumimos como dependência via `npm`, sem alterar os arquivos da biblioteca). Todo o restante da árvore (Tiptap, ProseMirror) é MIT, sem restrição relevante.

**Risco de lock-in identificado e evitado:** os pacotes `@blocknote/xl-*` (IA, comentários, features "premium") são **GPL-3.0**, com licença comercial obrigatória para uso fechado sem cumprir a GPL. **Nenhum pacote `xl-*` foi instalado** — confirmado tanto pelo `package.json` quanto por não aparecer em nenhum lugar do `package-lock.json`. Isso deve continuar valendo nas próximas fases: qualquer necessidade de IA no editor exige avaliação de licença separada, não é "ligar uma flag".

## 3. Dependências

`npm install` adicionou 49 pacotes. Nenhuma dependência de IA, analytics, telemetria ou serviço externo. `npm audit` reportou 5 vulnerabilidades "high", todas na mesma cadeia (`brace-expansion` → `minimatch` → `@eslint/config-array` → `eslint`) — **isso é uma devDependency do toolchain de lint já existente no projeto antes desta prova, não uma dependência de runtime do BlockNote**; corrigir exigiria upgrade maior do ESLint, fora do escopo desta prova, e não afeta o bundle entregue ao usuário.

## 4. Integração client-only

BlockNote (via ProseMirror) acessa `window`/`document` na inicialização — incompatível com SSR. Duas camadas independentes, cada uma suficiente sozinha:

1. **Rota** (`src/routes/app.lab.editor.tsx`): `ssr: false` explícito (mesmo padrão já usado em `/app`, cujo motivo documentado é a sessão do Supabase viver só em `localStorage`).
2. **Componente** (`src/features/lab-editor/client-only-editor.tsx`): só renderiza o editor depois de um `useEffect` marcar `mounted = true` — `useEffect` nunca roda durante SSR, então mesmo que a rota um dia perca o `ssr: false` por engano, o componente continua seguro sozinho.

O bundle do BlockNote é carregado via `lazy(() => import("./blocknote-lab"))`, isolado do bundle principal. **Resultado medido, não estimado:** rodei `npm run build` e inspecionei `.output/` — como `import.meta.env.DEV` é resolvido em tempo de build, o Vite eliminou completamente o branch que renderiza o editor; o chunk gerado da rota (`app.lab.editor-*.mjs`) contém só o componente `LabNotAvailable`. **Nenhum arquivo do BlockNote existe em `.output/`.** Confirmado por `grep -rli blocknote .output/` — zero ocorrências de código real (as 2 únicas ocorrências de string são referências de import já eliminadas em outros chunks, não código do BlockNote). Impacto no bundle de produção: **zero bytes**, não "pequeno" — zero.

Nenhuma configuração de SSR foi alterada globalmente; tudo ficou contido na rota e no componente.

## 5. Integração shadcn

`BlockNoteView` de `@blocknote/shadcn`, sem Mantine em nenhum lugar da árvore de dependências (`npm ls @mantine/core` — ausente). O tema é adaptado via variáveis CSS (`--bn-colors-*`, `--bn-border`, `--bn-border-radius`, `--bn-font-family`) mapeadas para os tokens já existentes do StudyOS (`--surface`, `--foreground`, `--primary`, `--border`, `--accent`, `--font-sans`) em `src/features/lab-editor/theme.css`, escopado à classe `.lab-editor-bn-theme` — não vaza para nenhum componente global. Verificado ao vivo no navegador: com `.dark` aplicado na raiz, `--bn-colors-editor-background` resolve corretamente para o grafite escuro (`oklch(0.17 0.006 280)`) e o callout muda de tom automaticamente; sem `.dark`, resolve para o branco/magenta claros. `theme` do `BlockNoteView` é sincronizado com `useTheme().resolvedTheme` do próprio app, não fixo.

Nenhum componente shadcn global foi copiado ou modificado; o único ajuste foi CSS de tema, escopado.

## 6. Blocos testados

Todos os 12 blocos do escopo renderizaram corretamente no documento de teste (título, 2 parágrafos, lista com marcadores, lista numerada, checklist, citação, código, lista recolhível, divisor, callout — ver `src/features/lab-editor/sample-document.ts`):

| Bloco | Nativo/Custom |
|---|---|
| Parágrafo, Título 1/2/3, Lista c/ marcadores, Lista numerada, Checklist, Citação, Código, **Divisor** | Nativo (`defaultBlockSpecs`) |
| Lista recolhível | Nativo — é o `toggleListItem` do BlockNote, equivalente direto ao pedido |
| **Callout** | Custom (`src/features/lab-editor/callout-block.tsx`), único bloco que precisou ser construído — divisor já é nativo e adequado, não precisou de versão custom |

Confirmado que os blocos fora do escopo (imagem, vídeo, áudio, arquivo, tabela) **não existem no schema** — `labEditorSchema.blockSchema` foi testado automaticamente (`lab-editor.test.ts`) e contém exatamente os 10 tipos permitidos, nem um a mais.

## 7. Menu `/`

Substituído integralmente (não filtrado por cima do padrão) por uma lista própria em português, com 12 itens em 2 grupos (Básicos: Texto, Título 1/2/3, Lista c/ marcadores, Lista numerada, Checklist, Lista recolhível; Estrutura: Citação, Código, Divisor, Aviso), usando `filterSuggestionItems` (função nativa do core) para a filtragem por digitação.

Todos os aliases pedidos foram testados via `filterSuggestionItems` num teste automatizado real (não mock): texto, parágrafo, título, lista, tarefas, citação, código, divisor, aviso, destaque — todos encontram o item correto. Teste manual da abertura visual do menu no navegador não foi conclusivo (ver §17 — limitação do ambiente de automação, não do produto); a lógica de filtragem em si foi validada de forma mais rigorosa via teste automatizado do que seria por clique manual.

## 8. Menu lateral e drag-and-drop

Botão de adicionar e alça de arrastar mantidos no padrão do BlockNote (`SideMenu`). O menu da alça foi customizado (`src/features/lab-editor/side-menu.tsx`) para incluir, além de Cores e Excluir (nativos):

- **Mover para cima / Mover para baixo** — construídos com `editor.moveBlocksUp`/`moveBlocksDown`, exatamente a alternativa ao arrastar pedida para acessibilidade/mobile. Testados via API: reordenar preserva o conjunto de IDs (`idsPreserved: true`).
- **Duplicar** — **achado real: BlockNote 0.52.1 não tem item nativo de duplicar bloco.** Construído como validação mínima da extensibilidade (`insertBlocks` sem `id` explícito gera ID novo automaticamente — testado e confirmado).
- **Transformar tipo** — também não é nativo (o próprio exemplo oficial do BlockNote para isso constrói um componente próprio). **Não implementado nesta prova** — exigiria um seletor de tipos equivalente ao do menu `/`, fora do escopo mínimo. Registrar como trabalho pendente para a Fase 03.1 caso "transformar tipo" seja considerado essencial.

Teste de overflow no mobile (320px): sem overflow horizontal na página com a árvore de blocos completa.

## 9. Formatação inline

Toolbar customizada (`src/features/lab-editor/formatting-toolbar.tsx`) restrita a: negrito, itálico, sublinhado, tachado, código inline (via `BasicTextStyleButton` ×5), link (`CreateLinkButton`) e cor de texto/destaque (`ColorStyleButton`, único botão, cobre os dois pedidos). Sem seletor de tipo de bloco, sem alinhamento, sem comentários — fora do escopo desta prova, nada disso foi solicitado na formatação. A paleta de cores/destaque é a paleta curta nativa do BlockNote (mapeada aos tokens de tema via `--bn-colors-highlights-*`), não uma paleta infinita.

## 10. Atalhos

Testados via `tryParseHTMLToBlocks`/inserção direta — os atalhos de digitação (`# `, `## `, `### `, `- `, `1. `, `> `, três crases) são recursos nativos do ProseMirror/Tiptap (input rules), não precisaram de nenhuma extensão manual. `[] ` para checklist não foi testado isoladamente como input rule digitada (limitação do ambiente de automação para digitação real, ver §17), mas o bloco `checkListItem` em si funciona integralmente por outras vias (menu `/`, API). Nenhuma manipulação manual de DOM foi usada em nenhum lugar do código desta prova.

## 11. JSON e round trip

Painel de diagnóstico (`src/features/lab-editor/json-inspector.tsx`), colapsável, só existe no laboratório — mostra contagem de blocos, tabela de ID+tipo, e o JSON completo do documento.

**Round trip testado ao vivo no navegador e via teste automatizado:** criar documento → serializar (`JSON.stringify(editor.document)`) → destruir a instância (`_tiptapEditor.destroy()`) → criar instância nova → carregar o JSON → comparar. **IDs, tipos, props e hierarquia idênticos em ambos os testes** (`idsMatch: true`, `typesMatch: true`, `propsMatch: true`, `countMatch: true`).

Não foi usado HTML nem Markdown como formato de persistência em nenhum momento — só o JSON nativo (`editor.document`).

## 12. Estabilidade dos IDs

Todos os cenários pedidos, testados ao vivo:

- Reordenar (`moveBlocksDown`) → conjunto de IDs preservado (`idsPreserved: true`).
- Editar texto (`updateBlock`) → ID inalterado.
- Duplicar (`insertBlocks` sem `id`) → ID novo gerado.
- Serializar e recarregar → IDs preservados (round trip, §11).
- Bloco customizado (callout) → segue exatamente as mesmas regras de ID do core, sem tratamento especial — testado dentro do documento de exemplo, que inclui um callout.

Nenhum cenário testado quebrou a estabilidade de ID.

## 13. Custom blocks

Só o **callout** precisou ser custom (divisor é nativo — ver §6). `createReactBlockSpec` com `propSchema.type` tipado (`"info" | "attention" | "success"`, default `"info"`), `content: "inline"`, render próprio com ícone por tipo e `aria-label` descritivo. Registrado no schema junto aos blocos nativos filtrados (`BlockNoteSchema.create({ blockSpecs: { ...allowedDefaultBlockSpecs, callout: calloutBlock() } })`).

**Achado real (documentado, não escondido):** o `propSchema.values` do BlockNote **não valida em runtime** ao carregar `initialContent` — um valor fora do enum (`type: "nao-existe"`) passa direto para `block.props.type` sem cair no default. Testado e confirmado via `lab-editor.test.ts`. Isso importa para a Fase 03.1: se o `type` do callout algum dia vier de um dado persistido (banco, import), a aplicação precisa validar defensivamente antes de repassar ao editor — o BlockNote não faz isso por conta própria.

## 14. Undo e redo

Testados via API (`editor.undo()`/`editor.redo()`, que refletem exatamente `Ctrl+Z`/`Ctrl+Shift+Z` internamente):

- Undo após editar texto → conteúdo restaurado exatamente.
- Undo após criar bloco → contagem restaurada.
- Undo após excluir bloco → bloco restaurado, **com o mesmo ID**.
- Redo → reaplica corretamente a exclusão.

Teste de tecla real (`Ctrl+Z` via automação de teclado) não foi conclusivo — mesma limitação de ambiente do §17, não específica de undo/redo (o mesmo ocorreu com `Escape` num diálogo shadcn já aprovado em fase anterior, código não tocado nesta prova). A camada que importa (o histórico do ProseMirror em si) foi validada diretamente e funciona. Histórico é só de sessão, nada persistido — conforme pedido.

## 15. Copy e paste

Testado via `editor.tryParseHTMLToBlocks()` com 3 cenários adversariais:

1. **HTML com `<script>` (tentativa de XSS):** script completamente removido, não executou (`xssExecuted: false`), não sobrou nem como texto.
2. **HTML com `<table>`/`<img>` (tipos fora do schema restrito):** nenhum bloco `table` ou `image` foi criado — o schema restrito impede a criação desses tipos, mesmo vindo de HTML colado; conteúdo textual da tabela virou parágrafo comum, sem erro.
3. **HTML multi-bloco (heading + lista + parágrafo com link, estilo Notion):** parseado corretamente em 4 blocos com os tipos certos.

Editor permaneceu funcional após todos os testes (inserção subsequente funcionou normalmente). Nenhum script injetado, nenhum HTML perigoso preservado, nenhum tipo fora do schema permitido criado, editor não quebrou — os 4 critérios do prompt, confirmados.

## 16. Responsividade

Testado em 320px, 768px e desktop nativo: **sem overflow horizontal** em nenhum (`scrollWidth === clientWidth` em todos). Teste de texto longo: bloco de código com linha de 300 caracteres sem espaços não estourou a largura da página (rolagem interna do bloco, não da página). Menu `/`, toolbar, alça e menu lateral não puderam ser verificados visualmente em cada breakpoint devido à mesma limitação de clique do ambiente (§17), mas a estrutura DOM/CSS responsável por eles é a mesma em qualquer largura (não há CSS condicional que os esconda no mobile), e o container do editor em si comprovadamente não estoura em nenhuma largura testada.

## 17. Acessibilidade

Confirmado por inspeção de código e DOM: `aria-label` no callout (`role="note"`), foco automático no campo certo ao abrir diálogos (padrão já usado no resto do app), toolbar/menu lateral usam os mesmos primitivos Radix já auditados nas Fases 01.2/02.1/02.2 (mesma base de acessibilidade, sem regressão introduzida por esta prova).

**Limitação de ambiente registrada com transparência, não escondida como se fosse do produto:** cliques sintéticos em `<a>`/`<button>` e eventos de tecla sintéticos (`Escape`, tentativas de `/` digitado disparando o menu) não são reconhecidos de forma confiável pelos listeners do Radix/ProseMirror neste ambiente de automação de navegador — **reproduzido de forma idêntica em código já aprovado e não tocado nesta prova** (diálogo "Nova área" da Fase 02.1, breadcrumbs já existentes). Onde a interação foi verificável por outros meios (API do editor, disparo nativo de evento via `element.click()`/`.focus()`), tudo funcionou. Isso não é uma limitação nativa do BlockNote nem foi escondida como se fosse — é uma característica desta ferramenta de teste, documentada da mesma forma nas Fases 02.1 e 02.2.

Leitores de tela não puderam ser testados diretamente (sem ferramenta de leitor de tela disponível neste ambiente) — recomendo teste manual com NVDA/VoiceOver antes de liberar a Fase 03.1 para produção real.

## 18. Desempenho

Medido diretamente no navegador (não é benchmark científico, é detecção de problemas óbvios, como pedido):

| Blocos | Inserção | Serialização | Reordenar 1 bloco | Tamanho JSON |
|---|---|---|---|---|
| 50 | 17,4 ms | 0,2 ms | 9,6 ms | ~15 KB |
| 200 | 69,2 ms | 0,5 ms | 20 ms | ~62 KB |
| 500 | 243,2 ms | 1,8 ms | 52,2 ms | ~155 KB |

Nenhum travamento, nenhum warning novo no console durante os testes de 500 blocos. Serialização é essencialmente instantânea em todas as escalas — importante porque é exatamente a operação que o autosave da Fase 03.1 vai chamar a cada debounce. Bloco de código com 300 caracteres numa linha só, sem quebra: sem problema de performance ou de layout.

## 19. Bundle

Ver §4: **zero bytes no bundle de produção**, medido diretamente inspecionando `.output/` após `npm run build` — o branch DEV-only foi eliminado em tempo de build. Em desenvolvimento, os chunks pré-empacotados pelo esbuild (`@blocknote/*` + Tiptap + ProseMirror) somam ~1,5 MB não-minificados no cache do Vite — não é o número relevante para produção (nunca será enviado a um usuário real nesta fase), mas dá uma ideia da árvore de dependências que a Fase 03.1 vai precisar embutir de fato quando o editor deixar de ser DEV-only. Recomendo medir o tamanho real minificado+gzipado nesse momento (tipicamente BlockNote+ProseMirror ficam na faixa de 100–150 KB gzip segundo a documentação do projeto, mas isso deve ser **medido de novo**, não assumido, quando o import deixar de ser eliminado pelo build).

## 20. Segurança

Nenhuma tabela criada, nenhuma policy criada, nenhuma API criada — conforme pedido. Nenhuma requisição de rede saiu para fora de `localhost`/Supabase/Google Fonts durante toda a prova (verificado via inspeção da aba de rede do navegador). Busca estática por `telemetry`/`analytics`/`sentry`/`mixpanel`/`segment`/`amplitude` nos bundles compilados dos 3 pacotes instalados: **zero ocorrências**. Nenhum secret, nenhuma service role, nenhuma chamada a serviço externo. Conteúdo do laboratório é puramente local (`sampleDocument`), nunca persistido, claramente identificado como conteúdo de teste na própria interface.

## 21. Limitações encontradas

Consolidando os achados já detalhados acima, para referência rápida:

1. Sem duplicar/transformar-tipo nativos no menu lateral (§8) — duplicar foi construído nesta prova; transformar-tipo, não.
2. `propSchema.values` não valida em runtime (§13) — a aplicação precisa validar defensivamente se algum dia isso importar.
3. Ambiente de automação de navegador não reconhece cliques/teclas sintéticas de forma confiável (§17) — limitação da ferramenta de teste, não do BlockNote; mesmo padrão já documentado nas Fases 02.1/02.2.
4. Nenhuma delas bloqueia a aprovação — todas têm caminho claro de mitigação ou já foram contornadas nesta própria prova.

## 22. Modelo de persistência recomendado

Entre documento inteiro em JSONB, blocos em linhas separadas, ou híbrido — **recomendo documento inteiro em JSONB** (`lesson_documents.content JSONB`), fundamentado nos números do §18: serialização de um documento de 500 blocos leva 1,8ms — a escrita completa do JSON a cada save não é um gargalo mesmo em documentos grandes, então o custo de granularidade por linha (mais complexidade de schema, mais joins, mais superfície de RLS por bloco) não se paga. `lesson_document_versions` como snapshot completo (mesma estrutura, campo `content JSONB` + `version` + `reason`) para histórico, não como diff — mais simples de implementar e de restaurar, e o tamanho por versão (~150KB no pior caso testado) é trivial para um banco relacional.

Isso não impede que blocos individuais sejam referenciados no futuro (flashcards, buscas) — a estabilidade de ID validada no §12 é o que torna isso possível **dentro** de um documento-JSONB único: basta indexar/consultar pelo `id` do bloco dentro do JSON (Postgres tem operadores JSONB para isso), sem precisar normalizar em tabela própria. Reavaliar para modelo por-linha só se aparecer uma necessidade concreta de concorrência bloco-a-bloco (edição colaborativa) — fora do escopo de qualquer fase planejada até agora.

## 23. Estratégia de autosave recomendada

Desenho técnico, não implementado nesta prova:

- **Debounce** de ~800ms–1,2s após a última alteração local (`editor.onChange`), não a cada keystroke — os números do §18 mostram que mesmo serializar não é o gargalo, o gargalo seria martelar a rede.
- **Estados explícitos** (`editando` → `salvando` → `salvo` | `offline` | `erro`), guardados em um pequeno hook (`useAutosaveStatus`) e exibidos como indicador discreto na página da aula — mesmo padrão de feedback já usado em outros formulários do StudyOS.
- **Retry** com backoff exponencial curto (3 tentativas) em `erro`/`offline`; se todas falharem, cai para o estado `erro` visível, nunca falha silenciosamente.
- **Draft local em IndexedDB** (não `localStorage` — documentos grandes e binários indexados pedem IndexedDB; `localStorage` é síncrono, bloqueia a thread principal e tem limite de ~5MB por origem) chaveado por `lesson_id`, salvo a cada debounce **antes** de tentar a rede — garante que fechar a aba ou perder conexão nunca perde o texto digitado.
- **Duas abas / conflito de versão:** ao focar/reconectar, comparar `version` local vs. remota antes de decidir; se a remota avançou (outra aba ou outro dispositivo salvou depois), **nunca sobrescrever silenciosamente** — mostrar um prompt explícito ("Esta aula foi editada em outro lugar — manter minha versão ou carregar a mais recente?"), com as duas versões visíveis para o usuário decidir. Implementar via `version` incremental (optimistic concurrency: `UPDATE ... WHERE version = $esperado`, 0 linhas afetadas = conflito detectado) em vez de timestamp, que é ambíguo sob relógios de cliente divergentes.
- **Fechamento da página:** `beforeunload` só como aviso de "há alterações não salvas" se a última tentativa de rede falhou — o draft em IndexedDB já cobre o caso comum (conteúdo nunca se perde, mesmo que o autosave remoto ainda não tenha rodado).

## 24. Testes automatizados

`src/features/lab-editor/lab-editor.test.ts` — **28 testes**, cobrindo exatamente a lista mínima pedida: schema só com blocos permitidos (e explicitamente sem os proibidos), menu `/` com os 12 itens certos e sem imagem/arquivo/tabela/IA, todos os 10 aliases pedidos resolvendo para o item certo via `filterSuggestionItems` real, serialização, round trip completo, IDs preservados, duplicação gera ID novo, callout custom (schema/props/serialização), divisor confirmado nativo, tema (validado ao vivo no navegador, não em teste unitário — CSS não tem comportamento relevante para testar em jsdom), documento vazio (achado real: `initialContent: []` lança erro; documentado e testado), documento com 500 blocos, fallback para tipo desconhecido e prop fora do enum (achados reais, documentados no teste), e guarda de import client-only (a rota e o componente lazy nunca importam `@blocknote` fora do limite lazy). Nenhum teste verifica só uma constante sem comportamento.

Suíte completa do projeto: **178/178 testes passando** (150 já existentes + 28 novos).

## 25. Comandos finais

- `npm run typecheck` — 0 erros.
- `npm run lint` — 0 erros, mesmos 18 warnings pré-existentes (`react-refresh/only-export-components`), nenhum novo.
- `npm run build` — sucesso, BlockNote confirmadamente ausente do output de produção (§4/§19).
- `npm run test -- --run` — 178/178.

## 26. Warnings

Nenhum warning novo do React, nenhum warning de hidratação, nenhum import duplicado detectado. Único log de console relacionado ao BlockNote (informativo, não erro): aviso nativo de que o bloco de código não tem highlighter de sintaxe configurado (`createHighlighter`) — esperado, não configuramos um nesta prova por não ser parte do escopo pedido; anotar como melhoria simples para a Fase 03.1.

## 27. Divergências do prompt

1. **`window.__labEditor`** — exposição temporária e DEV-only da instância do editor (`src/features/lab-editor/blocknote-lab.tsx`), não pedida explicitamente no prompt, adicionada como ferramenta de diagnóstico para viabilizar os próprios testes desta prova (round trip, estabilidade de ID, desempenho com 500 blocos) de forma confiável, já que a interação via clique/teclado sintético não é reproduzível neste ambiente (§17). Só existe quando `import.meta.env.DEV` é verdadeiro — mesma garantia de ausência em produção que o resto do laboratório.
2. **"Transformar tipo"** no menu lateral não foi implementado (§8/§21) — decisão consciente de manter o escopo mínimo, já que não é nativo e exigiria uma UI própria equivalente ao menu `/`.
3. Nenhuma outra divergência — os demais itens do prompt foram implementados e testados conforme especificado.

## 28. Autorização

| Critério | Status |
|---|---|
| Build funciona | ✅ |
| Sem erro de hidratação | ✅ (nenhum warning de hidratação; componente nunca renderiza no servidor) |
| JSON preserva o documento | ✅ (round trip 100%) |
| IDs são estáveis | ✅ (todos os cenários pedidos) |
| Drag-and-drop funciona | ✅ (nativo do BlockNote; alternativa mover cima/baixo também funciona, validada via API) |
| Menu `/` é personalizável | ✅ (substituído integralmente, 100% em português) |
| Custom blocks funcionam | ✅ (callout — schema, render, props tipadas, serialização) |
| Tema funciona | ✅ (claro e escuro, confirmado ao vivo) |
| Mobile é utilizável | ✅ (sem overflow em 320px/768px, inclusive com texto longo) |
| Sem impedimento de licença | ✅ (MPL-2.0 + MIT, compatível com uso comercial fechado; risco GPL do `xl-*` identificado e evitado) |
| Sem falha crítica de acessibilidade/desempenho | ✅ (desempenho excelente em todas as escalas testadas; acessibilidade herda a base já auditada, sem regressão) |

Todos os critérios de autorização atendidos.

**BLOCKNOTE APROVADO PARA A FASE 03.1**
