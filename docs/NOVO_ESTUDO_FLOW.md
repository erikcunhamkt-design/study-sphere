# NOVO ESTUDO — CRIAÇÃO UNIFICADA

> "Comece em segundos. Organize quando precisar."

## Princípio

Criar um estudo não pode exigir que o usuário entenda a arquitetura interna
(área → curso → módulo → aula → documento). Ele escreve o que quer estudar e começa.

## Tela única — `/app/novo-estudo`

Campos visíveis:

1. **Nome do estudo** (único obrigatório)
2. **Este estudo tem módulos?** Não / Sim
3. **Conteúdo** (texto livre) — ou, se "Sim", módulos e aulas na mesma tela

Não existe wizard, não existe etapa intermediária, não existe seleção de área.

## Persistência

Nada é gravado enquanto o usuário digita. Ao clicar em **Criar e começar**,
`createQuickStudy()` (`src/features/quick-study/api.ts`) monta a hierarquia completa
em sequência, com rollback do curso caso qualquer passo falhe:

| Camada    | Origem                                                       |
| --------- | ------------------------------------------------------------ |
| Área      | primeira área existente, ou "Meus estudos" criada automaticamente |
| Curso     | nome informado                                                 |
| Módulo    | informado, ou módulo interno "Conteúdo" quando não há módulos |
| Aula      | informada, ou aula com o nome do estudo                        |
| Documento | texto convertido em blocos BlockNote, salvo **e publicado**    |

`textToLessonDocument()` converte texto simples: linhas iniciadas por `#`, `##`, `###`
viram headings; as demais viram parágrafos.

O documento é publicado imediatamente (`publish_lesson_document`) — sem isso a Sessão
Aprender exibiria o estado "aula sem material publicado".

## Integração com a Sessão Aprender

Após a criação, o app navega direto para
`/app/estudar?method=aprender&courseId=<id>`, entrando na sessão da primeira aula.
Nenhuma tela de confirmação no meio.

## Estados de erro

- Nome vazio: CTA desabilitado + aviso.
- Falha na criação: toast de erro e o curso parcialmente criado é removido — o
  usuário permanece na tela com tudo que escreveu.
- Saída com conteúdo não salvo: diálogo "Sair sem salvar?" e `beforeunload`.

## Correção associada

`fetchLessonDocument` não selecionava `published_content` / `published_version` /
`published_at`, então o visualizador da sessão sempre concluía "sem material publicado".
As colunas foram adicionadas em `src/features/lesson-editor/api.ts`.

## Pontos de entrada

- Criação rápida do topbar → card **Estudo**
- Tela **Estudar** → botão "Novo estudo" no cabeçalho e no estado sem conteúdo
