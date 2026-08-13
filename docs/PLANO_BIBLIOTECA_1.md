---
name: Biblioteca - Fatia 1 (Gestão de avulsos)
description: Plano para gerenciar flashcards e questões sem vínculo com aulas na rota /app/biblioteca.
type: feature
---

# Plano: Biblioteca - Fatia 1 (Gestão de avulsos)

Este documento detalha o planejamento para transformar a rota `/app/biblioteca` no centro de gestão de conteúdos avulsos (não vinculados a nenhuma aula).

## 1. Layout da Tela
A página da biblioteca será organizada em abas (Tabs) para separar as categorias de conteúdo, mantendo uma interface limpa e focada em gestão.
- **Aba "Flashcards"**: Lista de flashcards avulsos.
- **Aba "Questões"**: Lista de questões avulsas.
- **Aba "Simulados"**: Lista de simulados (Exams) avulsos.

## 2. Filtro de "Avulsos"
Para listar apenas itens sem `lesson_id`, os hooks existentes serão adaptados ou filtrados no cliente:
- `useFlashcards` e `useQuestions` já buscam os dados.
- Implementar um filtro no `useQuery` (select) ou diretamente no componente para exibir apenas itens onde `lesson_id === null`.
- Idealmente, adicionar suporte a um parâmetro `lessonId: string | null | 'unlinked'` nas APIs de busca para otimizar futuras escalas.

## 3. Criar Avulso
Reuso total dos diálogos existentes:
- **Botões de Ação**: No topo de cada aba, haverá um botão "Novo [Item]".
- **Implementação**: `FlashcardFormDialog` e `QuestionFormDialog` serão chamados passando explicitamente `lessonId={null}`.
- **Comportamento**: A API já suporta `lesson_id` nulo, garantindo que o item seja criado corretamente como avulso.

## 4. Editar/Arquivar
As listas existentes (`FlashcardList`, `QuestionList`, `ExamList`) serão reutilizadas.
- Elas já oferecem ações de edição (que abrem o respectivo FormDialog) e exclusão/arquivamento.
- A consistência visual será mantida com o `lesson-editor`.

## 5. Reintegrar Atalhos no Topbar
Os links removidos na Fase 08 no menu "Criar rapidamente" do `topbar.tsx` devem retornar:
- **Destino**: Ambos devem apontar para `/app/biblioteca` (possivelmente com um search param `?tab=flashcards` ou `?tab=questions`).
- Isso restaura a agilidade na criação de conteúdo sem precisar navegar profundamente.

## 6. Praticar daqui
- **Flashcards**: O sistema de revisão SM-2 não depende de `lesson_id`. Flashcards avulsos com data de revisão devida aparecerão automaticamente no fluxo "Estudar -> Recordação Ativa".
- **Questões**: Podem ser praticadas diretamente da lista na Biblioteca ou via Simulados avulsos.

## 7. Menu e Navegação
- A rota `/app/biblioteca` já existe e está no menu lateral.
- Nenhuma alteração de navegação estrutural é necessária além da restauração dos atalhos no Topbar.

## 8. Conformidade Técnica
- **RLS**: As tabelas `flashcards` e `questions` já possuem RLS garantindo que o usuário veja apenas seus próprios dados.
- **Migration**: Nenhuma necessária.
- **Timezone**: Irrelevante para esta fase de CRUD simples.
- **Reuso**: ~90% do código será reutilização de componentes das pastas `features/flashcards` e `features/questions`.

---

# Resumo de Implementação (Próximos Passos)
1. Editar `src/routes/app.biblioteca.tsx` para implementar o layout de abas.
2. Injetar as listas (`FlashcardList`, etc.) com o filtro de `lesson_id === null`.
3. Restaurar os atalhos no `src/components/layout/topbar.tsx`.
