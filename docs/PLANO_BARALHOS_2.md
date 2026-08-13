---
name: Baralhos Fatia 1.2 — Estudar o baralho + conectar aula↔avulso
description: Plano para integração de flashcards de aula em baralhos e implementação de sessões de estudo (revisão e treino) para baralhos específicos.
type: feature
---

# Plano: Baralhos Fatia 1.2 — Estudar o baralho + conectar aula↔avulso

## 1. Visão Geral
Este plano resolve a fragmentação entre os flashcards criados em aulas e os flashcards "avulsos" da Biblioteca, permitindo que qualquer cartão seja adicionado a um baralho. Além disso, introduz a funcionalidade principal dos baralhos: a capacidade de estudá-los em dois modos (Revisão e Treino).

## 2. Mudanças de API e Banco de Dados
Nenhuma migration é necessária (a coluna `deck_id` já existe).

### Novas Funções em `src/features/flashcards/api.ts`
- `fetchFlashcardsByDeck(userId, deckId)`: Retorna todos os cartões (ativos) de um baralho específico.
- `fetchDueFlashcardsByDeck(userId, deckId)`: Retorna apenas os cartões devidos (agendados pelo SM-2) de um baralho específico.

### Novos Hooks em `src/features/flashcards/hooks.ts`
- `useFlashcardsByDeck(deckId)`
- `useDueFlashcardsByDeck(deckId)`

## 3. Implementação Técnica

### A. Adição de Cartões de Qualquer Origem
No diálogo de adição de cartões (`src/routes/app.biblioteca.baralho.$deckId.tsx`):
- Remover qualquer filtro que limite a `lesson_id === null`.
- Listar todos os cartões do usuário (`useFlashcards`) que ainda não pertencem ao baralho atual.
- **Identificação de Origem**: Cruzar `lesson_id` com a lista de aulas/cursos para exibir uma etiqueta:
  - Se `lesson_id` for null: Badge "Avulso".
  - Se `lesson_id` presente: Badge "Aula: [Nome da Aula]". (Para performance, buscar os nomes das aulas via `useLessons` ou similar e mapear em memória).

### B. Modos de Estudo do Baralho
Integrar com `/app/estudar` e `RecordacaoAtivaHub` para evitar duplicidade de lógica de runner.

#### Atualização na `ReviewSession`
- Adicionar prop `isTrainingMode?: boolean`.
- No `onGrade` e `onFinish`, se `isTrainingMode` for true, **ignorar** a chamada para `submitFlashcardReview` (RPC do SM-2). Isso permite "estudar tudo" sem bagunçar o agendamento real.

#### Atualização no `RecordacaoAtivaHub`
- Aceitar `deckId` e `mode` ("review" | "train") via props ou search params.
- Se `deckId` presente:
  - Modo "review": Usar `useDueFlashcardsByDeck(deckId)` como fonte da fila.
  - Modo "train": Usar `useFlashcardsByDeck(deckId)` como fonte da fila e passar `isTrainingMode={true}` para a `ReviewSession`.

### C. Interface (UX)
Na página do baralho (`/app/biblioteca/baralho/$deckId`):
- Adicionar grupo de botões de ação:
  1. **Botão Primário "Revisar Agora"**: Inicia o modo Revisão (só devidos). Desabilitado se 0 devidos.
  2. **Botão Secundário "Modo Treino"**: Inicia o modo Treino (todos os cartões).
- Navegação: Ao clicar, redirecionar para `/app/estudar?method=recordacao_ativa&deckId=...&mode=...`.

## 4. Fatiamento Proposto

### Fatia 1.2a: Conexão e Contagem
- API/Hooks para busca por baralho.
- Atualização do Dialog de Adição com etiquetas de origem.
- Correção do `DeckItem` para mostrar a contagem real de cartões (usando os novos hooks ou agregados).

### Fatia 1.2b: Estudo e Modo Treino
- Flag `isTrainingMode` na `ReviewSession`.
- Integração do `RecordacaoAtivaHub` com baralhos.
- Botões de início de estudo na tela do baralho.

## 5. Riscos e Mitigações
- **Performance no Dialog**: Listar "todos" os cartões pode ser pesado para usuários com milhares de itens. **Mitigação**: Garantir que a busca textual e a virtualização (se necessária) funcionem bem; limitar o fetch inicial se houver latência.
- **Integridade do SM-2**: Erro humano de gravar progresso em modo treino. **Mitigação**: Teste unitário rigoroso na `ReviewSession` garantindo que o `isTrainingMode` bloqueia chamadas de API de progresso.
