# Plano: Baralhos Fatia 1.2 — Estudar o baralho + conectar aula↔avulso

Este plano detalha a integração de flashcards de aula em baralhos e a implementação de sessões de estudo (revisão e treino) para baralhos específicos, resolvendo a fragmentação do sistema.

## ⚠️ SÓ PLANO — NÃO IMPLEMENTAR AINDA

## Problemas a Resolver
1.  **Fragmentação**: Flashcards de aula não são visíveis ou reutilizáveis em baralhos.
2.  **Inutilidade dos Baralhos**: Atualmente não é possível "estudar um baralho" específico; apenas a revisão geral global está disponível.
3.  **Modo de Treino**: Necessidade de estudar cartões sem afetar o agendamento SM-2 (para revisões extras antes de provas).

## Detalhes Técnicos

### 1. API e Hooks (src/features/flashcards/)
-   **`api.ts`**:
    -   `fetchFlashcardsByDeck(userId, deckId)`: Retorna todos os flashcards de um baralho.
    -   `fetchDueFlashcardsByDeck(userId, deckId)`: Retorna apenas os cartões devidos de um baralho.
-   **`hooks.ts`**:
    -   `useFlashcardsByDeck(deckId)` e `useDueFlashcardsByDeck(deckId)`.
    -   Invalidar queries de decks quando cartões são movidos.

### 2. Conexão Aula ↔ Baralho
-   **Diálogo de Adição**: No `DeckDetailPage`, listar TODOS os cartões (usando `useFlashcards` que já traz tudo).
-   **Etiquetas de Origem**: Exibir Badge "Avulso" ou "Aula: [Nome]" ao lado de cada cartão no diálogo. Buscar nomes de aulas via `useLessons` (cacheado) para evitar N+1 queries.
-   **Filtros**: Garantir que a aba "Flashcards" da Biblioteca continue mostrando apenas avulsos (`lesson_id is null`), mas que a tela do Baralho seja o "ponto de encontro" que ignora essa distinção.

### 3. Fluxo de Estudo (Praticar vs. Gerenciar)
-   **Integração com `/app/estudar`**: Adicionar suporte a `deckId` e `mode` ("review" | "training") nos search params da rota de estudo.
-   **ReviewSession**:
    -   Nova prop `isTrainingMode: boolean`.
    -   Se `true`, o componente exibe as notas (1-4) para feedback visual, mas **NÃO** chama `submitFlashcardReview`.
-   **Interface do Baralho**:
    -   Botão **"Revisar Devidos"**: Inicia estudo real (SM-2).
    -   Botão **"Estudar Tudo (Treino)"**: Inicia modo treino (sem agendamento).

## Fatiamento Proposto
-   **Fatia 1.2a**: API/Hooks + Diálogo "Adicionar de Qualquer Origem" + Contagem real no DeckItem.
-   **Fatia 1.2b**: Integração de estudo (ReviewSession + RecordacaoAtivaHub + Botões na tela do Baralho).

## Restrições
-   Sem novas tabelas ou colunas.
-   Preservar agendamento SM-2 (Modo Treino = Safe).
-   Reuso total do `RecordacaoAtivaHub` para manter consistência visual.
