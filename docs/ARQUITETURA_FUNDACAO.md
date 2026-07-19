# Arquitetura da Fundação — StudyOS

> Atualizado na Fase 01.1 (hardening). Descreve como autenticação, sessão,
> proteção de rotas, perfil/preferências, tema e banco de dados se encaixam
> hoje. Convenções aqui valem para toda feature futura.

## 1. Fluxo de autenticação

- Cliente Supabase: `src/integrations/supabase/client.ts` — criado via `Proxy`
  (não instancia no import, só no primeiro uso), com `persistSession: true`,
  `autoRefreshToken: true` e `storage: localStorage` (só no browser).
- **A sessão vive inteiramente no `localStorage` do navegador.** Não há
  cookie de sessão nem SSR autenticado — isso molda todas as decisões
  abaixo.
- Cadastro (`/cadastro`) chama `supabase.auth.signUp`; login (`/login`)
  chama `supabase.auth.signInWithPassword`; recuperação usa
  `resetPasswordForEmail` + `updateUser`.
- Erros do Supabase Auth nunca são exibidos crus ao usuário — passam por
  `src/lib/auth-errors.ts` (`friendlyAuthError`), que traduz para pt-BR e
  preserva o texto técnico original só no `console.error` (diagnóstico em
  dev, sem vazar detalhe interno na UI).
- Login com Google (Lovable OAuth, `src/integrations/lovable/index.ts`)
  está implementado mas **oculto** na UI — não foi possível validar o fluxo
  completo (callback, criação de `profiles`/`user_preferences`, ausência de
  duplicação) nesta auditoria. Ver `docs/AUDITORIA_FASE_01_1.md` §7.

## 2. Restauração de sessão e estado de auth

Fonte única de verdade: `src/lib/auth-store.ts` — um store fora do React
(não é contexto), com:

- `getSnapshot()` / `subscribe()` — compatíveis com `useSyncExternalStore`.
- `ensureInitialized()` — promise cacheada que resolve quando a sessão
  inicial (restaurada do `localStorage`) fica disponível. Chamável várias
  vezes (de múltiplos `beforeLoad`) sem repetir a checagem.
- No boot, o módulo já assina `supabase.auth.onAuthStateChange` (o
  Supabase-js dispara um evento `INITIAL_SESSION` assim que alguém assina,
  o que cobre a restauração inicial sem esperar por um `getSession()`
  redundante — mantido como segunda garantia).
- Em ambiente sem `window` (SSR), `ensureInitialized()` retorna `null` na
  hora, sem tentar tocar `localStorage`.

`src/hooks/use-auth.tsx` (`AuthProvider`/`useAuth`) é uma casca fina de
React sobre esse store, via `useSyncExternalStore` — existe só para manter a
API que os componentes já usavam (`session`, `user`, `loading`, `signOut`).

## 3. Proteção de rotas (TanStack Router)

**Antes (Fase 01):** guard só dentro do componente (`if (!session) return
<Navigate to="/login" />` em `app.tsx`), fora do ciclo de vida do router.

**Agora:** o mesmo `authStore` é injetado no **contexto do router**
(`src/router.tsx`, `context: { queryClient, auth: authStore }`), tipado em
`createRootRouteWithContext<{ queryClient; auth: AuthStore }>()`
(`src/routes/__root.tsx`). Cada rota que precisa de uma decisão de acesso
usa `beforeLoad` chamando um helper puro de `src/lib/route-guards.ts`:

```ts
// rota privada (ex.: /app)
beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href)

// rota só-para-visitante (ex.: /login, /cadastro)
beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth)
```

- `requireAuth` aguarda `ensureInitialized()` e, sem sessão, faz
  `throw redirect({ to: "/login", search: { redirect: location.href } })` —
  a rota de origem é preservada em `?redirect=`. `location.href` do
  `beforeLoad` do TanStack Router já é relativo ao app (nunca inclui
  origin), então isso não abre uma brecha de open-redirect por si só; ainda
  assim, `/login` valida esse parâmetro com `isSafeInternalPath()`
  (`src/lib/safe-redirect.ts`) antes de aceitá-lo, rejeitando qualquer valor
  que não comece com uma única barra.
- `redirectIfAuthenticated` faz o inverso: com sessão, manda para `/app`.
- Como `beforeLoad` roda **antes** de montar o componente/filhos da rota,
  nenhum código privado (loader, dado, UI) chega a executar quando o
  usuário não está autenticado — diferente do padrão antigo, em que a
  árvore só não renderizava por causa da ordem dos `if`s dentro do
  componente.
- `/app` sendo uma rota-layout, seu `beforeLoad` também bloqueia todas as
  rotas filhas (`/app/desempenho`, `/app/configuracoes` etc.) até resolver —
  não é preciso repetir o guard em cada uma.

**Limitação assumida, não escondida:** `/`, `/app`, `/login` e `/cadastro`
têm `ssr: false`. Como a sessão só existe em `localStorage`, o servidor não
tem como saber se alguém está autenticado na primeira request — arriscar
uma decisão de SSR aqui poderia mandar um usuário legitimamente logado para
`/login` só porque o servidor não vê o `localStorage` dele. Em vez de
adivinhar, essas rotas renderizam um `pendingComponent` (`RouteLoading`) e
resolvem inteiramente no cliente, uma vez. Isso está documentado — não é
"bug escondido", é a troca consciente que vem de usar sessão client-side em
vez de cookie.

## 4. Perfil e preferências

- `src/hooks/use-preferences.tsx`: hooks de TanStack Query
  (`useProfile`/`useUpdateProfile`, `usePreferences`/`useUpdatePreferences`)
  sobre as tabelas `profiles` e `user_preferences`. Todas as queries têm
  `enabled: !!user`; mutações lançam erro se `!user`.
- **Nunca fazem `insert`/`delete`** — só `select`/`update` do próprio
  registro (`.eq("id"/"user_id", user.id)`). Criação é só via trigger (§6).
- Toda escrita de preferências numéricas passa por `prefsSchema` (Zod, em
  `src/routes/app.configuracoes.tsx`) com os mesmos limites dos `CHECK`s do
  banco — a UI não depende só do atributo HTML `min`/`max`.

## 5. Tema

- Provider: `src/hooks/use-theme.tsx`. Três origens possíveis:
  `"system" | "light" | "dark"`.
- **Antes da autenticação** (ou antes do `usePreferences` responder): o
  valor mora em `localStorage["studyos.theme"]`.
- **Depois de autenticado**: quando `usePreferences()` resolve com um
  `theme` do banco, ele **sobrescreve** o estado local e o `localStorage`
  (o banco vence em caso de conflito).
- `setTheme()` sempre grava local primeiro (efeito imediato) e, se houver
  usuário, também persiste via `useUpdatePreferences`.
- **Sem flash do tema errado:** um `<script>` inline em
  `src/routes/__root.tsx` (`THEME_BOOTSTRAP_SCRIPT`) roda no `<head>`, antes
  do primeiro paint, lendo o mesmo `localStorage["studyos.theme"]` e
  aplicando a classe `.dark`/`color-scheme` na hora — sem isso, a classe só
  aparecia depois de hidratar, no `useEffect` do `ThemeProvider`. As duas
  leituras usam a mesma chave; documentado no código porque não dá para
  importar uma constante TS dentro de um `<script>` inline serializado.

## 6. Banco de dados

Migrations em `supabase/migrations/`, aplicadas em ordem pelo timestamp no
nome do arquivo:

1. `20260718231957_...sql` — schema inicial: tabelas `profiles` e
   `user_preferences`, RLS, trigger `on_auth_user_created` →
   `handle_new_user()`.
2. `20260718232030_...sql` — `REVOKE EXECUTE` de `handle_new_user` e
   `set_updated_at` para `PUBLIC, anon, authenticated` (só o trigger, como
   `SECURITY DEFINER`, pode chamá-las).
3. `20260719000000_fase01_1_hardening_constraints.sql` (Fase 01.1) — teto
   nos `CHECK`s numéricos de `user_preferences` (antes só tinham piso),
   `CHECK` para impedir `timezone`/`full_name` só-espaço em `profiles`, e
   `REVOKE INSERT, DELETE` de `authenticated` em ambas as tabelas (o
   trigger cria as linhas via `SECURITY DEFINER`, ignorando grants — o
   cliente nunca precisou de `INSERT`/`DELETE` diretos).

### Trigger de novo usuário

`handle_new_user()` (`SECURITY DEFINER`, `SET search_path = public`) roda
`AFTER INSERT ON auth.users` e cria, na mesma transação, uma linha em
`profiles` (nome vindo de `raw_user_meta_data->>'full_name'`, com fallback
para `'name'` e depois `''`) e uma em `user_preferences` — atômico: se
qualquer um dos dois `INSERT`s falhar, a transação inteira do cadastro
falha (nenhum perfil "órfão" fica para trás). Client não pode chamá-la
diretamente (`EXECUTE` revogado de `PUBLIC`/`anon`/`authenticated`) —
confirmado nesta auditoria via PostgREST recusando expor a função no schema
cache para a chave anônima.

### RLS

`profiles` e `user_preferences` têm `SELECT`/`UPDATE` restritos a
`auth.uid() = id` / `auth.uid() = user_id`. Não existe política de
`DELETE`. Depois da Fase 01.1 também não existe `INSERT` (nem grant nem
política) — a única via de criação é o trigger.

## 7. Convenção para futuras migrations

- **Nunca edite uma migration já commitada/aplicada** — sempre crie um novo
  arquivo `YYYYMMDDHHMMSS_descricao.sql`.
- CHECKs numéricos sempre com piso **e** teto explícitos (não só `> 0`).
- Toda tabela nova com dado de usuário: RLS habilitado desde o `CREATE
  TABLE`, políticas `USING`/`WITH CHECK` explícitas por operação, sem
  depender do grant de tabela sozinho.
- Se a criação de uma linha depende de outra (ex.: perfil ao cadastrar),
  prefira trigger `SECURITY DEFINER` com `search_path` fixo e `EXECUTE`
  revogado dos papéis de cliente — não abra `INSERT` direto "só por via das
  dúvidas".

## 8. Como o cliente deve acessar dados (e o que nunca fazer)

- Toda leitura/escrita de dados de usuário passa pelo cliente browser
  (`src/integrations/supabase/client.ts`), com a chave `publishable`/anon —
  a segurança vem inteiramente de RLS, não de esconder a query.
- **`service_role` nunca deve ser usado no navegador.** Existe um client
  server-only (`src/integrations/supabase/client.server.ts`) explicitamente
  isolado por convenção de nome (`.server.ts`) e comentário no topo do
  arquivo — só pode ser importado por outros `.server.ts` (funções de
  servidor do TanStack Start), nunca por uma rota/componente client.
- Chamadas autenticadas a funções de servidor passam pelo middleware
  `src/integrations/supabase/auth-middleware.ts` (`requireSupabaseAuth`),
  que valida o Bearer token via `supabase.auth.getClaims()` — features
  futuras que precisem de lógica de servidor devem usar esse middleware em
  vez de confiar em um `userId` vindo do cliente sem validação.
