# Plano: Baralhos Fatia 1.1 — Complemento

Implementação da visão detalhada do baralho e gestão em massa de flashcards.

## Alterações

### 1. API e Hooks (Flashcards)
- **src/features/flashcards/api.ts**: Criar `setFlashcardsDeck(flashcardIds, deckId)` para atualização em lote via `.in('id', ids)`.
- **src/features/flashcards/hooks.ts**: Adicionar `useSetFlashcardsDeck` com invalidação de queries de flashcards e decks.
- **src/features/flashcards/schema.ts**: Atualizar `flashcardFormSchema` para incluir `deckId: z.string().uuid().nullable()`.

### 2. Roteamento
- **src/routes/app.biblioteca.baralho.$deckId.tsx**: Nova rota para visualização do baralho.
- **src/features/decks/deck-item.tsx**: Envolver o conteúdo em um `Link` para a nova rota, preservando botões de ação.

### 3. Interface da Rota do Baralho
- Cabeçalho com nome/cor do baralho e botão "Voltar".
- Botão "Adicionar Cartões" (abre diálogo).
- Lista de cartões vinculados (reuse de `FlashcardList` ou componente similar simplificado).
- Ação "Remover do Baralho" em cada item.

### 4. Diálogo "Adicionar Cartões"
- Lista cartões do usuário sem deck ou de outros decks (conforme requisito: mover, não copiar).
- Filtro de busca por texto.
- Seleção múltipla (Checkbox).
- Botão "Adicionar Selecionados".

### 5. Refinos
- **src/features/decks/deck-list.tsx**: Exibir contagem de cartões se possível (usando os dados da query de flashcards já em cache).

## Detalhes Técnicos
- Persistência: Coluna `deck_id` na tabela `flashcards`.
- RLS: Utilizar filtros por `user_id` em todas as operações.
- Estética: Manter padrão Premium (Magenta/Graphite).
