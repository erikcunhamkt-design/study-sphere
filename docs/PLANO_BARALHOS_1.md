# Plano: Baralhos + Estudo em Massa (Fase 09 — Fatia 1)

## 1. Visão Geral
Introdução do conceito de **Baralhos (Decks)** como um agrupamento opcional e flexível para flashcards. O objetivo é permitir que o usuário organize cartões de diferentes aulas em uma mesma unidade temática e realize estudos em massa ("Cramming") ou revisões focadas.

### Princípio de Design: "Aula é Origem, Baralho é Organização"
Um flashcard sempre pertence a uma aula (`lesson_id`). O baralho (`deck_id`) é uma camada de organização adicional e opcional.

---

## 2. Schema de Banco de Dados (Proposta)

### Tabela `public.decks`
| Coluna | Tipo | Restrições |
| :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK `public.profiles(id)` ON DELETE CASCADE, NOT NULL |
| `name` | `text` | NOT NULL, CHECK (length(name) > 0 AND length(name) <= 100) |
| `color` | `text` | NULL (ex: hex ou nome de cor para UI) |
| `is_archived` | `boolean` | default `false` |
| `position` | `integer` | default 0 (para ordenação manual futura) |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**RLS (4 Políticas):**
1. `SELECT`: `auth.uid() = user_id`
2. `INSERT`: `auth.uid() = user_id`
3. `UPDATE`: `auth.uid() = user_id`
4. `DELETE`: `auth.uid() = user_id`

**Grants:** `authenticated` (select, insert, update, delete), `service_role` (all).
**Trigger:** `set_updated_at` na tabela `decks`.
**Índices:** `user_id`, `(user_id, is_archived)`.

### Alteração em `public.flashcards`
Adicionar coluna:
- `deck_id`: `uuid`, NULL, FK `(deck_id, user_id)` REFERENCES `public.decks(id, user_id)` ON DELETE SET NULL.
- **Índice:** `(user_id, deck_id)`.

---

## 3. Arquitetura de Software e Reuso

### Gestão (Biblioteca)
- **Onde:** Nova aba "Baralhos" em `/app/biblioteca`.
- **Ações:** Criar baralho, editar nome/cor, arquivar.
- **Atribuição:** 
  - `FlashcardFormDialog` ganha um `DeckSelector` (filtrando baralhos do usuário).
  - Futura expansão: Seleção em massa na lista de flashcards para "Mover para Baralho".

### Prática (Estudar)
- **Onde:** Os baralhos aparecem em `/app/estudar` como unidades de estudo.
- **Fluxo:** Ao clicar em um baralho, o usuário escolhe:
  1. **Revisar devidos**: `queue = fetchDueFlashcardsByDeck(deckId)`.
  2. **Estudar tudo (Modo Treino)**: `queue = fetchAllFlashcardsByDeck(deckId)`.

---

## 4. Decisão Crítica: "Estudar Tudo" vs SM-2

**Decisão: Modo Treino (i)**
O modo "Estudar tudo" não afetará o agendamento SM-2.
- **Justificativa:** Estudar cartões que não estão devidos é uma forma de "cramming" que, se registrada no SM-2, distorce a curva de esquecimento calculada, podendo adiar revisões necessárias ou sobrecarregar o usuário prematuramente.
- **Implementação:** `ReviewSession` receberá uma prop `isTrainingMode: boolean`. Se `true`, ao final da sessão ou de cada cartão, a chamada à RPC `submit_flashcard_review` **não** será realizada. O progresso será apenas visual.

---

## 5. API e Hooks

Novas funções em `src/features/flashcards/api.ts`:
- `fetchDecks()`: Lista baralhos ativos.
- `fetchFlashcardsByDeck(deckId)`: Todos os cartões de um baralho.
- `fetchDueFlashcardsByDeck(deckId)`: Cartões devidos de um baralho.

Novos hooks em `src/features/flashcards/hooks.ts`:
- `useDecks()`
- `useCreateDeck()`, `useUpdateDeck()`, `useDeleteDeck()`

---

## 6. Fatiamento da Implementação

### Fatia 1.1: Fundação e CRUD de Baralhos
- Migration SQL (tabela `decks` + coluna em `flashcards`).
- Types, API e Hooks básicos.
- Aba "Baralhos" na Biblioteca com diálogo de criação/edição.
- Integração do seletor de baralho no `FlashcardFormDialog`.

### Fatia 1.2: Estudo em Massa e Modo Treino
- UI em `/app/estudar` para listar baralhos com contagem de "Devidos" vs "Total".
- Modal de escolha de modo (Revisar vs Estudar Tudo).
- Refatoração da `ReviewSession` para suportar `isTrainingMode`.
- Integração do Runner em `/app/estudar` para execução inline.

---

## 7. Conformidade e Segurança
- **RLS:** Garantir que o `deck_id` usado numa inserção/update de flashcard pertença ao mesmo `user_id`.
- **FK Composta:** Utilizar o padrão `(id, user_id)` para garantir isolamento de dados entre usuários.
- **Performance:** Índices específicos para busca de cartões por baralho.
