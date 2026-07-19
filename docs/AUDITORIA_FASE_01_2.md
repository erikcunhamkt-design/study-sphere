# Auditoria — Fase 01.2: Homologação Final da Fundação

Data: 2026-07-19. Escopo: homologação final, sem funcionalidade nova.

## 1. Veredito final

**REPROVADO — CORREÇÕES NECESSÁRIAS**

As duas migrations desta rodada de hardening (a da Fase 01.1 e uma segunda,
de menor privilégio, criada e aplicada nesta mesma sessão a pedido do
operador) **foram aplicadas e verificadas no banco remoto** (§4) — esse
bloqueio está resolvido. O que ainda impede a
aprovação (ver §13 para a lista completa): os testes de login/logout/
recuperação de senha/persistência/RLS com contas de QA reais não foram
executados **por mim** nesta auditoria — o operador relatou ter testado
login/logout/persistência manualmente por conta própria, o que registro em
§6/§8 como relato do operador, não como verificação técnica desta
auditoria; e o isolamento de RLS entre duas contas (§9) segue sem qualquer
teste, mesmo por relato.

## 2. Commit da Fase 01.1

- **Hash:** `da08ebcea752cc7af9c03e452bff5874138e91e4`
- **Mensagem:** `chore: harden StudyOS foundation and auth routing`
- **Arquivos:** 42 arquivos alterados (2848 inserções, 594 remoções — 16
  arquivos novos, 26 modificados)
- **Push:** **não realizado.** `git status -sb` confirma `main...origin/main
  [ahead 1]` — o commit existe só localmente.
- **Estado da árvore após o commit:** limpo (`git status --short` vazio),
  zero arquivos não rastreados restantes.

## 3. Higienização de dados

- **E-mails reais removidos:** busca global por `legacyautoads`,
  `studyos1@`, `studyos2@` e por qualquer `@gmail.com`/`@example.com` no
  repositório encontrou só `docs/AUDITORIA_FASE_01_1.md` (2 ocorrências,
  redigidas para `[EMAIL_TESTE_A]`/`[EMAIL_TESTE_B]` e
  `[EMAIL_FICTICIO_SEM_CONTA]`) — confirmado que os endereços reais não
  aparecem em nenhum outro arquivo do repositório, incluindo os testes e
  fixtures novos desta fase.
  - Única exceção deixada de propósito:
    `src/routes/cadastro.schema.test.ts` usa `maria@example.com` como
    fixture de teste de formato de e-mail — não é PII (nome fictício,
    domínio reservado pela IANA especificamente para documentação/exemplos,
    nunca resolve para uma caixa real, nunca foi usado para cadastrar nada).
    Mantido por ser a convenção universal de teste, não um endereço de
    alguém.
- **Ausência de secrets no commit:** busca por `sb_secret_`,
  `SUPABASE_SERVICE_ROLE`, `service_role` e por padrão de JWT (`eyJhbGci`)
  em todos os arquivos rastreados — só encontrei referências ao *nome* da
  variável de ambiente (lida via `process.env`, em arquivo server-only) e a
  grants SQL para o papel `service_role`; nenhum valor de chave real em
  lugar nenhum.
- **`.env`:** confirmado que não foi alterado nem incluído neste commit
  (`git status --short -- .env` vazio antes de commitar). Achado à parte,
  não introduzido nesta sessão: `.env` já estava rastreado pelo git *antes*
  desta auditoria (não faz parte do meu commit) e contém só a chave
  pública/anon (`SUPABASE_PUBLISHABLE_KEY`) — nunca `service_role`. Ainda
  assim, `.gitignore` não o exclui; recomendo ao operador adicionar
  `.env`/`.env.*` ao `.gitignore` e considerar destrackear o arquivo, como
  item de hardening separado (não fiz isso sozinho por ser uma mudança de
  histórico/rastreamento que prefiro não decidir sem confirmação explícita).
- **Sessões/tokens/artefatos de navegador:** nenhum arquivo desse tipo foi
  criado ou commitado — toda a testagem via preview usou o Supabase real
  diretamente do navegador, sem persistir nada em disco.
- **Dados exportados do banco:** nenhum.

## 4. Migrations remotas

### 4a. `20260719000000_fase01_1_hardening_constraints.sql`

- **Arquivo:** `supabase/migrations/20260719000000_fase01_1_hardening_constraints.sql`.
- **Data de aplicação:** 2026-07-19, pelo operador, via SQL Editor do
  Lovable Cloud/Supabase (mecanismo oficial do ambiente — não tenho
  `service_role` nem CLI autenticado nesta máquina para aplicar eu mesmo).
- **Checagem prévia (antes de aplicar):** rodei com o operador as duas
  consultas somente-leitura contando violações em `user_preferences`
  (limites de `daily_study_goal_minutes`, `pomodoro_*`) e `profiles`
  (`timezone`/`full_name` em branco) contra os novos limites — resultado:
  **0 violações em ambas, 1 linha existente em cada tabela.** Seguro
  aplicar.
- **Resultado:** aplicada com sucesso, sem erro relatado.
- **Confirmações por leitura do arquivo (não destrutiva, incremental, não
  enfraquece RLS, não recria tabela, não remove coluna):** ver análise
  completa mantida abaixo, feita antes da aplicação.
- **Validações posteriores — confirmadas remotamente, com evidência
  real (consultas rodadas pelo operador no banco de produção, resultado
  colado nesta sessão):**
  - **Constraints numéricas:** todas as 8 `CHECK` presentes em
    `pg_constraint` com a definição exata esperada —
    `daily_study_goal_minutes` (`1..1440`), `pomodoro_focus_minutes`
    (`1..240`), `pomodoro_short_break_minutes` (`1..120`),
    `pomodoro_long_break_minutes` (`1..240`), `pomodoro_cycles`
    (`1..20`), mais `theme` e `week_starts_on` (inalterados, confirmados
    intactos) e as duas novas de `profiles`
    (`profiles_timezone_not_blank_check`,
    `profiles_full_name_not_blank_check`).
  - **Grants:** `authenticated` tem `REFERENCES, SELECT, TRIGGER,
    TRUNCATE, UPDATE` em `profiles` e `user_preferences` —
    confirmado que **`INSERT` e `DELETE` não aparecem mais**. (Os grants
    `REFERENCES`/`TRIGGER`/`TRUNCATE` são privilégio padrão do schema
    `public` de todo projeto Supabase novo, não algo desta migration;
    inofensivos porque a API REST usada pelo app nunca emite esses
    comandos — RLS continua sendo o controle real de acesso por linha.)
  - **Policies:** `profiles` e `user_preferences` têm só `SELECT` e
    `UPDATE` cada (`profiles_select_own`, `profiles_update_own`,
    `prefs_select_own`, `prefs_update_own`) — confirmado que
    `profiles_insert_own`/`prefs_insert_own` foram removidas e nenhuma
    política de `INSERT`/`DELETE` restou.
  - **`NOT NULL`, defaults, foreign keys, índices, triggers, funções,
    `REVOKE EXECUTE`:** não alterados por esta migration — permanecem como
    auditados por leitura de código em `AUDITORIA_FASE_01_1.md` §8; não
    foram reconfirmados remotamente nesta sessão porque a migration não os
    tocou (só teria sentido reconfirmar algo que mudou).
- **Diferença entre schema local e remoto:** nenhuma identificada — as
  três consultas de verificação batem exatamente com o que o arquivo de
  migration define.

### 4b. `20260719120000_fase01_2_least_privilege_grants.sql`

Criada nesta mesma sessão, depois de eu notar (ao verificar 4a acima) que
`authenticated` ainda tinha `REFERENCES`, `TRIGGER` e `TRUNCATE` em
`profiles`/`user_preferences` — grants padrão do schema `public` de todo
projeto Supabase novo, não algo introduzido pelas migrations anteriores,
mas redundantes: a API REST que o app usa nunca emite esses comandos, RLS
é quem de fato controla o acesso por linha. O operador pediu explicitamente
essa segunda rodada de hardening antes de considerar o checkpoint pronto
para commit.

- **Conteúdo:** só dois `REVOKE REFERENCES, TRIGGER, TRUNCATE ... FROM
  authenticated` (um por tabela). Nenhum DML, nenhum `CREATE`/`DROP
  TABLE`, nenhuma constraint ou trigger tocada, `service_role` não
  alterado, policies de RLS não alteradas — confirmado por leitura do
  arquivo antes de aplicar.
- **`MAINTAIN`:** não foi revogado porque a consulta de grants rodada
  depois de 4a já mostrava que `authenticated` não tinha esse privilégio
  em nenhuma das duas tabelas — nada a revogar. (Também evitei incluir a
  palavra-chave `MAINTAIN` sem necessidade: ela só existe a partir do
  Postgres 17, e usá-la sem checar arriscaria erro de sintaxe em uma
  versão mais antiga.)
- **Data de aplicação:** 2026-07-19, pelo operador, mesmo mecanismo (SQL
  Editor do Lovable Cloud/Supabase).
- **Observação registrada com transparência:** a primeira tentativa de
  aplicar retornou `ERROR: 42P01: relation "public.user_preferences" does
  not exist`, com a tabela de `profiles` alcançável normalmente. Uma
  segunda tentativa, com o mesmo SQL, sem nenhuma mudança, teve sucesso
  ("Query succeeded. No rows returned.") e a verificação subsequente veio
  exatamente como esperado — tratando isso como uma falha transitória de
  conexão/réplica do lado do provedor (não incomum em Postgres gerenciado
  durante propagação de DDL recente), não como um sinal de que a migration
  foi aplicada num banco diferente do que vínhamos verificando. Não
  escondo isso: registro aqui porque aconteceu, mesmo o resultado final
  batendo com o esperado.
- **Verificação pós-aplicação (evidência real, colada pelo operador):**
  - **Grants finais** — `SELECT` `information_schema.role_table_grants`
    para `authenticated` em `profiles`/`user_preferences`:

    | Antes de 4a | Depois de 4a / antes de 4b | Depois de 4b |
    |---|---|---|
    | `SELECT, INSERT, UPDATE, DELETE` + `REFERENCES, TRIGGER, TRUNCATE` (7) | `SELECT, UPDATE` + `REFERENCES, TRIGGER, TRUNCATE` (5) | **`SELECT, UPDATE`** (2) |

    Confirmado por consulta real: exatamente 4 linhas no total —
    `authenticated`/`profiles`/`SELECT`, `authenticated`/`profiles`/
    `UPDATE`, `authenticated`/`user_preferences`/`SELECT`,
    `authenticated`/`user_preferences`/`UPDATE`. Nenhuma linha de
    `INSERT`, `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES` ou `MAINTAIN`
    restante. `service_role` não foi consultado de novo porque esta
    migration explicitamente não o toca (`FROM authenticated`, não
    `FROM service_role`).
  - **Policies:** reconfirmadas depois de 4b, sem alteração — as mesmas 4
    de antes (`profiles_select_own`, `profiles_update_own`,
    `prefs_select_own`, `prefs_update_own`), nenhuma a mais nem a menos.

Com isso, `authenticated` tem hoje, nas duas tabelas, exatamente `SELECT` e
`UPDATE` — nada além do que o código do cliente realmente usa
(`src/hooks/use-preferences.tsx`, só `select`/`update`).

## 5. Contas de QA

- **Quantidade criada nesta fase: zero.** Não reutilizei os e-mails da
  Fase 01.1, não enviei nenhum e-mail novo para eles, não tentei confirmá-los.
- **Método:** nenhuma conta foi criada por mim nesta sessão — ao ser
  perguntado, o operador optou por não fornecer credenciais de QA e
  informou já ter testado os fluxos principais manualmente por conta
  própria.
- **Confirmação:** N/A (nenhuma conta minha para confirmar).
- **Estado final:** as duas contas não confirmadas da Fase 01.1 continuam
  existindo no Supabase Auth, não confirmadas, e devem ser **removidas
  manualmente pelo operador** no painel do Lovable Cloud (Auth → Users) —
  não tenho `service_role` para removê-las e não devo tentar confirmá-las.

## 6. Autenticação

| Cenário | Status | Evidência observada |
|---|---|---|
| Login correto | Relatado pelo operador (não verificado nesta auditoria) | operador informou ter testado manualmente; sem evidência técnica (rede/DOM/estado) coletada por mim |
| Login — senha incorreta | Relatado pelo operador | idem |
| Login — e-mail inexistente | Não relatado / não testado | — |
| Rota privada solicitada antes do login | **Testado nesta auditoria** | `/app` sem sessão → `window.location.href` confirmado como `http://localhost:8080/login?redirect=%2Fapp`, sem vazamento de conteúdo privado no DOM |
| Retorno à rota privada após login | Relatado pelo operador (mecanismo verificado por código/teste automatizado, não pelo fluxo ponta a ponta) | `src/lib/route-guards.test.ts` comprova que `requireAuth` gera o `search.redirect` correto; o fechamento do ciclo completo (login de fato acontecendo e navegando de volta) depende de sessão real |
| Atualização da página autenticada | Não testado | depende de sessão real |
| Sessão restaurada sem flash de conteúdo incorreto | Parcialmente coberto | mecanismo (`beforeLoad` bloqueando render até `ensureInitialized()` resolver, `pendingComponent`) auditado por código; não observado com uma sessão real restaurando após F5 |
| Logout — topbar | Relatado pelo operador | — |
| Logout — sidebar | Relatado pelo operador | — |
| Retorno para `/app` após logout | Não testado | — |
| Botão voltar do navegador após logout | Não testado | — |
| Atualização da página após logout | Não testado | — |

**Por que "relatado pelo operador" não conta como "testado" nesta
auditoria:** em todo o restante deste documento e do anterior
(`AUDITORIA_FASE_01_1.md`), só marquei algo como testado quando eu mesmo
consegui observar evidência técnica — resposta de rede, estado do DOM,
resultado de query, teste automatizado passando. Uma confirmação verbal do
operador é um sinal real e valioso, mas não é o mesmo tipo de prova, e
misturar os dois enfraqueceria o padrão que este processo de auditoria
vem seguindo. Por isso a tabela distingue as duas coisas explicitamente.

## 7. Recuperação de senha

**Fluxo completo não executado nesta sessão.** Só o primeiro passo
(solicitação, com e-mail fictício sem conta associada) foi verificado
tecnicamente, na Fase 01.1 — ver `AUDITORIA_FASE_01_1.md` §6. Abrir o link,
definir senha nova, logar com ela, confirmar que a antiga para de
funcionar, link inválido e link expirado continuam sem teste — dependem de
uma conta de QA confirmada e de acesso à caixa de entrada dela, que não foi
disponibilizado nesta sessão.

## 8. Persistência

| Preferência | Após reload | Após nova sessão | Após logout/login |
|---|---|---|---|
| Nome | Não testado | Não testado | Não testado |
| Fuso horário | Não testado | Não testado | Não testado |
| Tema | Não testado (autenticado) | Não testado | Não testado |
| Sidebar recolhida | Não testado | Não testado | Não testado |
| Meta diária | Não testado | Não testado | Não testado |
| Pomodoro (foco/pausas/ciclos) | Não testado | Não testado | Não testado |
| Usuário B recebe defaults, não herda de A | Não testado | — | — |

O operador relatou ter testado persistência manualmente, mas sem
especificar quais dos itens acima nem fornecer evidência que eu pudesse
verificar — mantenho a tabela como "não testado" por rigor, já que este é
exatamente o tipo de comprovação técnica (valor gravado, sobrevive a
reload/nova sessão, isolado por usuário) que a Fase 01.2 pede
explicitamente.

## 9. RLS

| Usuário | Tabela | Operação | Próprio registro | Registro do outro usuário | Resultado |
|---|---|---|---|---|---|
| A | `profiles` | SELECT | Não testado | Não testado | — |
| A | `profiles` | UPDATE | Não testado | Não testado | — |
| A | `user_preferences` | SELECT | Não testado | Não testado | — |
| A | `user_preferences` | UPDATE | Não testado | Não testado | — |
| B | `profiles` | SELECT | Não testado | Não testado | — |
| B | `profiles` | UPDATE | Não testado | Não testado | — |
| B | `user_preferences` | SELECT | Não testado | Não testado | — |
| B | `user_preferences` | UPDATE | Não testado | Não testado | — |
| anônimo | `profiles` | SELECT | — | — | Não testado (mas ver nota) |
| anônimo | `user_preferences` | SELECT | — | — | Não testado (mas ver nota) |

**Item mais crítico em aberto desta fase.** Sem duas contas confirmadas
não há como gerar dois JWTs de usuário distintos e comprovar tecnicamente
o isolamento — as políticas continuam auditadas só por leitura do SQL
(`AUDITORIA_FASE_01_1.md` §9), não por execução real.

Nota sobre acesso anônimo: indiretamente, ao tentar chamar
`handle_new_user` via RPC com a chave anônima na Fase 01.1, o PostgREST
recusou por falta de privilégio — isso não é o mesmo teste de SELECT em
`profiles`/`user_preferences`, mas é consistente com RLS/grants
funcionando para o papel `anon` nessa API. Não é suficiente para marcar
esta linha como testada.

## 10. Validações

- **Interface + Zod:** cobertas por 14 testes automatizados
  (`src/routes/app.configuracoes.schema.test.ts`, Fase 01.1) cravando os
  oito casos pedidos (zero, negativo, limite máximo, acima do máximo,
  vazio, decimal onde exige inteiro, texto, valor válido) — todos
  passando. A UI (`NumField`) tem `max` no HTML e mostra erro por campo
  antes de chamar `updatePrefs.mutateAsync`.
- **Banco remoto:** **não testado nesta sessão.** Confirmar que uma
  requisição direta (ex.: `PATCH` via REST com um JWT válido, mas
  contornando a UI) não consegue gravar um valor fora do `CHECK` exige (a)
  a migration já aplicada remotamente e (b) uma sessão autenticada real —
  nenhum dos dois está disponível agora. Fica pendente junto com §4 e §9.

## 11. Comandos finais

| Comando | Resultado | Erros | Warnings |
|---|---|---|---|
| `npm run typecheck` | OK | 0 | — |
| `npm run lint` | OK | 0 | 16 (ver §12) |
| `npm run build` | OK | 0 | 1 (`inlineDynamicImports` ignorado — configuração do preset Cloudflare do Nitro, não do nosso código; build gera os artefatos corretamente mesmo assim) |
| `npm run test` | OK | 0 | — (41/41 testes) |

## 12. Console e rede

- **Warnings de lint (16, todos `react-refresh/only-export-components`) —
  agrupados por causa comum e por que não representam risco:**
  - **Causa técnica exata:** o plugin de Fast Refresh do Vite só consegue
    trocar um módulo "a quente" (sem recarregar a página inteira) se esse
    módulo exportar *somente* componentes React. Assim que o arquivo
    também exporta uma constante, um hook ou uma função, o Fast Refresh
    perde a garantia de que pode substituir aquele módulo com segurança —
    então ele avisa, e na prática cai para reload completo da página
    quando você edita aquele arquivo em dev.
  - **Por que isso não é risco:** essa degradação é **exclusiva do
    servidor de desenvolvimento** (`vite dev`). O build de produção
    (`npm run build`, verificado acima) não usa Fast Refresh — ele apenas
    empacota os módulos normalmente, então o warning não tem nenhum efeito
    no artefato que vai para produção nem no comportamento em runtime.
    Confirmado nesta sessão: o build passa limpo com os mesmos 16
    warnings presentes.
  - **Arquivos afetados, por padrão de causa:**
    - Componentes shadcn/ui que exportam a variante de estilo (`cva`)
      junto com o componente — `badge.tsx` (`badgeVariants`),
      `button.tsx` (`buttonVariants`), `toggle.tsx` (`toggleVariants`),
      `navigation-menu.tsx` (`navigationMenuTriggerStyle`). Padrão da
      própria biblioteca shadcn, pré-existente à Fase 01.1.
    - Componentes que exportam um hook de contexto junto — `form.tsx`
      (`useFormField`), `sidebar.tsx` (`useSidebar`), `hooks/use-auth.tsx`
      (`useAuth`), `hooks/use-theme.tsx` (`useTheme`). Mesmo padrão —
      contexto + hook de acesso no mesmo arquivo é a convenção usual do
      React, inclusive recomendada por outras guias; só conflita
      especificamente com Fast Refresh.
    - `components/layout/navigation.tsx` (5 ocorrências): exporta
      `NAV_ITEMS` (constante), dois hooks (`useCurrentPath`,
      `useBreadcrumbLabel`) e reexporta `usePreferences`/
      `useUpdatePreferences`/`Button` junto com os componentes de
      navegação — pré-existente, não tocado nesta fase.
    - `routes/login.tsx`, `routes/cadastro.tsx`,
      `routes/app.configuracoes.tsx` (1 cada): **introduzidos por mim** na
      Fase 01.1, ao exportar `loginSchema`/`signupSchema`/`prefsSchema`
      junto do componente da rota, especificamente para permitir testá-los
      isoladamente (`src/routes/*.schema.test.ts`). Troca consciente:
      testabilidade automatizada por uma granularidade um pouco pior de
      HMR nesses 3 arquivos em dev.
  - Nenhum desses 16 casos foi "corrigido" porque a correção real (mover
    cada export não-componente para um arquivo separado) tocaria em
    bastante código de UI da Fase 01 sem nenhum ganho de comportamento —
    ficou fora de escopo por não ser uma correção de bug nem de segurança.
- **Erros de console:** um `ReferenceError: onGoogle is not defined`
  apareceu durante a sessão de testes da Fase 01.1 (HMR do Vite ainda não
  tinha recarregado o módulo depois de eu remover a função) — confirmado
  como resolvido: o DOM ao vivo não mostra erro, o formulário renderiza
  normalmente, e o texto de erro não aparece em nenhum lugar da página.
  A ferramenta de leitura de console usada nesta sessão mantém um buffer
  acumulado desde a criação da aba (reapareceu idêntico, com o mesmo
  timestamp, em checagens muito posteriores) — por isso a verificação
  final foi feita direto no DOM ao vivo, não só pelo log de console.
- **Erros de servidor (`vite dev`):** nenhum, do início ao fim da sessão.
- **Flash de tema:** testado nas três variantes (claro/escuro/sistema) —
  classe `.dark`/`color-scheme` já presentes no primeiro `document.
  documentElement.className` lido logo após a navegação, antes de qualquer
  interação — sem flash observável.
- **Flash de conteúdo privado:** testado — `/app` sem sessão nunca chega a
  colocar `[data-sidebar]` (ou qualquer marcador do shell autenticado) no
  DOM; a URL já muda para `/login?redirect=...` antes de eu conseguir
  inspecionar qualquer conteúdo da rota privada.
- **Overflow horizontal:** reconfirmado em `/login` — `scrollWidth ===
  clientWidth`.
- **Requisições duplicadas:** não identificadas nas páginas públicas
  reconfirmadas; área autenticada continua fora do alcance desta sessão.

## 13. Pendências

1. ~~Resultado da checagem prévia de `user_preferences`/`profiles`~~ —
   **resolvido**: 0 violações, checado antes de aplicar (§4).
2. ~~Migration não aplicada~~ — **resolvido**: aplicada e verificada
   remotamente em 2026-07-19 (§4).
3. ~~Verificação remota pós-migration~~ — **resolvido** (§4).
4. Login/logout/refresh de sessão/retorno pós-login com evidência técnica
   real (não só relato) — depende de conta de QA confirmada disponibilizada
   a esta auditoria.
5. Fluxo completo de recuperação de senha (link, nova senha, falha da
   antiga, link inválido/expirado) — mesma dependência.
6. Persistência real por preferência, por reload/nova sessão/logout+login,
   e confirmação de que o usuário B recebe defaults — mesma dependência.
7. Isolamento de RLS entre duas contas reais, nas duas direções, incluindo
   acesso anônimo direto — mesma dependência. **Item mais crítico
   restante.**
8. Teste de bypass de constraint via requisição direta ao banco — agora só
   depende do item 4 (a migration, que era a outra dependência, já foi
   aplicada).
9. Remoção manual das duas contas não confirmadas da Fase 01.1 pelo
   operador (Lovable Cloud → Auth → Users).
10. `.env` rastreado pelo git sem estar no `.gitignore` — recomendação de
    hardening separada, não bloqueia esta fase (só tem a chave pública).

## 14. Autorização

**REPROVADO — CORREÇÕES NECESSÁRIAS.**

Bloqueios que impedem `APROVADO PARA A FASE 02`, na linguagem do critério
desta fase:
- Migration: ✅ aplicada e verificada — **não é mais um bloqueio**.
- Login **não está testado** com evidência técnica desta auditoria (§6).
- Logout **não está testado** (§6).
- Persistência **não está comprovada** (§8).
- RLS **não está testada** com dois usuários (§9).
- Recuperação de senha **não está testada** ponta a ponta (§7).

Os itens que a auditoria já confirma — build, typecheck, lint (0 erros),
testes automatizados (41/41) e agora também a migration remota (§4) —
estão OK, mas não são suficientes sozinhos pelo critério definido para esta
fase. O único bloqueio restante é a falta de duas contas de QA confirmadas
disponibilizadas para eu rodar os testes de §6–§9 com evidência real —
assim que isso existir, este é o único item que falta para reavaliar o
veredito.
