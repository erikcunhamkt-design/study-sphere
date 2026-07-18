# Auditoria — Fase 01 (StudyOS)

> Fundação técnica e visual. Nenhuma funcionalidade além do escopo desta fase foi implementada.

## 1. Resumo do que foi implementado

- Cadastro, login, recuperação e redefinição de senha via Lovable Cloud (Supabase).
- Sessão persistida, guarda de rotas privadas e logout.
- Shell do aplicativo com sidebar recolhível (desktop) e navegação inferior (mobile).
- Topbar com breadcrumb, pesquisa (Ctrl/⌘+K, placeholder honesto), criação rápida (itens marcados “em breve”), meta diária, alternância de tema e menu do usuário.
- Dashboard `/app` com saudação horária e empty states reais para todas as seções.
- Rotas iniciais para todas as áreas (`/app/estudos`, `/faculdade`, `/estudar`, `/flashcards`, `/questoes`, `/planejamento`, `/biblioteca`, `/desempenho`, `/configuracoes`).
- Configurações funcionais: perfil (nome + fuso), aparência (tema + sidebar) e preferências de estudo (meta + semana + Pomodoro), persistidas em `user_preferences`.
- Tema claro/escuro/sistema, salvo em `user_preferences` (e em `localStorage` antes do login).
- Identidade visual grafite/preto + magenta, em tokens semânticos (oklch) via `src/styles.css`.

## 2. Arquivos criados

- `src/lib/app-config.ts` — nome e textos centrais do produto (fácil renomear).
- `src/hooks/use-auth.tsx` — provider e hook de sessão Supabase.
- `src/hooks/use-preferences.tsx` — queries/mutations de `profiles` e `user_preferences`.
- `src/hooks/use-theme.tsx` — provider de tema com persistência local + remota.
- `src/components/auth/auth-shell.tsx` — layout das telas públicas de auth.
- `src/components/layout/navigation.tsx` — sidebar desktop, navegação mobile, menu do usuário.
- `src/components/layout/topbar.tsx` — barra superior, pesquisa, criação rápida, meta, tema.
- `src/components/layout/page-shell.tsx` — `PageHeader`, `Section`, `EmptyState`.
- `src/routes/login.tsx`, `cadastro.tsx`, `recuperar-senha.tsx`, `redefinir-senha.tsx`.
- `src/routes/app.tsx` — layout privado (auth-gate client-side, `ssr:false`).
- `src/routes/app.index.tsx` — dashboard.
- `src/routes/app.{estudos,faculdade,estudar,flashcards,questoes,planejamento,biblioteca,desempenho,configuracoes}.tsx` — páginas iniciais com título/descrição/empty state.
- `docs/AUDITORIA_FASE_01.md` — este documento.

## 3. Arquivos alterados

- `src/routes/__root.tsx` — providers (QueryClient, Auth, Theme, Toaster), meta pt-BR, fonte Inter, textos 404/erro.
- `src/routes/index.tsx` — redireciona `/` para `/app` ou `/login` conforme sessão.
- `src/styles.css` — sistema de design StudyOS (tokens oklch, magenta, grafite).
- `src/start.ts` — registra `attachSupabaseAuth` no `functionMiddleware`.
- `package.json` — dependência `@lovable.dev/cloud-auth-js` (necessária pelo módulo Lovable Cloud).

## 4. Rotas implementadas

| Rota | Acesso |
|---|---|
| `/` | pública (redireciona) |
| `/login` | pública |
| `/cadastro` | pública |
| `/recuperar-senha` | pública |
| `/redefinir-senha` | pública |
| `/app` | protegida (redirect para `/login` sem sessão) |
| `/app/estudos` | protegida |
| `/app/faculdade` | protegida |
| `/app/estudar` | protegida |
| `/app/flashcards` | protegida |
| `/app/questoes` | protegida |
| `/app/planejamento` | protegida |
| `/app/biblioteca` | protegida |
| `/app/desempenho` | protegida |
| `/app/configuracoes` | protegida |

## 5. Banco de dados

**Tabelas**

- `public.profiles` — `id (uuid, PK, FK auth.users)`, `full_name (text)`, `avatar_url (text?)`, `timezone (text, default America/Sao_Paulo)`, `onboarding_completed (bool, default false)`, `created_at`, `updated_at`.
- `public.user_preferences` — `id (uuid, PK)`, `user_id (uuid, FK profiles, UNIQUE)`, `theme (text, check in system/light/dark)`, `sidebar_collapsed (bool)`, `daily_study_goal_minutes (int)`, `week_starts_on (int 0–6)`, `pomodoro_focus_minutes`, `pomodoro_short_break_minutes`, `pomodoro_long_break_minutes`, `pomodoro_cycles`, `created_at`, `updated_at`.

**Índices**: `user_preferences_user_id_idx`; `UNIQUE(user_id)` em `user_preferences`.

**Triggers**
- `profiles_set_updated_at`, `user_preferences_set_updated_at` — atualizam `updated_at`.
- `on_auth_user_created` — após novo usuário em `auth.users`, cria `profiles` e `user_preferences` automaticamente.

**Funções**
- `public.set_updated_at()` — helper para triggers (`EXECUTE` revogado de PUBLIC/anon/authenticated).
- `public.handle_new_user()` — `SECURITY DEFINER`, `search_path = public`, `EXECUTE` revogado; usada apenas pelo trigger de `auth.users`.

**RLS** — habilitada em ambas as tabelas.
- `profiles`: SELECT/INSERT/UPDATE restritos a `auth.uid() = id` para `authenticated`.
- `user_preferences`: SELECT/INSERT/UPDATE restritos a `auth.uid() = user_id` para `authenticated`.
- Nenhum acesso `anon` concedido.

**GRANTs** — `SELECT, INSERT, UPDATE, DELETE` a `authenticated`; `ALL` a `service_role`.

## 6. Autenticação

- Provider: Supabase (Lovable Cloud). E-mail/senha + Google (managed OAuth via `lovable.auth.signInWithOAuth`).
- `AuthProvider` registra `onAuthStateChange` primeiro e depois lê `getSession()` (evita corrida).
- Rotas privadas (`/app/*`) gated no layout `app.tsx` com `ssr:false` (Supabase persiste em `localStorage`, indisponível no SSR) e `<Navigate to="/login" replace />` quando não autenticado.
- Rotas de auth redirecionam para `/app` quando há sessão ativa.
- Logout via `supabase.auth.signOut()` (menu do usuário e rodapé da sidebar).
- Redefinição de senha usa `resetPasswordForEmail` com `redirectTo` para `/redefinir-senha` e `updateUser({ password })` após evento `PASSWORD_RECOVERY`.

## 7. Preferências persistidas

Salvas em `public.user_preferences` (por usuário):

- Tema (`theme`) — também espelhado em `localStorage` para bootstrap sem flicker.
- Estado da sidebar (`sidebar_collapsed`).
- Meta diária (`daily_study_goal_minutes`).
- Início da semana (`week_starts_on`).
- Pomodoro: foco, pausa curta, pausa longa, ciclos.

Perfil salvo em `public.profiles`: `full_name`, `timezone`.

## 8. Responsividade

- Desktop (≥ lg): sidebar visível, recolhível (16→64), tooltips no modo recolhido.
- Tablet: topbar completo, sidebar visível a partir de lg; abaixo cai para mobile.
- Mobile: sidebar oculta; barra inferior com 5 itens principais (Início, Estudos, Estudar, Desempenho, Mais) + Sheet com todas as rotas e ações; padding inferior respeita `safe-area-inset-bottom`.
- `min-h-dvh` (não `screen`) para altura real em mobile; `max-w-6xl` centralizado; `min-w-0` para evitar overflow horizontal.

## 9. Acessibilidade

- Todos os inputs têm `<Label htmlFor>`.
- Botões só-de-ícone recebem `aria-label` (busca, tema, menu, sidebar toggle, mostrar/ocultar senha, criação rápida, menu mobile).
- Ícones decorativos com `aria-hidden`.
- `aria-current="page"` no item ativo da sidebar.
- Foco visível global (`*:focus-visible`), contraste alto em ambos os temas.
- Navegação por teclado nativa (Radix/shadcn).
- Landmarks: `<header>`, `<aside>`, `<main>`, `<nav aria-label>`.
- Atalho global Ctrl/⌘+K para pesquisa.

## 10. Testes executados

| Cenário | Status | Observação |
|---|---|---|
| Build/typecheck do projeto | Automatizado pelo Lovable | Executado pela plataforma após as edições. |
| Migração aplicada com sucesso | Aprovado | Retorno do `supabase--migration`. |
| Linter de segurança pós-migração | Aprovado | 2 warnings iniciais resolvidos via `REVOKE EXECUTE` em `handle_new_user`/`set_updated_at`. |
| Cadastro | Não testado | Requer interação manual — teste na preview. |
| Login correto | Não testado | Idem. |
| Login incorreto | Não testado | Idem. |
| Logout | Não testado | Idem. |
| Recuperação de senha | Não testado | Requer entrega de e-mail. |
| Acesso não autenticado a rota privada | Não testado | Guarda implementada em `app.tsx` (`<Navigate>` para `/login`). |
| Persistência da sessão | Não testado | Implementada via Supabase + listener; requer verificação em navegador. |
| Persistência do tema | Não testado | `user_preferences.theme` + `localStorage`. |
| Persistência da sidebar | Não testado | `user_preferences.sidebar_collapsed`. |
| Atualização do perfil | Não testado | RLS + mutation em `profiles`. |
| Atualização das preferências | Não testado | RLS + mutation em `user_preferences`. |
| Isolamento entre usuários (RLS) | Não testado | Policies escopadas em `auth.uid()`. |
| Navegação desktop / mobile / overflow | Não testado | Verificar visualmente na preview. |

> **Nota:** não simulei aprovação de testes que não pude executar. Os fluxos requerem verificação manual na preview antes de encerrar a fase.

## 11. Erros encontrados

- Instalação inicial do módulo Lovable Cloud faltando `@lovable.dev/cloud-auth-js` — resolvido via `bun add`.
- Warnings do linter de RLS em funções `SECURITY DEFINER` — resolvidos revogando `EXECUTE` de `PUBLIC/anon/authenticated`.

## 12. Pendências conhecidas

- Upload de avatar não implementado (o campo existe, mas nenhum bucket foi configurado nesta fase).
- Provedor Google exige testes manuais na preview publicada; o token gerenciado é ativado, mas o usuário pode preferir credenciais próprias.
- Onboarding não implementado (o campo `onboarding_completed` existe mas ainda não é usado).
- Página `/redefinir-senha`: caso o link do Supabase leve para a URL raiz com `#`, o evento `PASSWORD_RECOVERY` é capturado; validar no ambiente publicado.
- Toasts de erro são amigáveis, mas a categorização de erros pode ser expandida.
- Testes automatizados não fazem parte desta fase.

## 13. Decisões técnicas

- **Rotas**: mantido TanStack Router (stack do template). Layout privado em `src/routes/app.tsx` com `ssr:false` porque o Supabase persiste sessão em `localStorage` (o SSR não vê a sessão, e habilitá-lo causaria flashes de login para usuários autenticados).
- **Dados**: leitura via TanStack Query + cliente Supabase browser (RLS aplica como o usuário). Não usei `createServerFn` nesta fase — as leituras são pequenas e específicas do usuário; server functions serão adicionadas quando houver lógica sensível a esconder do cliente.
- **Design**: tokens semânticos em `oklch` (não RGB) em `src/styles.css`, sem cores hardcoded em componentes. Fonte Inter carregada via `<link>` no `<head>` (o Tailwind v4 não resolve `@import` remoto).
- **Nome do app**: constante em `src/lib/app-config.ts` — renomear em um único lugar propaga para toda a UI.
- **Tema**: bootstrap em `localStorage` para evitar flicker antes da sessão; sincroniza com `user_preferences` após login.

## 14. Divergências do prompt

- Roteador: o prompt cita "React Router". O template Lovable atual é TanStack Router + TanStack Start (SSR). Mantido o roteador do template após confirmação do usuário; a semântica de rotas privadas/públicas atende ao pedido.
- Página `/redefinir-senha` marcada como pública (fora do `/app`), como o próprio prompt exige.
- Restante do escopo implementado conforme solicitado.

## 15. Segurança

- RLS habilitada em `profiles` e `user_preferences` com policies escopadas em `auth.uid()`.
- Nenhum acesso `anon` concedido.
- `SUPABASE_SERVICE_ROLE_KEY` **não** é usada no cliente — apenas o publishable/anon key aparece no bundle (padrão Lovable Cloud).
- Nenhum secret hardcoded em código do cliente.
- Funções `SECURITY DEFINER` com `search_path = public` e `EXECUTE` revogado de PUBLIC/anon/authenticated (chamadas apenas por triggers internos).
- Rotas `/app/*` bloqueadas quando não há sessão.
- Validação com Zod no cliente para todas as entradas de formulário públicas.

## 16. Próxima fase recomendada

A base está pronta para receber:

1. Modelo de dados de Áreas → Cursos → Módulos → Aulas.
2. Editor de anotações em blocos.
3. Motor de flashcards com revisão espaçada.
4. Banco de questões e simulados.
5. Sessões de estudo e Pomodoro operacional.
6. Métricas reais de desempenho.

**Não avancei** para nenhuma dessas frentes. Aguardando aprovação desta auditoria.
