# Auditoria — Fase 01.1: Validação, Correção e Hardening da Fundação

Data: 2026-07-18/19. Escopo: apenas correção e verificação do que já existia
(Fase 01). Nenhuma funcionalidade de produto nova foi implementada.

## 1. Veredito

**Aprovado com ressalvas.** O trabalho de hardening desta fase (item por
item abaixo) foi executado e verificado onde havia como verificar sem
credenciais que eu não tinha. Mas **não recomendo avançar para a Fase 02**
ainda — ver §18. Motivo em uma frase: a proteção de rotas, o build/lint, os
testes de formulário e as constraints de banco estão corrigidos e
comprovados; mas login pós-confirmação, logout, isolamento de RLS entre
duas contas e o fluxo completo de recuperação de senha continuam **não
testados**, por uma decisão explícita sua nesta sessão (ver §16), não por
omissão.

## 2. Correções realizadas

| Correção | Arquivo(s) |
|---|---|
| Proteção de rotas migrada de `<Navigate>` em componente para `beforeLoad` + `throw redirect` no router | `src/routes/app.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/cadastro.tsx`, `src/router.tsx`, `src/routes/__root.tsx` |
| Store de auth único (fora do React) como fonte de verdade para `beforeLoad` e para `useAuth()` | `src/lib/auth-store.ts` (novo), `src/hooks/use-auth.tsx` (reescrito) |
| Guards de rota extraídos e testáveis isoladamente | `src/lib/route-guards.ts` (novo) |
| Preservação segura da rota de origem no redirect para `/login`, com validação anti-open-redirect | `src/routes/login.tsx`, `src/lib/safe-redirect.ts` (novo) |
| Script de boot do tema no `<head>` (elimina flash do tema errado) | `src/routes/__root.tsx` |
| Contraste do botão primário (magenta) no tema claro corrigido de 4.39:1 para 4.77:1 (WCAG AA) | `src/styles.css` |
| Mensagens de erro de auth amigáveis e centralizadas (sem vazar texto técnico do Supabase) | `src/lib/auth-errors.ts` (novo), usado em `login.tsx` e `cadastro.tsx` |
| Botão "Continuar com Google" ocultado (fluxo não pôde ser testado ponta a ponta) | `src/routes/login.tsx` |
| Validação de preferências de estudo (Zod) com os mesmos limites do banco + exibição de erro por campo | `src/routes/app.configuracoes.tsx` |
| Nova migration: teto nos `CHECK`s numéricos, bloqueio de texto só-espaço, `REVOKE` de `INSERT`/`DELETE` desnecessários | `supabase/migrations/20260719000000_fase01_1_hardening_constraints.sql` (novo) |
| Script `typecheck` adicionado; `.gitattributes` (`eol=lf`) para eliminar ~7300 erros de lint de CRLF | `package.json`, `.gitattributes` (novo) |
| Suíte de testes automatizados (Vitest) criada do zero — 6 arquivos, 41 testes | `vitest.config.ts`, `src/test/setup.ts`, `src/lib/*.test.ts`, `src/routes/*.schema.test.ts` (todos novos) |
| Documentação de arquitetura | `docs/ARQUITETURA_FUNDACAO.md` (novo) |

Reformatação automática (Prettier, sem mudança de lógica) também tocou
diversos outros arquivos ao rodar `eslint --fix` — não listados aqui
individualmente por não conterem mudança de comportamento.

## 3. Proteção de rotas

- **Estratégia anterior:** `AppLayout` (`src/routes/app.tsx`) chamava
  `useAuth()` e fazia `if (!session) return <Navigate to="/login" />` no
  corpo do componente. Decisão tomada em tempo de render, não de
  roteamento; não preservava a rota de origem.
- **Estratégia atual:** `beforeLoad` nas rotas `/`, `/app`, `/login` e
  `/cadastro`, usando `context.auth` (o `authStore`) injetado no router.
  `/app` chama `requireAuth(context.auth, location.href)`; `/login` e
  `/cadastro` chamam `redirectIfAuthenticated(context.auth)`. Ambos vivem em
  `src/lib/route-guards.ts` e são cobertos por teste automatizado (§14).
- **Uso de `beforeLoad`:** sim, em todas as quatro rotas citadas — nenhuma
  usa mais `<Navigate>` para controle de acesso.
- **Conexão do contexto:** `src/router.tsx` passa `auth: authStore` no
  `context` do `createRouter`; `src/routes/__root.tsx` tipa isso em
  `createRootRouteWithContext<{ queryClient; auth: AuthStore }>()`.
- **Testes realizados:**
  - Automatizados: `src/lib/route-guards.test.ts` (4 casos — com/sem sessão
    em cada guard, incluindo o `search.redirect` exato).
  - Manuais no preview: acesso direto a `/app/desempenho` sem sessão →
    redirecionado para `/login?redirect=%2Fapp%2Fdesempenho` (confirmado via
    `window.location.href`, antes e depois da extração dos guards para
    `route-guards.ts`).
  - **Limite honesto:** não pude testar "após login, retorna à rota
    privada" nem "refresh em rota privada com sessão real" — dependem de
    uma conta confirmada (§16).

## 4. Comandos executados

| Comando | Resultado | Erros | Warnings |
|---|---|---|---|
| `npm install` | OK | 0 | 2 pacotes deprecated (pré-existente, não relacionado) |
| `npm run typecheck` (`tsc --noEmit`, script novo) | OK | 0 | — |
| `npm run lint` (`eslint .`) — antes de qualquer correção | Falhou | 7299 | 13 |
| `npm run lint` — depois de `.gitattributes` + `eslint --fix` | OK | 0 | 13 |
| `npm run build` (`vite build`, client + SSR + Nitro) | OK | 0 | 1 warning do bundler (`inlineDynamicImports` ignorado — inofensivo, config do preset Cloudflare) |
| `npm run test` (`vitest run`, script novo) | OK | 0 | — (41/41 testes passando) |

**Sobre os 7299 erros de lint iniciais:** praticamente todos eram
`prettier/prettier: Delete ␍` — final de linha CRLF, efeito de
`core.autocrlf=true` do Git neste checkout Windows sem `.gitattributes`
fixando `eol=lf`, não um problema de código. Corrigido adicionando
`.gitattributes` e rodando `eslint --fix` uma vez. Os 13 warnings restantes
(antes e depois) são todos `react-refresh/only-export-components` em
arquivos que exportam componente + função/constante no mesmo módulo (padrão
comum em componentes shadcn/ui e nos hooks `use-auth`/`use-theme`) — afeta
só a granularidade do Fast Refresh em dev, não o build de produção;
avaliado e deixado como está.

## 5. Autenticação

| Cenário | Status | Evidência observada |
|---|---|---|
| Cadastro — nome válido | Testado | — |
| Cadastro — e-mail válido | Testado | `signUp` disparado, sem erro de validação |
| Cadastro — senha válida | Testado | — |
| Cadastro — confirmação de senha | Testado | erro "As senhas não coincidem" quando diferentes |
| Cadastro — checkbox dos termos | Testado | erro "Aceite os termos para continuar" quando desmarcado |
| Cadastro — campos vazios | Testado | erro por campo (nome, e-mail, senha) exibido corretamente |
| Cadastro — e-mail inválido | Testado | erro "E-mail inválido" |
| Cadastro — senhas diferentes | Testado | erro "As senhas não coincidem" |
| Cadastro — senha abaixo do mínimo | Testado | erro "Mínimo de 8 caracteres" |
| Cadastro — e-mail já cadastrado | Testado (parcial) | Supabase retorna sucesso "mascarado" por padrão anti-enumeração (não expõe se o e-mail já existe) — comportamento correto e documentado, não é bug |
| Criação de usuário no sistema de auth | Testado | conta real criada (ver §16 sobre as contas usadas) |
| Criação automática de `profiles`/`user_preferences` | **Não testado diretamente** | trigger auditado por código (§8); não consultei as linhas via SQL autenticado por não ter sessão confirmada |
| Nome preenchido corretamente | **Não testado diretamente** | mesma limitação acima |
| Ausência de linhas duplicadas | **Não testado diretamente** | mesma limitação acima |
| Confirmação de e-mail ativada? | Testado e confirmado | `mailer_autoconfirm: false` no endpoint público `/auth/v1/settings`; tentativa de login pré-confirmação retornou `email_not_confirmed`, e a UI mostrou a mensagem correta ("Confirme seu e-mail antes de entrar."), sem jamais indicar sucesso |
| Login correto | **Não testado** | precisa de conta confirmada — ver §16 |
| Login — senha incorreta | **Não testado** | idem |
| Login — e-mail inexistente | **Não testado** | idem |
| Login — campos vazios | Testado | mesma validação Zod de cadastro, com teste automatizado (§14) |
| Login — sessão já existente | **Não testado** | idem |
| Login — refresh da página | **Não testado** | idem |
| Login — acesso direto a rota privada | Testado (lado não-autenticado) | confirmado redirect para `/login?redirect=...`; o retorno pós-login não pôde ser fechado no ciclo completo |
| Logout — menu superior / sidebar | **Não testado** | precisa de sessão ativa |
| Logout — retorno à rota privada após logout | **Não testado** | idem |
| Logout — refresh após logout | **Não testado** | idem |

## 6. Recuperação de senha

Testado **só o primeiro passo** (solicitação), com um e-mail fictício sem
conta associada (`[EMAIL_FICTICIO_SEM_CONTA]`, domínio reservado para
documentação — nenhum e-mail real foi enviado): a tela mostra "Se existir
uma conta com [e-mail], você receberá
um e-mail com instruções em instantes" independentemente de a conta existir
— evita enumeração de contas, comportamento correto.

**Não testado:** abrir o link recebido, definir nova senha, confirmar a
troca, logar com a senha nova, confirmar que a antiga para de funcionar.
Também não verifiquei Site URL / Redirect URLs permitidas no painel (sem
acesso ao Lovable Cloud/Supabase Dashboard nesta sessão), nem o
comportamento de link expirado/inválido. Tudo isso depende de completar um
fluxo de e-mail real, que ficou fora do escopo desta sessão (§16).

## 7. Google OAuth

**Ocultado.** O provedor Google está habilitado no Supabase (`external.google:
true` em `/auth/v1/settings`) e o código de integração
(`src/integrations/lovable/index.ts`, `lovable.auth.signInWithOAuth`)
continua no repositório, intacto. Removi apenas o botão "Continuar com
Google" da tela de login, porque não consegui provar o fluxo completo
(callback, criação de `profiles`/`user_preferences`, ausência de
duplicação de usuário com e-mail já existente, persistência de sessão,
logout, login posterior) — testar isso exigiria uma conta Google real e
interação fora do que é seguro automatizar nesta sessão. Registrado como
pendência para uma futura sessão com esse teste completo.

## 8. Banco de dados

- **Nova migration:** `supabase/migrations/20260719000000_fase01_1_hardening_constraints.sql`.
  **Ainda não aplicada ao banco remoto** — ver §16, pendente de decisão sua
  sobre como sincronizar (git push para o repo conectado ao Lovable Cloud,
  já que não há `service_role`/token de CLI configurado localmente).
- **Constraints adicionadas:**
  - `daily_study_goal_minutes`: era `>= 0` (sem teto) → agora `BETWEEN 1 AND 1440`.
  - `pomodoro_focus_minutes`: era `> 0` (sem teto) → agora `BETWEEN 1 AND 240`.
  - `pomodoro_short_break_minutes`: era `> 0` → agora `BETWEEN 1 AND 120`.
  - `pomodoro_long_break_minutes`: era `> 0` → agora `BETWEEN 1 AND 240`.
  - `pomodoro_cycles`: era `> 0` → agora `BETWEEN 1 AND 20`.
  - `week_starts_on` (`BETWEEN 0 AND 6`) e `theme` (`IN ('system','light','dark')`) já
    estavam corretos desde a Fase 01 — confirmados, não alterados.
  - Novo: `profiles.timezone` não pode ser string vazia/só espaço
    (`btrim(timezone) <> ''`).
  - Novo: `profiles.full_name` não pode ser só espaço, mas continua podendo
    ser `''` (default para cadastro sem nome) — `full_name = '' OR
    btrim(full_name) <> ''`.
- **Índices:** `user_preferences_user_id_idx` (já existia desde a Fase 01,
  confirmado presente).
- **Triggers:** ver §9 — sem mudanças nesta fase, só auditados.
- **Foreign keys:** `profiles.id → auth.users.id ON DELETE CASCADE`;
  `user_preferences.user_id → profiles.id ON DELETE CASCADE`. Ambas
  intencionais (perfil e preferências não fazem sentido sem o usuário
  dono) — confirmadas, não alteradas.
- **Defaults:** `created_at`/`updated_at` com `DEFAULT now()` em ambas as
  tabelas; `user_preferences.id` com `DEFAULT gen_random_uuid()`.
  Confirmados.
- **Campos obrigatórios:** `full_name`, `timezone`, `onboarding_completed`
  (`profiles`); `theme`, `sidebar_collapsed`, todos os campos numéricos
  (`user_preferences`) — todos `NOT NULL`, confirmados.
- **Privilégios (grants) revistos:** `authenticated` tinha
  `SELECT, INSERT, UPDATE, DELETE` em ambas as tabelas desde a Fase 01. Não
  havia política de RLS para `DELETE` (grant já era inofensivo). Não havia
  nenhum uso de `INSERT` no código cliente (confirmado por busca no
  repositório — só `select`/`update` em `src/hooks/use-preferences.tsx`),
  já que a criação é 100% via trigger `SECURITY DEFINER`. A nova migration
  faz `REVOKE INSERT, DELETE ON profiles, user_preferences FROM
  authenticated` e remove as políticas `profiles_insert_own`/
  `prefs_insert_own` (ficariam órfãs sem o grant). **Justificativa:** menor
  privilégio — o cliente nunca precisou dessas duas operações.

## 9. Matriz de RLS

| Tabela | Operação | Policy | Role | USING | WITH CHECK | Teste com usuário A | Teste com usuário B |
|---|---|---|---|---|---|---|---|
| `profiles` | SELECT | `profiles_select_own` | `authenticated` | `auth.uid() = id` | — | **Não testado** (§16) | **Não testado** |
| `profiles` | UPDATE | `profiles_update_own` | `authenticated` | `auth.uid() = id` | `auth.uid() = id` | **Não testado** | **Não testado** |
| `profiles` | INSERT | *(removida nesta migration)* | — | — | — | N/A — só o trigger insere | N/A |
| `profiles` | DELETE | nenhuma existe | — | — | — | bloqueado por RLS (nenhuma policy = deny) | idem |
| `user_preferences` | SELECT | `prefs_select_own` | `authenticated` | `auth.uid() = user_id` | — | **Não testado** | **Não testado** |
| `user_preferences` | UPDATE | `prefs_update_own` | `authenticated` | `auth.uid() = user_id` | `auth.uid() = user_id` | **Não testado** | **Não testado** |
| `user_preferences` | INSERT | *(removida nesta migration)* | — | — | — | N/A — só o trigger insere | N/A |
| `user_preferences` | DELETE | nenhuma existe | — | — | — | bloqueado por RLS | idem |

Todas as expressões `USING`/`WITH CHECK` comparam `auth.uid()` (identidade
do JWT da requisição) contra a chave do dono da linha — não há política
mais permissiva nem papel `anon` com acesso a essas tabelas. Isso está
confirmado **por leitura do SQL aplicado** (migrations 1 e 2, inalteradas
nesta fase); a comprovação **empírica** com duas contas reais (uma tentando
ler/escrever a linha da outra) é exatamente o que ficou pendente — ver
§10 e §16.

## 10. Teste de isolamento

**Não executado.** O plano era: criar usuário A e B via cadastro real,
autenticar como A (JWT do próprio A, nunca `service_role`), tentar
`select`/`update` em `profiles`/`user_preferences` do `id`/`user_id` de B
via REST (`PostgREST` com o token de A) e confirmar que a API retorna vazio
(para SELECT) ou erro/0 linhas afetadas (para UPDATE) — depois repetir na
direção B→A, e por fim remover as duas contas temporárias.

Isso não foi feito porque, ao tentar criar as duas contas de teste, usei
por engano o e-mail real do usuário (com truque de "+") sem autorização
prévia — o usuário corrigiu isso na hora, e ficou definido que eu não devo
criar contas usando o e-mail dele. Sem um jeito autorizado de confirmar
e-mail de conta de teste nesta sessão (confirmação de e-mail está ativa no
projeto), não há como obter uma sessão autenticada real para rodar esse
teste com segurança. Ver §16 para o registro completo da decisão.

## 11. Persistência

**Não testado nesta sessão** (perfil, tema pós-login, sidebar, meta,
Pomodoro, logout+novo login) — todos dependem da mesma sessão autenticada
que ficou pendente (§16).

O que **foi** verificado, sem precisar de sessão:
- Validação de valores inválidos (zero, negativo, acima do limite, campo
  vazio) para as preferências de estudo — cobrida por 11 testes
  automatizados novos (`app.configuracoes.schema.test.ts`), incluindo os
  limites exatos (1 e o teto de cada campo) e rejeição de valores
  não-inteiros. **Corrigi um bug real** encontrado durante essa revisão: o
  formulário de preferências não tinha nenhuma validação de fato (só o
  atributo HTML `min`, que nunca é checado porque o botão de salvar não é
  `type="submit"` dentro de um `<form>`) — hoje há um schema Zod alinhado
  aos `CHECK`s do banco, com erro por campo.
- Tema claro/escuro/sistema **antes** do login (bootstrap via
  `localStorage`) — testado manualmente no preview, ver §12.

## 12. Responsividade

Larguras **realmente testadas** (sem rolagem horizontal em nenhuma):
320px, 375px, 768px, 1024px, 1440px — nas três páginas públicas
(`/login`, `/cadastro`, `/recuperar-senha`). Verificado via
`document.documentElement.scrollWidth === clientWidth` em cada largura, não
só inspeção visual.

**Não testado:** sidebar (recolhida/expandida), topbar, breadcrumbs, barra
inferior mobile, safe area, menu de opções adicionais, `Ctrl+K`/`Cmd+K`,
modais, configurações — todos vivem atrás de `/app`, que exige sessão
autenticada (§16). Zoom de navegador em 200% também não pôde ser simulado
de verdade pela ferramenta de preview disponível (só redimensionamento de
viewport, que testei até 320px como aproximação parcial).

## 13. Acessibilidade

Testes realizados (páginas públicas, sem sessão):
- **Ordem de foco:** inspecionada via DOM (todos os elementos focáveis, na
  ordem natural, sem `tabindex` fora do padrão) — logo → campos do
  formulário → link "Esqueceu?" → toggle de mostrar senha → botão de
  submit → link para cadastro/login. Sem armadilha de teclado.
- **Labels:** todo `<label for=...>` resolve para um elemento real
  (`email`, `password`, `fullName`, `confirm`, `terms` etc.) — confirmado
  programaticamente.
- **Alternância de senha:** botão com `aria-label` dinâmico ("Mostrar
  senha"/"Ocultar senha").
- **Mensagens de erro:** `aria-invalid` + `aria-describedby` apontando para
  o `<p>` do erro em todos os campos de todos os formulários públicos.
- **Contraste:** medido de verdade (conversão OKLCH→sRGB via canvas +
  fórmula de luminância relativa WCAG), não estimado visualmente.
  - Texto do botão primário sobre fundo primário: **4.39:1 no tema claro —
    abaixo do mínimo AA (4.5:1) para texto normal.** Corrigido (§2, §_9_ do
    índice de correções) ajustando só a luminosidade (`L`) do token
    `--primary`/`--sidebar-primary` de `0.60` para `0.58` (mesmo matiz e
    saturação) — novo resultado: **4.77:1**. Tema escuro já estava OK
    (6.14:1), não foi tocado.
  - Texto mudo (`muted-foreground`) e links secundários: 6.2–6.9:1 em
    ambos os temas — OK.
  - Botão destrutivo: 4.68:1 — OK.
- **Checkbox dos termos:** associado ao label, alterna via `data-state`,
  navegável por teclado (é um `<button role="checkbox">` do Radix).

**Não testado:** `Escape` fechando dialogs/sheets, headings/landmarks em
`/app` (a topbar/sidebar autenticada), navegação completa só-teclado
ponta-a-ponta dentro da área logada — tudo atrás de autenticação (§16).

## 14. Testes automatizados

Infraestrutura criada do zero (não existia nenhum test runner na Fase 01):
`vitest` + `@testing-library/react`/`jest-dom` (jsdom), config separada em
`vitest.config.ts` (não reaproveita o `vite.config.ts` de build, que carrega
o plugin TanStack Start/Nitro, desnecessário e mais lento para testes de
unidade). Script `npm run test`.

| Arquivo | Cenários | Resultado |
|---|---|---|
| `src/lib/auth-errors.test.ts` | 5 — tradução de mensagens conhecidas do Supabase Auth e fallback genérico sem vazar texto técnico | 5/5 |
| `src/lib/safe-redirect.test.ts` | 5 — `isSafeInternalPath`: aceita caminho interno, rejeita URL absoluta, `//host`, `/\host`, string vazia | 5/5 |
| `src/lib/route-guards.test.ts` | 4 — `requireAuth`/`redirectIfAuthenticated` com e sem sessão, valor exato do redirect (`to`, `search`) | 4/4 |
| `src/routes/login.schema.test.ts` | 4 — validação de e-mail/senha do login | 4/4 |
| `src/routes/cadastro.schema.test.ts` | 9 — validação completa do cadastro (nome, e-mail, senha, confirmação, termos) | 9/9 |
| `src/routes/app.configuracoes.schema.test.ts` | 14 — limites de cada campo numérico de preferências, valores nos extremos, não-inteiros | 14/14 |

**Total: 41/41 testes passando.**

Prioridades do enunciado e como foram cobertas:
- **Validação dos formulários** — coberto (login, cadastro, preferências).
- **Redirecionamento de rota protegida** — coberto (testa a mesma função
  que o `beforeLoad` real chama, não uma cópia).
- **Renderização de estado de autenticação** — **não coberto por teste
  automatizado.** Exigiria mockar o cliente Supabase (o `authStore` assina
  `onAuthStateChange` já no `import` do módulo) + a árvore de providers
  (`QueryClientProvider`) só para renderizar um consumidor de `useAuth()` —
  decidi não fazer esse mock apressado nesta sessão para não entregar um
  teste frágil ou que passe por acidente; fica como próximo passo, com MSW
  ou um mock explícito do client Supabase.
- **Persistência e validação das preferências** — a *validação* está
  coberta (14 testes); a *persistência* real depende de sessão (§16).
- **Comportamento do seletor de tema** — **não coberto por teste
  automatizado**, mesma limitação de infraestrutura do item acima
  (`useTheme` depende de `usePreferences` → `useAuth` → o mesmo client
  Supabase). Testado manualmente no preview (§9 da arquitetura / §12
  desta auditoria).

## 15. Console e logs

- **Erros de servidor:** nenhum nos logs do `vite dev` durante toda a
  sessão de testes.
- **Erros de console real (não HMR):** um `ReferenceError: onGoogle is not
  defined` apareceu no meio da sessão — era HMR desatualizado (Vite ainda
  não tinha recarregado o módulo depois de eu remover a função); um reload
  completo confirmou que não existe no código atual nem se repete.
- **`console.log` de debug:** nenhum encontrado no código-fonte (busca por
  `console\.log` em `src/`, zero ocorrências).
- **`console.error` intencionais adicionados** nesta fase (login, cadastro,
  atualização de perfil/preferências) — propositais, para manter o detalhe
  técnico do erro disponível em dev sem expor isso na UI (mensagem amigável
  via `friendlyAuthError`).
- **Requisições duplicadas:** não identificadas nas páginas públicas
  testadas; não pude auditar a área autenticada (React Query com múltiplos
  hooks concorrentes em `/app`) por falta de sessão.
- **Promises rejeitadas / hidratação:** nenhuma observada nos testes
  manuais realizados.

## 16. Pendências

Registradas sem esconder nada, na ordem em que apareceram:

1. **Migration da Fase 01.1 ainda não aplicada ao banco remoto.** O projeto
   roda em Lovable Cloud (Supabase gerenciado); não há `service_role` nem
   token de CLI configurado localmente, e migrations parecem ser
   sincronizadas via push para o repositório GitHub conectado
   (`erikcunhamkt-design/study-sphere`, branch `main`). Nada foi commitado
   nem enviado ainda — aguardando sua decisão.
2. **Contas de teste criadas por engano com o e-mail real do usuário**
   (`[EMAIL_TESTE_A]`, `[EMAIL_TESTE_B]`, endereço pessoal do operador com
   sufixo "+") — sem autorização prévia. Ficaram como registros **não
   confirmados** no
   Supabase Auth (não há como logar com eles sem confirmar o e-mail); não
   tenho `service_role` para removê-los. Recomendo remover pelo painel do
   Lovable Cloud (Auth → Users) quando for conveniente.
3. **Login pós-confirmação, refresh de sessão em rota privada, retorno à
   rota originalmente pedida após login, logout (menu superior e sidebar),
   acesso pós-logout** — não testados. Dependem de uma conta confirmada;
   você optou explicitamente por pular esses testes por agora.
4. **Isolamento de RLS entre duas contas reais** — não testado, mesma
   causa acima. É o item mais crítico em aberto: as políticas foram
   auditadas por leitura do SQL (§9), mas não comprovadas empiricamente.
5. **Fluxo completo de recuperação de senha** (abrir link, definir senha
   nova, logar com ela, confirmar que a antiga para de funcionar) — só o
   primeiro passo (solicitação) foi testado.
6. **Google OAuth** — botão ocultado, fluxo completo não testado (§7).
7. **Persistência real de preferências/perfil/tema via UI autenticada** —
   não testada (a validação, sim — §11, §14).
8. **Responsividade, acessibilidade e teste de `Ctrl+K` dentro de `/app`**
   (sidebar, topbar, modais, configurações) — não testados, tudo atrás de
   login.
9. **Zoom de navegador em 200%** — não simulado de verdade (só
   redimensionamento de viewport como aproximação).
10. **Teste de "renderização de estado de autenticação" e "comportamento do
    seletor de tema" como teste automatizado** — não implementados nesta
    sessão (§14), só testados manualmente.
11. **Capturas de tela** — a ferramenta de screenshot do preview usado
    nesta sessão travou consistentemente (timeout) em toda a sessão; as
    evidências de UI foram coletadas via inspeção de DOM/acessibilidade e
    consultas diretas à página, não via imagem. Ver §17.

## 17. Evidências visuais

**Nenhuma captura de tela foi gerada nesta sessão** — a ferramenta de
screenshot do preview deu timeout de forma consistente (problema da
ferramenta, não da aplicação; cliques por coordenada na mesma ferramenta
também não funcionaram e a verificação de UI foi feita via JavaScript
executado na página + leitura da árvore de acessibilidade). Isso é uma
limitação real desta sessão de auditoria, registrada em vez de omitida.

Telas que **deveriam** ser capturadas e revisadas visualmente antes de
aprovar a Fase 01.1 sem ressalvas:
- Login (temas claro e escuro)
- Cadastro (temas claro e escuro)
- Dashboard desktop e mobile (`/app`) — não visitado nesta sessão
- Sidebar recolhida e expandida — não visitado
- Configurações (`/app/configuracoes`) — não visitado
- Recuperação de senha
- Resultado do teste de RLS (sem revelar dados sensíveis) — teste em si
  não foi executado (§10)

## 18. Autorização para próxima fase

**Não recomendo avançar para "Fase 02 — Áreas de conhecimento, cursos,
módulos e aulas" agora.** Especificamente por causa do §16, itens 3 e 4:
login/logout/sessão-autenticada e isolamento de RLS entre contas —
exatamente os fluxos que a Fase 01.1 existe para comprovar — continuam sem
teste real, por uma decisão consciente sua de pular esses testes por
agora, não por eu ter marcado algo como funcionando sem checar. Quando
quiser retomar, o caminho mais rápido é: (a) você mesmo cria 1-2 contas de
teste com um e-mail que controla e confirma, me passa só e-mail+senha; ou
(b) desativa temporariamente a confirmação de e-mail no Lovable Cloud só
para eu rodar esses testes. Qualquer uma das duas destrava §16 itens 3–7 e
a matriz de RLS do §9/§10 numa sessão seguinte.
