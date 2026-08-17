# DOMINUS V1 — PRODUCT COMPLEXITY AUDIT

> Diagnóstico apenas. Nenhuma rota, componente, CTA ou card foi removido ou refatorado nesta etapa.
> Data: 2026-08-17.

---

## 1. Visão geral

O núcleo cognitivo (FSRS v4, Domain Model, Next Action Engine) está consolidado. O excesso de complexidade percebida vem da **camada de apresentação**: a mesma decisão ("o que fazer agora") e o mesmo dado ("o que está devido") são reapresentados em várias telas com copies diferentes, e parte do vocabulário interno (FSRS, evidência, estabilidade, dificuldade) vaza para a interface.

Regra usada como referência de julgamento — cada tela responde **uma** pergunta:

| Tela | Pergunta única |
|---|---|
| Início (`/app`) | O que eu faço agora? |
| Estudar | Onde eu estudo agora? |
| Revisar | O que preciso recuperar? |
| Desempenho | Como está meu domínio? |
| Biblioteca | Onde está meu material? |
| Meus estudos | Como meu conteúdo está organizado? |
| Planejamento | Quando eu vou estudar? |

---

## 2. Arquitetura de navegação

Sidebar (`src/components/layout/navigation.tsx`), 5 grupos / 7 destinos:

```text
PRINCIPAL      Início            /app
APRENDER       Estudar           /app/estudar        (mobile)
               Revisar           /app/revisar        (mobile)
CONTEÚDO       Meus estudos      /app/meus-estudos   (mobile)
               Biblioteca        /app/biblioteca     (somente desktop)
ORGANIZAÇÃO    Planejamento      /app/planejamento
PROGRESSO      Desempenho        /app/desempenho     (mobile)
```

Topbar: breadcrumb + busca global (Dialog) + criação rápida.
Barra inferior mobile: Início, Estudar, Revisar, Meus estudos, Desempenho (Biblioteca e Planejamento inalcançáveis no mobile — ver §13).

---

## 3. Tabela de telas (rotas reais, lidas de `src/routes/`)

Total: **20 rotas** (5 públicas + 15 autenticadas, incluindo layout `app.tsx` e a rota de laboratório).

| # | Rota | Arquivo | Função | Público | Ação principal | Dados | Relação |
|---|---|---|---|---|---|---|---|
| 1 | `/` | `index.tsx` | Landing / marketing | Anônimo + logado | Cadastrar / Acessar meu espaço | estático + sessão | Espelha semântica do app |
| 2 | `/login` | `login.tsx` | Autenticar | Anônimo | Entrar | auth | — |
| 3 | `/cadastro` | `cadastro.tsx` | Criar conta | Anônimo | Cadastrar | auth | — |
| 4 | `/recuperar-senha` | `recuperar-senha.tsx` | Reset e-mail | Anônimo | Enviar link | auth | — |
| 5 | `/redefinir-senha` | `redefinir-senha.tsx` | Nova senha | Anônimo | Salvar | auth | — |
| 6 | `/app` (layout) | `app.tsx` | Shell autenticado | Logado | — | perfil/prefs | pai de 7-20 |
| 7 | `/app/` | `app.index.tsx` | Início / próxima ação | Logado | Next Action (hero) | Next Action Engine, sessões do dia, prefs | **duplica hero de Estudar** |
| 8 | `/app/estudar` | `app.estudar.tsx` | Selecionar e executar estudo | Logado | Next Action (hero) + catálogo | Next Action Engine, cursos | **duplica hero de Início** |
| 9 | `/app/revisar` | `app/revisar.tsx` | Recuperação devida | Logado | Começar revisão | fila FSRS, estado semântico | fonte canônica de "due" |
| 10 | `/app/desempenho` | `app.desempenho.tsx` | Domínio + memória | Logado | Ler diagnóstico | Domain Model, Memory Dashboard | gera **recomendação paralela** |
| 11 | `/app/biblioteca` | `app.biblioteca.tsx` | Materiais + baralhos (tabs) | Logado | Gerenciar acervo | materials, decks | overlap com Meus estudos |
| 12 | `/app/biblioteca/baralho/$deckId` | idem | Cartões do baralho | Logado | Adicionar/estudar cartões | flashcards | filha de 11 |
| 13 | `/app/meus-estudos` | `app.meus-estudos.index.tsx` | Áreas de estudo | Logado | Criar/abrir área | study_areas | raiz da hierarquia |
| 14 | `/app/meus-estudos/$areaId` | — | Cursos da área | Logado | Criar/abrir curso | courses | filha de 13 |
| 15 | `.../cursos/$courseId` | — | Módulos do curso | Logado | Criar/abrir módulo | modules | filha de 14 |
| 16 | `.../modulos/$moduleId` | — | Aulas do módulo | Logado | Criar/abrir aula | lessons | filha de 15 |
| 17 | `.../aulas/$lessonId` | — | Editor de aula | Logado | Editar conteúdo/flashcards/questões | lesson + versões | destino final |
| 18 | `/app/planejamento` | `app.planejamento.tsx` | Agenda de estudos | Logado | Agendar / iniciar planejado | planned_studies | concorre com Next Action |
| 19 | `/app/configuracoes` | `app.configuracoes.tsx` | Perfil, aparência, prefs | Logado | Salvar | profile, prefs | — |
| 20 | `/app/lab/editor` | `app.lab.editor.tsx` | Laboratório interno do editor | **Interno** | Testar editor | mock | **não é produto** — exposto na rota autenticada |

---

## 4. Tabela de componentes (blocos de produto, fora de `ui/`)

| Componente | Tela | Função | Observação |
|---|---|---|---|
| `NextStepAction` | Início | Hero de próxima ação | Duplicado em Estudar (hero inline) |
| `DayProgress` | Início | Minutos do dia + revisões | Mostra contagem de due |
| `MasteryCard` | Início | Resumo de domínio | Resumo do Desempenho |
| `OnboardingHome` | Início | Primeira experiência | Concorre com hero (já mitigado) |
| Hero inline | Estudar | Próxima ação | Cópia do `NextStepAction` |
| `StudyMethodsHub` | Estudar | Escolher método | "Ver todas" expande métodos |
| `recordacao-ativa-hub` | Estudar | Simulados/baralhos | 3º nível de escolha |
| Sessões: `livre`, `cornell`, `feynman`, `blurting`, `pomodoro`, `recuperacao`, `ReviewSession` | Estudar/Revisar | Execução | 7 shells de sessão com layouts próximos, mas copies e loaders distintos |
| `PerformanceDashboard` | Desempenho | Memória humana | Recomenda "Revisar agora" fora do Engine |
| `DomainMasteryMap` | Desempenho | Domínio por área | Expõe "Estabilidade média: X dias" |
| `ConceptDetailDialog` | Desempenho | Detalhe do conceito | Expõe "Evidências Acumuladas" |
| `deck-list` / `deck-item` / `material-list` / `material-item` | Biblioteca | Acervo | ok |
| `question-list` / `exam-list` / `exam-composer` / `exam-attempt-runner` / `attempt-history` / `practice-dialog` | Editor/Estudar | Questões | Subproduto inteiro pouco integrado ao Engine |
| `lesson-editor` + `history-panel` + `conflict-dialog` + `status-indicator` | Aula | Autoria | Complexidade legítima (área de gestão) |
| `planned-study-form-dialog` / `day-sheet` / `calendar` | Planejamento | Agenda | Ver §5 |
| `first-session-hints`, `first-recall-hint`, `first-cycle-complete` | Sessões | Onboarding | ok, efêmeros |

---

## 5. Redundâncias

### Achados já confirmados (preservados da etapa anterior)

**P1**
1. Início e Estudar duplicam o Next Action (mesma copy, mesmo CTA, mesmas variantes `resume/review/reinforce/test_memory/continue`).
2. Desempenho cria recomendação fora do Next Action Engine ("Revisar agora", "Testar memória").
3. `FSRS v4 Core` exposto na tela Revisar (`app/revisar.tsx:69`).
4. Linguagem técnica de backend exposta no Desempenho (estabilidade média, evidências acumuladas).

**P2**
5. Revisões devidas aparecem em quatro lugares.
6. Desempenho acumula diagnóstico + agenda + histórico.
7. `AddContentDialog` possui destinos redundantes.

**P3**
8. Loading inconsistente.
9. Excesso de all-caps pequenos (9-10px).
10. Sidebar com destinos pouco usados.

### Achados novos desta etapa

11. **Tríade Biblioteca / Meus estudos / Estudar** (P1 estrutural) — ver §5.1.
12. **`/app/lab/editor`** é rota de laboratório interno acessível pelo app autenticado (P2).
13. **Sete shells de sessão** com estruturas quase idênticas (cabeçalho + cronômetro + CTA "Testar memória"/"Concluir") e implementações separadas (P2).
14. **Landing expõe vocabulário interno** ("motor FSRS v4", "evidência imutável") — aceitável como marketing técnico, mas cria expectativa de que esses termos apareçam no app (P3).
15. **Subproduto de questões/simulados** (`exams`, `attempts`, `practice-dialog`) vive fora do Next Action Engine e não influencia nenhuma recomendação (P2).

### 5.1 Biblioteca vs Meus estudos vs Estudar

| Tela | Responsabilidade proposta | Situação atual |
|---|---|---|
| **Biblioteca** | Armazenamento/gerenciamento de avulsos: materiais (PDF, livro, link, texto) e baralhos | Cumpre. Mas recebe CTAs de *estudo* ("Começar estudo", "Continuar estudando" apontam para `/app/biblioteca?tab=materials`) — isto é, é usada como porta de execução |
| **Estudar** | Seleção + execução do estudo | Cumpre, mas também lista catálogo de cursos (função de Meus estudos) |
| **Meus estudos** | Hierarquia área → curso → módulo → aula (autoria/organização) | **Única função exclusiva: autoria da hierarquia e acesso ao editor.** Navegação e escolha de conteúdo já são possíveis por Estudar |

Conclusão: Meus estudos **tem justificativa** (é o único caminho de autoria/edição), mas **como destino de topo na sidebar é redundante** com Estudar (consumo) e Biblioteca (acervo). Candidato a consolidação sob "Conteúdo/Biblioteca" como aba, mantendo as rotas. **Nada removido nesta etapa.**

Problema adicional confirmado: três CTAs de estudo em telas distintas (Revisar, Desempenho) levam a `/app/biblioteca?tab=materials`, que **não é uma tela de estudo** — desvio semântico P1.

### 5.2 Planejamento

- **Problema que resolve:** intenção futura ("quando vou estudar"), com calendário mensal, painel do dia e vínculo sessão↔planejamento.
- **Quem precisa:** usuário com rotina fixa (concurseiro/vestibulando). Usuário casual não usa.
- **Dados exibidos:** planned_studies do mês, resumo "concluídos/total · minutos".
- **Conflito com Next Action:** sim, parcial — o Engine responde "o que agora" pelo estado cognitivo, enquanto o planejamento responde por agenda declarada. Não há arbitragem explícita entre os dois; um estudo planejado para hoje não aparece no hero da Home.
- **Sobreposição:** o "iniciar planejado" duplica o início de sessão de Estudar.
- Severidade: **P2** (não confunde a decisão principal hoje, mas cria uma segunda fonte de intenção). Manter, sem promoção na sidebar mobile.

---

## 6. CTAs (ocorrências reais)

| CTA | Telas | Destino | Duplicação |
|---|---|---|---|
| "Testar memória" | Revisar (estado sem avaliação), Desempenho, `first-recall-hint`, fim das sessões cornell/feynman/blurting/livre, `StudyMethodsHub` (displayName), `recuperacao-session` (título) | `/app/estudar` ou `/app/revisar` | **Alta** — mesmo rótulo, dois destinos diferentes |
| "Começar estudo" | Revisar (novo usuário), Desempenho (sem evidências), OnboardingHome | `/app/biblioteca?tab=materials` ou `/app/estudar` | **Alta** — destinos divergentes |
| "Continuar estudando" | Revisar (tudo em dia), Estudar (título de seção) | `/app/biblioteca?tab=materials` / lista de cursos | Média |
| "Revisar agora" | Desempenho | `/app/revisar` | Recomendação paralela |
| "Começar" / "Começar revisão" | OnboardingHome, StudyMethodsHub, Revisar | sessão | Baixa |
| "Adicionar conteúdo" | Início (AddContentDialog), Estudar, OnboardingHome | `AddContentDialog` ou rotas de acervo | Média |
| "Ver todos" / "Ver todas" | `dashboard-ui` (Início), StudyMethodsHub | lista completa | Baixa |
| "Começar gratuitamente" | Landing (hero, footer, header) | `/cadastro` | Média (3 no mesmo scroll) |

**CTAs simultâneos para o mesmo destino:** Início mostra hero "Testar memória" enquanto `DayProgress` mostra contagem de revisões clicável; Desempenho mostra "Testar memória" e "Revisar agora" na mesma tela — ambos vão para `/app/revisar`.

---

## 7. Next Action — recomendações paralelas

| Origem | Vem do Engine? | Classificação |
|---|---|---|
| `NextStepAction` (Início) | Sim (`useNextBestAction`) | Canônico |
| Hero de Estudar | Sim (`primary`) | Canônico, porém duplicado visualmente |
| `StudyMethodsHub` — "recomendado" | Parcial (heurística própria de método) | **Recomendação paralela — P1** |
| `PerformanceDashboard` — "Revisar agora" / "merece atenção" | Não | **Recomendação paralela — P1** |
| `DomainMasteryMap` — áreas com "dificuldades recentes" | Não (Domain Model direto) | Recomendação paralela — P2 |
| Revisar — CTAs de estado vazio ("Começar estudo", "Continuar estudando") | Não | **Recomendação paralela — P1** |
| Planejamento — "estudo de hoje" | Não | Recomendação paralela — P2 |
| `OnboardingHome` — "Pronto para começar" | Não (lifecycle) | Aceitável (escopo de onboarding) |

---

## 8. Revisões (due) — representações encontradas: **6**

| # | Local | Origem dos dados | Copy | CTA |
|---|---|---|---|---|
| 1 | Início — hero `review` | Engine (`dashboard.summary.dueReviews`) | "Recuperar conceitos devidos" | Ir para Revisar |
| 2 | Início — `DayProgress` | mesmo `dueReviews` | "revisões" (número) | implícito |
| 3 | Início — `MasteryCard` | `reviewSemantic` | estado semântico | — |
| 4 | Estudar — hero `review` | Engine | mesma copy do item 1 | Revisar |
| 5 | Revisar — fila | Memory Engine (fonte canônica) | "Começar revisão" | Sessão |
| 6 | Desempenho — "prontos para recuperação" | Memory Dashboard | contagem + "Revisar agora" | Revisar |

Quatro contagens distintas podem divergir por diferenças de filtro/timezone; nenhuma delas cita **qual** conteúdo será revisado.

---

## 9. Memória — vocabulário exposto

| Termo na UI | Local | Classificação |
|---|---|---|
| "FSRS v4 Core" | Revisar (rodapé do hero) | **Técnico demais — P1** |
| "motor FSRS v4" | Landing | Marketing (aceitável) |
| "Estabilidade média: X dias" | DomainMasteryMap | **Técnico demais — P1** |
| "Evidências Acumuladas" | ConceptDetailDialog | **Técnico demais — P2** |
| "Primeira evidência registrada" | first-cycle-complete | Limítrofe — P3 |
| "Dificuldade" (botão de autoavaliação) | ReviewSession / recuperacao-session | Usuário entende (é a percepção dele) |
| "Precisa de reforço", "Em consolidação", "Estável" | Desempenho, Início | Usuário entende |
| "Recuperação" | Revisar, Desempenho | Usuário entende |
| "Domínio" | Desempenho, MasteryCard | Usuário entende, mas duplicado em duas telas |

---

## 10. Empty states

| Tela | Condição | Texto | CTA | Classe |
|---|---|---|---|---|
| Revisar | novo usuário | "Sua memória ainda está começando" | Começar estudo → Biblioteca | **Neutro** (destino errado) |
| Revisar | sem recuperação | "Sua memória ainda não foi avaliada" | Testar memória → Estudar | **Bom** |
| Revisar | nada devido | "Tudo em dia" | Continuar estudando → Biblioteca | **Neutro** (destino errado) |
| Estudar | sem conteúdo | "Adicione seu primeiro conteúdo…" | Adicionar conteúdo | **Bom** |
| Estudar | all_clear | "Tudo em dia / Sua próxima ação" | contextual | Bom |
| Início | novo usuário | OnboardingHome | Começar / Adicionar conteúdo | **Bom** |
| Desempenho | sem evidências | "não possui evidências suficientes" | Começar estudo → Biblioteca | **Neutro** (jargão + destino) |
| Meus estudos | sem áreas | "Nenhuma área…" | Criar área | Bom |
| Área | sem cursos | "Crie um curso… para começar" | Criar curso | Bom |
| Curso | sem módulos | "Nenhum módulo neste curso" | Criar módulo | Bom |
| Módulo | sem aulas | "Nenhuma aula neste módulo" | Criar aula | Bom |
| Busca (qualquer nível) | filtro sem resultado | "Nenhum(a) … encontrado(a)" | — | **Ruim** (sem saída/limpar filtro) |
| Baralho | sem cartões | "Este baralho está vazio." | Adicionar | Neutro |
| Baralho — adicionar | sem cartões elegíveis | "Nenhum cartão disponível para adicionar." | — | **Ruim** |
| Estudar — hub | sem simulados | "Crie um em Estudos para praticar aqui." | — | **Ruim** (sem link) |
| Estudar — hub | sem baralhos | "Crie um na Biblioteca para estudar aqui." | — | **Ruim** (sem link) |
| Sessão aprender | aula sem material | orientação pedagógica | Ir ao editor | Bom |
| Planejamento | dia sem itens | painel vazio do dia | Agendar | Neutro |

Totais: **19 estados vazios** — 9 bons, 6 neutros, 4 ruins.

---

## 11. Error states

Padrões encontrados: `toast.error` (~30 ocorrências), estado de erro visual com refetch em Estudar, `conflict-dialog` no editor, mensagens de campo em formulários (zod), `error-page.ts` / `error-capture.ts` globais.

| Padrão | Exemplo | Usuário entende | Expõe tecnologia | Tem recuperação |
|---|---|---|---|---|
| Toast genérico | "Erro ao encerrar sessão" | Sim | Não | **Não** (sem retry) |
| Toast de mutation de CRUD | "Erro ao salvar…" | Sim | Não | Não |
| Erro do Engine/cursos (Estudar) | bloco com botão | Sim | Não | **Sim** |
| Conflito de edição (editor) | AlertDialog com escolha | Sim | Parcial ("versão publicada") | Sim |
| Erros de auth mapeados (`auth-errors.ts`) | mensagens pt-BR | Sim | Não | Sim |
| Falha de query silenciosa (Desempenho, Domain Model) | render vazio | **Não** | Não | Não |
| Erro global (`error-page`) | tela de erro | Parcial | Parcial (stack em dev) | Recarregar |

Principal lacuna: **falhas de leitura que degradam para estado vazio** — o usuário lê "não há dados" quando na verdade houve erro (P2).

---

## 12. Loading — sistemas coexistentes: **5**

1. **Skeleton** — Início, Meus estudos (todos os níveis), Configurações, Planejamento, Editor, hubs (20 arquivos).
2. **Spinner `Loader2` / `animate-spin`** — sessões, Revisar, Estudar, Desempenho, formulários (27 arquivos).
3. **Loading textual** — "Carregando…" em listas menores.
4. **Loading inline em botão** — formulários e mutations (spinner dentro do CTA).
5. **Loading de rota** — `src/components/route-loading.tsx` + `pendingComponent`.

Mesma tela pode combinar 3 padrões (ex.: Estudar = spinner de página + skeleton de cards + spinner em botão).

---

## 13. Mobile

| Tela | Primeira ação | Altura antes do CTA | Densidade | Scroll | Duplicações |
|---|---|---|---|---|---|
| Início | Hero Next Action | ~420-700px (com onboarding) | Alta (saudação 3xl + hero + 2 cards) | 2-3 telas | hero + DayProgress mostram due |
| Estudar | Hero Next Action | ~380px | Alta | 2-4 telas (catálogo longo) | hero igual ao da Home |
| Revisar | "Começar revisão" | ~300px | Média | 1 tela | rodapé "FSRS v4 Core" ocupa espaço sem valor |
| Desempenho | leitura (sem ação clara) | ~500px até o 1º dado | **Muito alta** | 3+ telas | 2 CTAs para `/app/revisar` |
| Biblioteca | tabs | ~250px | Média | 2 telas | **inacessível pela barra inferior** |
| Planejamento | calendário | ~300px | Alta (grade mensal apertada) | 2 telas | **inacessível pela barra inferior** |

Problemas mobile: (a) Biblioteca e Planejamento sem entrada na barra inferior; (b) Desempenho sem ação primária acima da dobra; (c) hero duplicado faz o usuário rolar duas telas para ver a mesma decisão; (d) grade do calendário densa em <380px.

---

## 14. Sidebar — item a item

| Item | Destino | Uso esperado | Função única | Alcançável por contexto | Duplica |
|---|---|---|---|---|---|
| Início | `/app` | Alto | Sim (decisão) | logo/brand | parcialmente Estudar |
| Estudar | `/app/estudar` | Alto | Sim (execução) | hero da Home | parcialmente Início |
| Revisar | `/app/revisar` | Alto | Sim (recuperação) | hero, Desempenho | — |
| Meus estudos | `/app/meus-estudos` | Médio | Autoria da hierarquia | Estudar → curso; AddContentDialog | Biblioteca/Estudar |
| Biblioteca | `/app/biblioteca` | Médio | Acervo avulso + baralhos | CTAs de Revisar/Desempenho | Meus estudos |
| Planejamento | `/app/planejamento` | Baixo | Agenda | nenhum | intenção vs Next Action |
| Desempenho | `/app/desempenho` | Médio | Diagnóstico | MasteryCard na Home | MasteryCard |
| (rodapé) Configurações/Perfil | `/app/configuracoes` | Baixo | Sim | avatar | — |
| (não listado) `/app/lab/editor` | rota interna | — | Não | URL direta | — |

---

## 15. Problemas P0

Nenhum P0 aberto. O P0 anterior (`/app/estudar` renderizando vazia) está corrigido e validado.

---

## 16. Problemas P1

1. Hero de Next Action duplicado entre Início e Estudar.
2. `StudyMethodsHub` recomenda método fora do Engine.
3. Desempenho gera recomendações próprias ("Revisar agora", "merece atenção").
4. "FSRS v4 Core" visível em Revisar.
5. "Estabilidade média: X dias" visível no mapa de domínio.
6. Rótulo "Testar memória" com dois destinos diferentes (`/app/estudar` e `/app/revisar`).
7. CTAs de estudo apontando para Biblioteca (tela de gestão, não de execução).
8. Tríade Biblioteca / Meus estudos / Estudar sem fronteira declarada.

## 17. Problemas P2

9. Seis representações de "revisões devidas" com contagens potencialmente divergentes.
10. Desempenho acumula três funções (diagnóstico, agenda de recuperação, histórico).
11. `AddContentDialog`: 4 dos 6 cards levam ao mesmo destino (`/app/biblioteca?tab=materials`).
12. Sete shells de sessão implementados separadamente.
13. Subproduto de questões/simulados desconectado do Engine.
14. `/app/lab/editor` acessível no app autenticado.
15. Falhas de leitura degradando para "estado vazio" silencioso.
16. Planejamento como segunda fonte de intenção, sem arbitragem com o Engine.
17. Empty states sem saída (busca sem resultado, baralho sem cartões elegíveis, hub sem baralhos/simulados).

## 18. Problemas P3

18. Cinco sistemas de loading coexistindo.
19. Excesso de all-caps 9-10px com tracking largo.
20. Biblioteca e Planejamento ausentes da navegação mobile.
21. Três "Começar gratuitamente" no mesmo scroll da landing.
22. "Evidência" / "evidências acumuladas" como vocabulário de interface.
23. Estados semânticos sem tooltip explicativo local (ver §19).
24. Calendário mensal denso em telas estreitas.

---

## 19. Estados semânticos — unicidade

| Label | Significado | Único? |
|---|---|---|
| Novo | conceito sem nenhuma recuperação | Sim |
| Em aprendizagem | recuperações iniciais, intervalo curto | Sim |
| Precisa de reforço | falha recente | Sim |
| Em consolidação | acertos consecutivos, intervalo crescendo | Sim |
| Estável | intervalo longo, sem falhas | Sim |
| Não avaliado (domínio) | área sem evidência | Sim |
| Em construção / Em desenvolvimento / Consistente / Forte (domínio) | níveis de domínio da área | Sim |
| Tudo em dia (fila) | nada devido agora | Sim, **mas** convive com "Estável" e "Consistente" na mesma tela sem hierarquia explicada |

Conclusão: os oito estados são distintos; o risco é de **coexistência** (memória + domínio + fila lado a lado), não de sinônimos.

---

## 20. Microcopy — separação

**Pode existir (código/documentação):** FSRS, scheduler, memory state, cognitive evidence, RPC, query, session, published version, concept ID, engine, pomodoro-engine.

**Não deveria aparecer na interface:** "FSRS v4 Core" (Revisar), "Estabilidade média" (Domain Map), "Evidências Acumuladas" (Concept Detail), "versão publicada" (editor — limítrofe, é jargão de autoria e pode ficar), "Vazio" como rótulo de bloco (livre-session).

**"Cockpit"** — não há mais ocorrência na interface (restrição respeitada).

---

## 21. Landing vs App

- **Identidade compartilhada:** mesma marca (`AppBrand`), mesma paleta grafite/magenta, mesma tipografia black/tracking-tight. ✔
- **Componentes compartilhados:** `Button`, `AppBrand`, tokens de tema. Header de marketing é próprio (`MarketingHeader`). ✔
- **Semântica de marca:** "Do estudo ao domínio", recuperação ativa, memória — coerente com o app. ✔
- **Mistura indevida:** a landing usa vocabulário técnico ("FSRS v4", "evidência imutável") que reaparece no app (Revisar/Desempenho). O termo é legítimo como prova social na landing; dentro do produto deve virar linguagem humana. P3.

---

## 22. Tabela consolidada

| Elemento | Tela | Função | Redundância | Severidade | Ação |
|---|---|---|---|---|---|
| Hero Next Action | Início + Estudar | Próxima ação | Alta | P1 | Consolidar (um dono) |
| Recomendação de método | Estudar (Hub) | Sugerir método | Alta | P1 | Consolidar no Engine |
| "Revisar agora" / "merece atenção" | Desempenho | Ação | Alta | P1 | Consolidar no Engine |
| "FSRS v4 Core" | Revisar | Selo | — | P1 | Remover da UI |
| "Estabilidade média" | Desempenho | Métrica | — | P1 | Traduzir |
| "Testar memória" | 8 locais | CTA | Alta | P1 | Unificar destino |
| CTAs → Biblioteca | Revisar, Desempenho | Estudo | Alta | P1 | Redirecionar a Estudar |
| Meus estudos (destino de topo) | Sidebar | Autoria | Alta | P1 | Consolidar em Conteúdo |
| Contagem de due | 6 locais | Informar | Alta | P2 | Fonte única |
| Desempenho (3 funções) | Desempenho | Diagnóstico | Média | P2 | Simplificar |
| AddContentDialog | Início | Criar | Média | P2 | Reduzir a 3 opções |
| Shells de sessão | Estudar | Execução | Média | P2 | Unificar layout |
| Questões/simulados | Editor/Estudar | Prática | Média | P2 | Integrar ou esconder |
| `/app/lab/editor` | Interno | Teste | — | P2 | Ocultar em produção |
| Erro → estado vazio | Desempenho, Domínio | Feedback | — | P2 | Distinguir erro de vazio |
| Planejamento | Sidebar | Agenda | Média | P2 | Manter, despriorizar |
| Empty states sem saída | 4 locais | Orientar | — | P2 | Adicionar CTA |
| Loading (5 padrões) | Todas | Feedback | Média | P3 | Refinar para 2 |
| All-caps 9-10px | Todas | Rótulos | Baixa | P3 | Refinar |
| Mobile sem Biblioteca/Planejamento | Barra inferior | Navegação | Baixa | P3 | Refinar (menu "mais") |
| "Começar gratuitamente" ×3 | Landing | Conversão | Baixa | P3 | Refinar |
| Tooltips de estado | Desempenho | Explicar | Baixa | P3 | Refinar |

---

## 23. Plano de poda (recomendado — não executado)

**Onda 1 — decisão única (P1)**
1. Eleger a Home como dona do hero de Next Action; em Estudar, reduzir a uma faixa compacta "continuar de onde parou" sem repetir copy.
2. Fazer `StudyMethodsHub` e `PerformanceDashboard` consumirem `useNextBestAction` em vez de heurísticas locais.
3. Remover o selo "FSRS v4 Core" e traduzir "Estabilidade média" para linguagem de retenção.
4. Unificar "Testar memória" → sempre `/app/revisar`; "Começar/Continuar estudando" → sempre `/app/estudar`.

**Onda 2 — fronteiras (P1/P2)**
5. Declarar: Estudar = execução, Biblioteca = acervo, Meus estudos = autoria; agrupar Biblioteca + Meus estudos sob um único destino "Conteúdo" com abas (rotas preservadas).
6. Fonte única de contagem de due exposta por um seletor do Engine.
7. Reduzir Desempenho ao diagnóstico; mover histórico para detalhe sob demanda.

**Onda 3 — refino (P2/P3)**
8. Reduzir AddContentDialog a Curso / Material / Baralho.
9. Unificar shell de sessão e padronizar loading em 2 padrões (skeleton para listas, spinner inline para ações).
10. Distinguir erro de vazio; adicionar saída aos 4 empty states ruins.
11. Ocultar `/app/lab/editor` fora de dev; adicionar entrada mobile para Biblioteca/Planejamento; revisar densidade de all-caps.

---

## 24. Critério de sucesso — respostas

- **Pode ser removido:** selo FSRS na UI, métricas técnicas do Domain Map, 3 cards redundantes do AddContentDialog, rota de laboratório em produção, CTAs duplicados de Desempenho.
- **Deve ser consolidado:** hero de Next Action, recomendações paralelas, contagem de due, Biblioteca + Meus estudos, shells de sessão, padrões de loading.
- **Deve permanecer:** FSRS/Domain Model/Next Action Engine (lógica), Revisar, hierarquia de autoria, editor, onboarding, Planejamento (despriorizado).
- **Responsabilidade por tela:** conforme a tabela da §1.
