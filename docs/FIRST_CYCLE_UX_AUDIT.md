# Auditoria de UX — Primeiro Ciclo (Primeira Experiência Guiada)

Escopo: validar se um usuário real conclui o primeiro ciclo sem orientação externa.
Nenhuma funcionalidade nova foi criada. FSRS, Memory State, Domain Model, Next Action
Engine e as telas Home / Estudar / Aprender / Revisar não foram alterados.

Método: leitura de código do fluxo de onboarding + execução real no navegador
(desktop 1280px e mobile 390px) com sessão autenticada, inspecionando DOM, console e rede.

## 1. Bug crítico encontrado (origem, não sintoma)

**Home em branco para usuário autenticado.**

- Sintoma: `main` vazio; nenhum bloco renderizado.
- Rede: `GET /rest/v1/cognitive_evidences?select=*,concept:concept_id(...)` → **400
  PGRST200** — "Could not find a relationship between 'cognitive_evidences' and
  'concept_id'".
- Origem real: a coluna `cognitive_evidences.concept_id` existia **sem chave
  estrangeira** para `concepts`. Sem FK o PostgREST não resolve o embed, o
  `usePerformanceDashboard` lançava erro e derrubava toda a Home (inclusive o
  onboarding).
- Correção na origem (migração): FK
  `cognitive_evidences_concept_id_fkey → concepts(id) ON DELETE CASCADE`,
  limpeza de linhas órfãs e índice em `concept_id`.
- Verificação pós-fix: Home renderiza; nenhuma resposta ≥400 na carga autenticada.

Nenhum filtro visual foi usado para esconder o estado errado.

## 2. Ajustes de UX aplicados (camada de onboarding apenas)

| # | Problema observado | Correção |
|---|---|---|
| 1 | O bloco de boas-vindas não dizia o que o Dominus é | Título: "Um sistema de aprendizagem e memória." + explicação em uma frase do ciclo (estudar → testar → revisar) |
| 2 | Duas ações primárias concorrentes na Home (bloco de boas-vindas + hero do Next Action) | O hero é ocultado enquanto o bloco de boas-vindas está visível (`useOnboardingHomeVisible`) — uma única ação primária, o "Pular" permanece como ação secundária discreta |
| 3 | Eventos de onboarding podiam ser gravados mais de uma vez (reload, nova tentativa, múltiplas autoavaliações) | `reach()` agora é idempotente: se o estado já passou daquele ponto, nada é gravado |
| 4 | Fechamento do ciclo com linguagem de progresso genérica | "Você acabou de criar sua primeira memória." + "Próxima recuperação **prevista**" |
| 5 | Duplo clique no CTA final podia disparar duas conclusões | Botão trava após o primeiro clique |
| 6 | Blocos sem semântica para leitores de tela | `<section aria-labelledby>` no bloco de boas-vindas e no fechamento; ícones decorativos com `aria-hidden` |

## 3. Checagens que passaram sem alteração

- Estado inicial: apenas uma pergunta respondida ("o que faço agora?"), sem tutorial,
  sem tour, sem modal bloqueante.
- Transição Aprender → Recuperação: existe CTA único "Testar memória" com explicação
  do porquê ("descobrir o que realmente ficou"), sem exigir decisão técnica do usuário.
- Sessão de recuperação: material não é exibido durante a tentativa; autoavaliação em
  linguagem comum.
- Fechamento: mostra a previsão real de próxima recuperação vinda do FSRS, sem
  gamificação, sem pontuação inventada.
- Usuários antigos (`onboarding_completed = true`) não veem nada do onboarding.
- Mobile 390px: bloco de boas-vindas, hero e barra inferior legíveis, CTA em largura
  total, sem overflow horizontal.
- Persistência: o estado vive no perfil (servidor), então reload/troca de dispositivo
  retoma no mesmo ponto; abandono não reinicia o ciclo.

## 4. Limitações desta auditoria

- A execução no navegador usou uma conta existente; os estados `new_user` →
  `first_cycle_completed` foram validados por leitura de código e pelo bloco de
  boas-vindas renderizado, não por um ciclo completo em conta virgem.
- Métricas de funil (tempo até o primeiro ciclo, taxa de abandono por etapa) existem
  como eventos em `onboarding_events`, mas não há painel de leitura — fora do escopo.
