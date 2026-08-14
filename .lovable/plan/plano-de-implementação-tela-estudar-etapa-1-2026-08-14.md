# Plano de Implementação — Tela Estudar (Etapa 1)

O objetivo é transformar a rota `/app/estudar` em um centro de execução estratégico, priorizando a **ação** em vez de uma simples listagem de catálogo. A interface seguirá o cockpit visual do DominusApp (preto/magenta/grafite).

## 1. Arquitetura de Dados e Lógica (Hooks)
- Criar o hook `useStudyState` (inspirado no `useDashboardState`) para centralizar a lógica de priorização:
  1. **Resume**: Sessão em andamento (via `useInProgressStudySessions`).
  2. **Recommendation**: Estudo planejado para hoje (via `usePlannedStudiesInRange`).
  3. **Continuar**: Cursos com status `in_progress`.
  4. **Start**: Cursos disponíveis (onboarding se vazio).

## 2. Componentes de UI (Execução)
- **StudyHero**: Área de destaque magenta/glow para a ação prioritária ("Próximo Passo" ou "Continuar").
- **ContinuingSection**: Lista horizontal compacta de cursos em andamento.
- **MyStudiesList**: Grid elegante de todos os estudos, mostrando progresso, domínio (placeholder real) e última atividade.
- **EmptyState**: Estado visual premium para usuários sem conteúdo ("Adicione seu primeiro conteúdo").

## 3. Fluxo de Navegação
- Integrar com o `AddContentDialog` da Home (via search params ou trigger compartilhado) para o estado vazio.
- Botão "Começar" direcionando para a escolha de método ou sessão ativa.

## Detalhes Técnicos
- Arquivo: `src/routes/app.estudar.tsx` (Refatoração total).
- Cores: `bg-surface/20`, `border-border/40`, magenta highlights.
- Sem dados fictícios: uso exclusivo de `study_sessions`, `courses`, `lessons` e `planned_studies`.

---

# TELA ESTUDAR — ETAPA 1 CONCLUÍDA
- [ ] Arquitetura criada
- [ ] Estado inicial/vazio
- [ ] Recomendação (Próximo Passo)
- [ ] Continuar estudando
- [ ] Estudos disponíveis
- [ ] Fluxo de início de sessão
- [ ] Componentes premium reutilizados
- [ ] Integração real com sessões
- [ ] Testes de roteamento e estados
