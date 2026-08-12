# Plano Fase 08 — Arquitetura "Praticar vs. Gerenciar"

## 1. Visão Geral
Reorganização da Arquitetura de Informação (IA) do DominusApp para separar as intenções de **Praticar** (estudo ativo) e **Gerenciar** (curadoria de conteúdo). O objetivo é reduzir a carga cognitiva no menu principal e centralizar funcionalidades onde elas contextualmente pertencem.

## 2. Decisões Estratégicas

### 2.1 Flashcards e Questões Avulsos (\`lesson_id\` is NULL)
**Recomendação:** Manter uma tela de "Gestão Global" acessível através da **Biblioteca**.
- **Por que:** Embora a maioria do conteúdo deva viver dentro de aulas, a flexibilidade de criar itens avulsos (ex: um deck de revisão geral ou banco de questões soltas) é valiosa. 
- **Implementação:** A rota \`/app/biblioteca\` (fases futuras) será o hub para gerenciar o que não está "em estudo" ativo em um curso. Até lá, manteremos as rotas de gestão, mas removidas do menu principal.

### 2.2 Visibilidade da Revisão Devida
**Recomendação:** O Dashboard continua sendo o gatilho principal, mas o destino muda.
- **Novo Fluxo:** Dashboard (Card de Revisão) → \`/app/estudar\` (abre automaticamente o modal/seção de Recordação Ativa).
- **Consistência:** A sinalização de "X itens para revisar" deve ser integrada também ao menu lateral, possivelmente como um badge no item "Estudar".

### 2.3 Recordação Ativa Inline
**Recomendação:** Transformar o \`RecordacaoAtivaHub\` em um container que renderiza o \`ReviewSession\` e o \`QuestionRunner\` diretamente na rota \`/app/estudar\`.
- **Reuso:** Utilizar os componentes ya existentes, apenas alterando o local de montagem. O estado da sessão de estudo será mantido localmente na página de Estudar.

### 2.4 Gestão Dentro da Aula
**Recomendação:** Adicionar abas (Tabs) no \`lesson-editor\` para "Conteúdo", "Flashcards" e "Questões".
- **Integração:** Reusar o \`FlashcardFormDialog\` e \`QuestionFormDialog\`. A lista de itens será filtrada pelo \`lesson_id\` da aula atual.
- **Ponte de Aula:** O \`flashcard-bridge\` ya permite criar a partir do texto; a nova UI apenas dará visibilidade aos cartões ya criados.

### 2.5 Transição de Rotas
**Recomendação:** Depreciação gradual.
- As rotas \`/app/flashcards\` e \`/app/questoes\` serão removidas do menu lateral (\`navigation.tsx\`).
- Links internos (Dashboard, Notificações) serão atualizados para apontar para a nova experiência em \`/app/estudar\`.
- As páginas antigas podem permanecer como redirecionamentos ou ser deletadas após a validação do novo fluxo.

### 2.6 Menu Final (Sidebar)
1. **Início** (Dashboard)
2. **Estudos** (Cursos/Aulas/Gestão de Conteúdo)
3. **Estudar** (Prática: Métodos + Recordação Ativa Inline)
4. **Planejamento** (Agenda/Revisões futuras)
5. **Biblioteca** (Repositório global/Itens avulsos)
6. **Desempenho** (Estatísticas)
*Obs: "Flashcards" e "Questões" removidos do nível raiz.*

## 3. Mapa de Migração de Funcionalidades

| Funcionalidade Atual | Novo Local (UX) | Componente Base |
| :--- | :--- | :--- |
| Revisar Flashcards | \`Estudar\` > Recordação Ativa | \`ReviewSession\` |
| Praticar Questões | \`Estudar\` > Recordação Ativa | \`ExamAttemptRunner\` |
| Criar Flashcard na Aula | \`Estudos\` > Editor de Aula | \`FlashcardFormDialog\` |
| Gerenciar Questões da Aula| \`Estudos\` > Editor de Aula | \`QuestionFormDialog\` |
| Flashcards Avulsos | \`Biblioteca\` (Futuro) | \`FlashcardList\` |

## 4. Fatiamento da Implementação

### 08.1 — Prática Unificada (Inline)
- Atualizar \`RecordacaoAtivaHub\` em \`/app/estudar\`.
- Integrar \`ReviewSession\` e runners de questões para rodar sem navegação externa.
- Atualizar botões do Dashboard para o novo destino.

### 08.2 — Gestão Contextual (Na Aula)
- Implementar abas no editor de aulas.
- Mover listagem e CRUD de flashcards/questões para dentro das abas da aula.
- Validar persistência de \`lesson_id\`.

### 08.3 — Limpeza e Consolidação
- Remover itens redundantes do \`navigation.tsx\`.
- Deletar/Redirecionar rotas legadas.
- Ajustar breadcrumbs e títulos de página.

## 5. Declaração de Conformidade
- **Migrações:** Nenhuma necessária. O schema atual ya suporta \`lesson_id\` nulo e relações.
- **Perda de Dados:** Zero. Apenas a visualização é alterada.
- **Reuso:** Foco total em reaproveitar componentes Shadcn e hooks de API existentes.

---
*Plano elaborado para transição do DominusApp rumo a uma UX de elite.*
