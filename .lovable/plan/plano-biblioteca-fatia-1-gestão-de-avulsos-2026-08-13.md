# Plano: Biblioteca - Fatia 1 (Gestão de avulsos)

Este plano detalha a implementação da gestão de flashcards e questões avulsos (sem vínculo com aulas) na rota `/app/biblioteca`.

## 1. Layout da Tela
A página da biblioteca será organizada em abas (Tabs) para separar as categorias de conteúdo:
- **Aba "Flashcards"**: Lista de flashcards avulsos.
- **Aba "Questões"**: Lista de questões avulsas.
- **Aba "Simulados"**: Lista de simulados (Exams) avulsos.
- Topbar da página com botões de criação rápida ("Novo Flashcard", "Nova Questão").

## 2. Filtro de "Avulsos"
Os itens serão filtrados para exibir apenas aqueles onde `lesson_id` é nulo:
- Utilizar os hooks `useFlashcards` e `useQuestions` existentes.
- Aplicar filtro no cliente para `item.lesson_id === null`.
- Isso garante reuso total da lógica de busca atual sem necessidade de novas APIs ou migrations.

## 3. Criar Avulso
Reuso total dos diálogos de formulário:
- `FlashcardFormDialog` e `QuestionFormDialog` serão instanciados com `lessonId={null}`.
- O botão de criação no topo da página abrirá o diálogo correspondente.
- A API do backend já suporta `lesson_id` nullable.

## 4. Editar/Arquivar
Reuso das listas de componentes:
- `FlashcardList`, `QuestionList` e `ExamList` serão renderizadas dentro das abas.
- As ações de editar (abrir dialog com prefill) e excluir já estão implementadas nestes componentes.

## 5. Reintegrar Atalhos no Topbar
Restaurar os links de criação rápida no menu global (`src/components/layout/topbar.tsx`):
- Link "Novo flashcard" apontando para `/app/biblioteca?create=flashcard`.
- Link "Nova questão" apontando para `/app/biblioteca?create=question`.
- Adicionar lógica na rota da Biblioteca para abrir o diálogo automaticamente se o parâmetro estiver presente.

## 6. Praticar daqui
- Confirmado: Flashcards avulsos já entram no fluxo de revisão SM-2 (Estudar -> Recordação Ativa) se estiverem devidos, pois a lógica de `due_date` é independente de aula.
- Questões avulsas podem ser resolvidas via Simulados criados na Biblioteca.

## 7. Menu e Navegação
- A rota `/app/biblioteca` já está registrada e visível no menu lateral. Nenhuma mudança estrutural.

## 8. Conformidade Técnica
- **Segurança**: RLS existente já protege os dados por `user_id`.
- **Banco de Dados**: Nenhuma migration necessária (colunas já são nullable).
- **Estética**: Segue o padrão Premium (Tabs do shadcn, fundo grafite, magenta para ações).

---

## Peças que serão Reutilizadas
- `src/features/flashcards/flashcard-list.tsx`
- `src/features/flashcards/flashcard-form-dialog.tsx`
- `src/features/questions/question-list.tsx`
- `src/features/questions/question-form-dialog.tsx`
- `src/features/questions/exam-list.tsx`
- Hooks: `useFlashcards`, `useQuestions`, `useExams`.

## Alterações Mínimas Necessárias
- Novo arquivo: `src/features/library/library-shell.tsx` (ou implementação direta na rota).
- Edição: `src/routes/app.biblioteca.tsx` (trocar placeholder pelo shell).
- Edição: `src/components/layout/topbar.tsx` (restaurar links).
