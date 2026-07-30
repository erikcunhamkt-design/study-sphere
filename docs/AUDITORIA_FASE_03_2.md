# Auditoria — Fase 03.2: Mídia e estrutura de documento

Data: 30/07/2026
Escopo: imagens, arquivos/PDFs, vídeos, áudios, bookmarks, tabela simples e índice no caderno da aula, com storage privado por usuário. Colunas **fora do escopo por decisão do operador** (ver §2).

---

## 1. Veredito

**APROVADO PARA A FASE 03.3**

---

## 2. Decisão de escopo: colunas adiadas (licença)

O plano mestre listava "até três colunas" nesta fase. O bloco multi-coluna oficial do BlockNote vive em `@blocknote/xl-multi-column`, licenciado sob **GPL-3.0** — a mesma família `xl-*` identificada e deliberadamente evitada na auditoria da Fase 03.0 por ser incompatível com uso comercial fechado. Construir colunas custom próprias era possível, mas é o item mais caro e arriscado da fase (drag-and-drop entre colunas, comportamento mobile, serialização própria). **O operador optou por adiar colunas** (decisão registrada em 30/07/2026); nenhum pacote `xl-*` foi instalado — confirmado por teste automatizado (`schema.test.ts` verifica que nenhum tipo de bloco casa com `/column/i`).

## 3. Migration aplicada

| Arquivo | SHA-256 | Conteúdo |
|---|---|---|
| `20260730100000_fase03_2_lesson_media_storage.sql` | `5632c43338140165e0e65c4e0afc28e2fb6aa6714f27737f91231a3d5847ef6c` | Bucket privado `lesson-media` (50 MB, allowlist de MIME sem SVG) + 4 policies em `storage.objects` escopadas por `(storage.foldername(name))[1] = auth.uid()::text` |

Verificação: sondas funcionais reais no preview (upload próprio ok, pasta alheia negada, SVG rejeitado pelo bucket, URL assinada emitida e baixada com 200).

## 4. Modelo de segurança da mídia

- **Bucket privado**: nenhum acesso público; exibição só via URL assinada (TTL 1h, cache renovado 5 min antes de expirar).
- **Fronteira de isolamento**: a primeira pasta do caminho é o `user_id`; as 4 policies (SELECT/INSERT/UPDATE/DELETE) exigem igualdade exata com `auth.uid()`. `anon` não recebe policy alguma.
- **Convenção de caminho**: `{user_id}/{lesson_id}/{uuid}-{nome-sanitizado}` — UUID por upload elimina colisão; sanitização remove acentos, espaços e barras (sem path traversal).
- **Dupla validação de tipo/tamanho**: cliente valida por categoria antes da rede (imagens 5 MB, arquivos 20 MB, vídeo/áudio 50 MB, com mensagens em português); o bucket é o teto duro (50 MB + allowlist). **SVG excluído deliberadamente** (vetor de XSS).
- **O documento nunca guarda a URL assinada** (que expira), só o caminho do objeto; `resolveFileUrl` resolve na exibição.
- **URLs perigosas**: `javascript:`/`data:`/`vbscript:`/`file:` são recusadas na validação Zod, no resolvedor de URL e na renderização do bookmark (três camadas independentes).

## 5. Implementação

`src/features/lesson-editor/`: `schema.ts` (schema próprio do caderno, substituindo o do laboratório), `slash-menu-items.tsx` (menu `/` em português com grupo Mídia), `media-upload.ts` (validação, upload, URL assinada com cache), `bookmark-block.tsx`, `toc-block.tsx`, `document-schema.ts` (Zod ampliado). Herança da 03.1 aplicada: **checkpoint manual antes do "Reiniciar caderno"**, fechando a observação §13.1 da auditoria anterior.

**Bookmark**: privado por padrão — nenhuma requisição a sites de terceiros a partir do caderno (sem busca de OG/preview). Só `http(s)`, revalidado na renderização (props persistidas fora da UI degradam para texto, nunca viram href perigoso).

**Índice**: derivado ao vivo dos títulos H1–H3 do próprio documento; nada além do tipo do bloco é persistido, então nunca dessincroniza do texto real.

## 6. Validação Zod (Fase 03.2)

Tipos novos aceitos: `image`, `video`, `audio`, `file`, `table`, `bookmark`, `tableOfContents`. Props de mídia exigem URL segura (caminho relativo do storage **ou** `http(s)` — qualquer outro esquema é recusado). `tableContent` validado estruturalmente (linhas, células nos dois formatos aceitos pelo BlockNote, larguras) e **restrito ao bloco de tabela** — conteúdo tabular em bloco não-tabela e vice-versa são rejeitados. Bookmark aceita só `http(s)`. Índice não aceita props desconhecidas.

## 7. QA funcional (conta QA A, preview real)

| Cenário | Resultado |
|---|---|
| Documento da 03.1 carrega no schema novo | ✅ conteúdo anterior intacto, sem tela de "documento inválido" |
| Persistência de todos os blocos novos + reload | ✅ imagem, tabela, bookmark e índice retornam do banco corretamente |
| Imagem exibida | ✅ `<img>` com URL assinada válida (`token=`), download `200 image/png` |
| Índice | ✅ lista o título do documento e navega ao clicar |
| Bookmark | ✅ cartão com título + host, `rel="noopener noreferrer"`, `target="_blank"` |
| Tabela | ✅ renderiza com o conteúdo correto |
| Upload E2E (via serviço real) | ✅ PNG real → caminho sanitizado → URL assinada → download 200 |
| SVG e arquivo acima do limite | ✅ recusados com `MediaValidationError` e mensagem em português |
| Esquema perigoso no resolvedor | ✅ `javascript:` resolve para string vazia (nunca chega ao DOM) |
| Console | ✅ zero erros |

## 8. QA B — isolamento de mídia

| Sonda | Resultado |
|---|---|
| Listar raiz do bucket | 0 itens |
| Listar pasta de outro usuário | 0 itens |
| Criar URL assinada para caminho de outro usuário | negado |
| Baixar objeto de outro usuário | negado |
| Gravar dentro da pasta de outro usuário | negado |
| Upload na própria pasta | ✅ funciona |

Transparência metodológica: como a QA B não consegue listar nada, o caminho "da QA A" nas sondas foi reconstruído com um UUID sintético. A policy compara a primeira pasta com `auth.uid()` por **igualdade exata**, então a negação não depende de o objeto existir — o teste prova a regra, não a existência do arquivo. A contraprova positiva (mesma operação funciona na própria pasta) foi executada.

## 9. Anônimo (sem sessão)

Criar URL assinada, baixar, gravar: **todos negados**. Listagem retorna vazio. Nenhum acesso ao bucket sem sessão.

## 10. Bundle e responsividade

- BlockNote continua em **um único chunk** (`lesson-editor-*.js`): **838 KB bruto / 246 KB gzip** (era 242 KB na 03.1 — **+4 KB**, porque os blocos de mídia já vinham no pacote; o custo real foi só o código próprio). Os outros **67 chunks não contêm BlockNote** — bundle inicial das demais rotas inalterado.
- **320 px**: página sem overflow horizontal (`scrollWidth == clientWidth`) mesmo com tabela no documento; a tabela rola dentro do próprio container, não estoura a página.

## 11. Comandos finais

- `npm run typecheck` — 0 erros.
- `npm run lint` — 0 erros; 20 warnings, todos `react-refresh/only-export-components` (18 pré-existentes + 2 novos da mesma classe benigna, nos arquivos de bloco custom que exportam o spec ao lado do componente).
- `npm run test` — **223/223** (19 arquivos; 18 testes novos: schema do editor, validação de mídia, tabela, bookmark, índice).
- `npm run build` — sucesso.

## 12. Limitações e observações registradas

1. **Mídia órfã não é coletada**: arquivo enviado e depois removido do documento permanece no bucket. Nenhuma perda de dado nem exposição (segue protegido por RLS), mas consome cota. Candidato a rotina de limpeza numa fase futura.
2. **URL assinada é um bearer token**: quem receber a URL acessa o arquivo até o TTL expirar (1h), mesmo sem sessão — comportamento padrão e esperado do Storage, relevante se algum dia existir compartilhamento de caderno.
3. **Inserção de mídia pela UI não foi clicada de ponta a ponta**: o botão "Add image" do BlockNote abre um seletor nativo de arquivo, que a automação de navegador não consegue acionar de forma confiável (mesma limitação documentada nas Fases 02.1/02.2/03.0/03.1). A cobertura foi feita pela camada que importa — o serviço de upload real com arquivo real, ponta a ponta, mais persistência e renderização verificadas no DOM. **Recomendo um teste manual de arrastar-e-soltar uma imagem no editor antes de considerar a UX de upload validada.**
4. **Textos nativos do BlockNote em inglês**: o placeholder do bloco vazio de mídia mostra "Add image" — o menu `/` está 100% em português, mas os componentes internos de upload não foram traduzidos. Candidato a ajuste de i18n na 03.3.
5. **Teste de integração do conflito (recomendação §13.4 da 03.1)**: não implementado — exigiria credenciais de serviço no CI, o que o protocolo de credenciais desta fase não permite. A validação segue sendo manual via console, documentada na auditoria da 03.1.
6. **Resíduos de QA no ambiente**: objetos de sonda em `{uid}/qa-probe/` (QA A) e `{uid}/qa-b/` (QA B), e blocos de teste no documento da aula "Aula do Caderno". Podem ser apagados a qualquer momento; ficam como base para re-execução.

## 13. Critérios da fase

| Item do plano | Status |
|---|---|
| Imagens | ✅ |
| Arquivos | ✅ |
| PDFs | ✅ (categoria "arquivo", até 20 MB) |
| Vídeos | ✅ |
| Áudios | ✅ |
| Links com preview (bookmarks) | ✅ com ressalva declarada: cartão com URL/título, **sem** busca externa de metadados (decisão de privacidade) |
| Tabela simples | ✅ |
| Índice | ✅ |
| Colunas (2 e 3) | ⏸️ adiado por decisão do operador (licença GPL do `xl-*`) |
| Isolamento QA B / anônimo | ✅ |
| Bundle não cresce nas outras rotas | ✅ (medido) |
| Typecheck, lint, build, testes | ✅ |

## 14. Commits da fase (locais, sem push)

`a03fec5` (migration do storage, checkpoint para aprovação) → `34887cf` (blocos de mídia, tabela, bookmark, índice, upload e Zod ampliado) → este documento.

**APROVADO PARA A FASE 03.3**
