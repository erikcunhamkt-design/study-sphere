# Plano de Implementação: Sessão Real de Aprendizagem (Primeiro Contato)

Implementar o fluxo real de "Aprender Primeiro" no DominusApp, garantindo que o clique em "Começar" na recomendação inicie uma sessão vinculada ao conteúdo e proporcione uma experiência de foco absoluto.

## Alterações

### 1. Refinamento da Tela "Estudar" (`src/routes/app.estudar.tsx`)
- Implementar a lógica de criação de sessão automática ao clicar em "Começar" na recomendação.
- Ocultar o texto "Escolher outro conteúdo" quando houver apenas um estudo no catálogo.
- Garantir que a sidebar e o header sejam removidos/ocultos durante uma sessão ativa para maximizar o foco.
- Integrar `plannedId` corretamente na criação da sessão quando originada de um planejamento.

### 2. Aprimoramento da Experiência de Sessão (`src/features/study-sessions/livre-session.tsx`)
- Adaptar o componente para o modo `aprender`:
  - Interface dedicada com foco no conteúdo.
  - Área de anotações "Compreensão do Material".
  - Dicas pedagógicas contextuais para primeiro contato.
  - Salvar progresso real no banco (via `details`).
- Implementar a tela de conclusão estratégica:
  - Feedback visual de "Primeiro contato concluído".
  - CTA "Testar memória" direcionando para a próxima fase (flashcards/recuperação).

### 3. Integração de Dados e Progresso
- Garantir que a sessão criada seja do tipo `aprender` (não `livre`).
- Vincular a sessão ao `lesson_id` ou `course_id` selecionado.
- Atualizar o estado do curso para `in_progress` no banco após o início.
- Persistir o estado da sessão (pausada/em andamento) ao sair sem concluir, permitindo retomada pela Home ou Estudar.

## Detalhes Técnicos
- Utilizar `useCreateStudySession` para persistência.
- O modo `aprender` usará o `method: "aprender"` já definido no enum `StudyMethod`.
- A estrutura da sessão seguirá o layout de foco solicitado: Barra superior (Voltar, Título, Progresso) + Conteúdo central + Footer de ação.
- O progresso será refletido na Home através do hook `useDashboardState`.
