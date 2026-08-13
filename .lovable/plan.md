# Plano de Correção do Ciclo de Vida e Prioridade das Sessões

A aplicação está interpretando qualquer sessão em aberto como a ação principal da Home, incluindo sessões sem conteúdo que podem ter sido criadas acidentalmente. O objetivo é diferenciar sessões reais (com conteúdo), sessões livres intencionais e sessões órfãs, garantindo que a Home priorize apenas ações com propósito.

## Alterações Técnicas

### 1. Modelo de Dados e API
- Atualizar a interface `CreateStudySessionInput` e a função `createStudySession` para incluir `is_free_session`.
- Adicionar a coluna `is_free_session` na tabela `study_sessions` via migração SQL para identificar explicitamente sessões iniciadas via "Sessão Livre".

### 2. Fluxo de Criação de Sessões
- Atualizar `LivreSession`, `PomodoroSession`, `FeynmanSession`, `BlurtingSession` e `CornellSession`:
    - Definir `is_free_session: true` quando a sessão for iniciada sem um `lessonId` ou especificamente pelo modo livre.
    - Garantir que a sessão só seja persistida no banco após o clique de "Iniciar".

### 3. Lógica de Priorização na Home
- Refatorar o hook `useDashboardState`:
    - **P0**: Sessão com `lesson_id` (Conteúdo real).
    - **P1**: Sessão com `is_free_session: true` e `lesson_id` nulo (Sessão Livre intencional).
    - **P2**: Revisão prioritária (Flashcards).
    - **P3**: Próxima recomendação de estudo.
    - **Exclusão**: Sessões sem `lesson_id` e sem `is_free_session` (órfãs) serão ignoradas pelo dashboard e tratadas como candidatas a descarte.

### 4. Interface da Home (UI)
- Atualizar o Hero no `app.index.tsx`:
    - Exibir "Sessão Livre" apenas para sessões intencionais.
    - Adicionar botão "Encerrar sessão" (descarte) discreto para sessões livres na Home.
    - Melhorar o microcopy conforme solicitado.

### 5. Política de Abandono (Cleanup)
- Implementar lógica no `useDashboardState` ou em um efeito global para tratar sessões inativas (ex: sem atualização há mais de 4 horas) como abandonadas, removendo-as da prioridade da Home.

## Checklist de Testes
- [ ] Criar sessão com aula -> Home mostra "Retomar [Aula]".
- [ ] Criar "Sessão Livre" -> Home mostra "Sessão Livre" com opção de encerrar.
- [ ] Simular sessão órfã (nula/nula) -> Home pula para a próxima prioridade (Revisão ou Estudo).
- [ ] Encerrar sessão livre pela Home -> Home recalcula prioridade imediatamente.
- [ ] Verificar persistência após recarregar a página.
