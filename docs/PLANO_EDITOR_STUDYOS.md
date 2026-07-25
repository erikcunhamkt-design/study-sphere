# Plano do Editor — StudyOS

## Visão

Cada aula do StudyOS terá um caderno vertical, longo e contínuo, composto por blocos independentes e reordenáveis — o espaço real de estudo e anotação do aluno, hoje representado apenas pelo empty-state de preparo ("O editor de anotações em blocos será adicionado na próxima etapa.").

A experiência deve oferecer a fluidez de escrita do Notion (blocos, menu `/`, arrastar, formatação inline rápida) sem transformar o StudyOS em uma plataforma de produtividade genérica: nada de bancos de dados livres, kanban, automações ou blocos fora do contexto de estudo. Todo bloco existe para servir ao ato de estudar — registrar, organizar, revisar — não para replicar todas as capacidades de uma ferramenta de notas genérica.

A Fase 03.0 (prova técnica, ver `docs/AUDITORIA_FASE_03_0.md`) validou que o BlockNote (`@blocknote/core` + `@blocknote/react` + `@blocknote/shadcn`) é tecnicamente adequado como motor dessa experiência: schema customizável, blocos custom viáveis, JSON nativo estável e com round trip confiável, integração client-only limpa com o TanStack Start, tema adaptável ao design system atual, e licenciamento (MPL-2.0 + MIT) compatível com uso comercial fechado.

## Fase 03.1 — Editor real, sem IA

Escopo: o caderno de anotações passa a existir de verdade, substituindo o empty-state atual da aula.

- Texto (parágrafo);
- Títulos (H1/H2/H3);
- Listas (marcadores, numerada);
- Checklist;
- Bloco recolhível (toggle);
- Citação;
- Código;
- Divisor;
- Callout (info/atenção/sucesso — a versão experimental validada na Fase 03.0, ainda não os tipos acadêmicos definitivos);
- Drag-and-drop de blocos (com alternativa de mover para cima/baixo, sempre);
- Menu `/` em português, restrito ao conjunto acima;
- Formatação inline (negrito, itálico, sublinhado, tachado, código, link, cor de texto, destaque);
- Autosave real (ver desenho técnico em `docs/AUDITORIA_FASE_03_0.md` §23) com recuperação local e histórico básico de versões.

Fora do escopo desta fase (mesmo já sendo blocos "prontos" do BlockNote): imagem, arquivo, tabela, IA — entram só na 03.2/03.3 ou não entram, conforme abaixo.

## Fase 03.2 — Mídia e estrutura de documento

- Imagens;
- Arquivos;
- PDFs;
- Vídeos;
- Áudios;
- Links com preview (bookmarks);
- Tabela simples;
- Índice (sumário automático do documento);
- Colunas (duas e três).

## Fase 03.3 — Blocos acadêmicos

Os blocos de callout evoluem de "informação/atenção/sucesso" (genéricos, validados na prova) para o vocabulário real de estudo:

- Conceito;
- Definição;
- Exemplo;
- Dúvida;
- Atenção;
- Resumo;
- Fórmula;
- Linha do tempo;
- Pergunta de revisão;
- Referência;
- Aplicação prática;
- Causa e consequência;
- Erro comum.

Esses blocos são o que efetivamente conecta o editor ao resto do StudyOS: flashcards gerados a partir de um bloco de "Pergunta de revisão", buscas que priorizam blocos de "Definição", revisão espaçada ancorada em "Conceito". Depende da estabilidade de ID já validada na Fase 03.0 (§12 da auditoria).

## Fora do escopo inicial (StudyOS não é uma ferramenta de produtividade genérica)

- Bancos de dados livres (estilo Notion database);
- Kanban;
- Galerias;
- Feed;
- Mapas;
- Gráficos genéricos;
- Automações;
- Templates de terceiros;
- Blocos sincronizados entre documentos;
- Colaboração em tempo real;
- Layouts de cinco ou mais colunas;
- IA generativa dentro do editor.

Se algum desses itens for reconsiderado no futuro, deve vir de uma necessidade pedagógica concreta identificada no produto — não porque "o motor do editor suporta".
