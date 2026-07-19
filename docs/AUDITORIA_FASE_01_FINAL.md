# Auditoria — Fase 01.3: Homologação Funcional Final do StudyOS

Data: 2026-07-19. Escopo: homologação dos fluxos reais pendentes das Fases
01.1/01.2, usando duas contas de QA confirmadas fornecidas pelo operador.
Nenhuma funcionalidade da Fase 02 foi implementada.

## 1. Veredito

**`REPROVADO — CORREÇÕES NECESSÁRIAS`**

A fundação avançou substancialmente nesta sessão — login, restauração de
sessão, logout, persistência, isolamento entre usuários e RLS foram todos
testados com evidência técnica real (não só relato) usando as duas contas
de QA, e **dois bugs reais foram encontrados e corrigidos** (§17 lista os
dois). O único item crítico da lista do §18 que continua sem comprovação
completa é a **recuperação de senha**: a solicitação e a abertura do link
foram confirmadas, mas definir a senha nova, logar com ela e confirmar que
a antiga para de funcionar não foi executado (depende de acesso à caixa de
entrada, que não tenho). Por isso, apesar de todo o resto estar comprovado,
o veredito permanece reprovado — é o único bloqueio restante, e está
isolado e claramente descrito em §13.

## 2. Ambiente homologado

- **Ambiente:** preview local (`vite dev`, `http://localhost:8080`) contra
  o banco remoto real do Lovable Cloud/Supabase (projeto
  `ojyriiuqdcltuclbuqhr`) — não um mock.
- **Data:** 2026-07-19.
- **Branch:** `main` (local, não enviado ao remoto).
- **Commits da fundação:**
  - `da08ebc` — checkpoint da Fase 01.1 (hardening da fundação e roteamento).
  - `18747fccdf1223816113a30405b38d971333d24f` — checkpoint de hardening de
    privilégios do banco (Fase 01.2).
  - Um terceiro commit desta sessão (Fase 01.3) será criado ao final —
    ver §19.
- **Migrations remotas aplicadas e verificadas:**
  `20260719000000_fase01_1_hardening_constraints.sql` e
  `20260719120000_fase01_2_least_privilege_grants.sql` (ambas confirmadas
  no banco remoto na Fase 01.2, revalidadas indiretamente nesta sessão via
  os testes de bypass do §10 e §9).
- **Contas de QA:** exatamente 2 (Usuário QA A, Usuário QA B), fornecidas
  pelo operador, já confirmadas. Nenhum e-mail completo, senha ou token é
  reproduzido neste documento.

## 3. Autenticação

| Cenário | Status | Evidência observada |
|---|---|---|
| Login correto (QA A) | **Testado** | Redirecionado para `/app`; toast "Bem-vindo de volta!"; token de sessão presente no `localStorage`; perfil e preferências carregados corretamente; 0 erros de console/servidor |
| Login — senha incorreta | **Testado** | Mensagem amigável "E-mail ou senha incorretos." — nenhum detalhe técnico exposto |
| Login — e-mail inexistente | **Testado** | Mesma mensagem genérica do caso acima — não revela se a conta existe |
| Login — campos vazios | **Testado** | Erros de campo "Informe um e-mail válido" / "Informe sua senha", sem round-trip à API |
| Login — e-mail com formato inválido | **Testado** | Erro "Informe um e-mail válido" |
| Preservação da rota (logout → `/app/desempenho` → login → retorno) | **Testado** | Acesso direto a `/app/desempenho` sem sessão → `/login?redirect=%2Fapp%2Fdesempenho`; após login bem-sucedido, o app usa esse `redirect` para voltar à rota original (mecanismo comprovado por teste automatizado em `route-guards.test.ts` e pela URL observada) |
| Botão voltar do navegador | **Testado** | Após logout, "voltar" retorna à entrada de histórico anterior (`/login?redirect=...`), nunca a conteúdo privado |

## 4. Proteção de rotas

- **Acesso não autenticado:** `/app` e `/app/desempenho` redirecionam para
  `/login` preservando o destino em `?redirect=`.
- **Preservação do destino:** confirmado via `beforeLoad` (`requireAuth` em
  `src/lib/route-guards.ts`), testado automaticamente (4 casos) e
  observado ao vivo no preview.
- **Retorno depois do login:** o formulário de login lê `search.redirect`
  (validado por `isSafeInternalPath`, que rejeita URLs absolutas e
  `//host`) e navega para lá após `signInWithPassword` bem-sucedido.
- **Reload:** `/app` e `/app/desempenho` recarregados com sessão ativa
  permanecem na mesma rota (sessão restaurada do `localStorage`, sem
  redirecionar para `/login`).
- **Ausência de flash:** confirmado — `beforeLoad` bloqueia a renderização
  do layout privado até `ensureInitialized()` resolver; o DOM nunca chega a
  conter marcadores do shell autenticado antes do redirecionamento quando
  não há sessão.

## 5. Logout

| Controle | Resultado antes da correção | Resultado depois da correção |
|---|---|---|
| Sidebar (desktop) | ❌ sessão limpa, mas UI ficava presa em `/app` (ver §17, bug 1) | ✅ redireciona para `/login` imediatamente |
| Menu mobile (sheet) | Mesmo bug (usa o mesmo `signOut()` de `useAuth()`) | ✅ corrigido (mesmo hook `useSignOut`) |
| Menu do usuário (topbar) | Mesmo bug | ✅ corrigido e testado diretamente — sessão encerrada, redireciona para `/login` |

Depois da correção (§17), testado pelo menu do topbar e pela sidebar:
- Sessão encerrada (`localStorage` sem token) confirmado.
- Cache do TanStack Query limpo via `queryClient.clear()` chamado no mesmo
  hook — dados do usuário anterior não reaparecem (ver §8).
- Tentativa de voltar para `/app` após logout: bloqueada — `/app` com
  sessão ausente sempre reavalia `beforeLoad` e redireciona.
- Reload após logout: permanece deslogado.

## 6. Recuperação de senha

Fluxo **parcialmente** executado:

1. Solicitação enviada para o e-mail do Usuário QA A pela tela
   `/recuperar-senha` — confirmada (toast "E-mail enviado", mensagem
   genérica que não revela se a conta existe).
2. Operador confirmou ter recebido o e-mail e que o link abriu
   corretamente a rota `/redefinir-senha`.
3. **Não executado:** definir a nova senha, fazer logout (se a sessão
   ficar ativa), logar com a senha nova, e confirmar que a antiga para de
   funcionar. Também não testados: link inválido, link já utilizado, link
   expirado.

Esse é o único item crítico do §18 que impede `APROVADO PARA A FASE 02`
nesta rodada — ver §13.

## 7. Persistência

Testado com o Usuário QA A, através de: mudança pela UI → navegação para
outra rota → reload completo → nova sessão (logout + login) → confirmado
em todas as etapas.

| Preferência | Navegação | Reload | Nova sessão (logout+login) |
|---|---|---|---|
| Nome | ✅ | ✅ | ✅ |
| Fuso horário | ✅ | ✅ | ✅ |
| Tema | ✅ | ✅ | ✅ |
| Sidebar recolhida | ✅ | ✅ | ✅ |
| Meta diária | ✅ | ✅ | ✅ |
| Minutos de foco (Pomodoro) | ✅ | ✅ | ✅ |
| Pausa curta | ✅ | ✅ | ✅ |
| Pausa longa | ✅ | ✅ | ✅ |
| Ciclos | ✅ | ✅ | ✅ |
| Dia inicial da semana | ✅ | ✅ | ✅ |

Confirmado também, via consulta direta autenticada como o próprio usuário,
que só a linha do Usuário QA A foi alterada (a do B permaneceu com seus
próprios valores em todos os testes do §8).

## 8. Troca de usuários

**Dois achados reais, ambos corrigidos nesta sessão** — ver §17 para o
detalhe técnico completo.

- **Nome, fuso horário, meta diária, tempos de Pomodoro, dia da semana:**
  nunca vazaram de A para B em nenhum momento — confirmado comparando os
  valores exatos exibidos/gravados para B contra os que eu tinha acabado
  de configurar para A (todos diferentes, nenhuma coincidência).
- **Tema (achado corrigido):** como `ThemeProvider` é montado uma única
  vez na raiz e sobrevive à troca de sessão (é navegação client-side, sem
  reload de página), o tema explícito do usuário que acabou de sair
  continuava sendo exibido — na tela de login, e por ~300–450ms na sessão
  do próximo usuário, até as preferências dele carregarem do banco.
  Corrigido resetando o tema para "sistema" (e limpando o `localStorage`)
  exatamente na transição logado→deslogado. Reproduzi o cenário antes e
  depois da correção com temas propositalmente diferentes entre A (escuro)
  e B (claro): antes, a tela de login e o primeiro frame de B apareciam
  escuros; depois, nenhum traço do tema de A sobrevive ao logout.
- **Cache do TanStack Query:** as chaves de query já incluíam `user.id`
  (`["profile", user?.id]`, `["preferences", user?.id]`) desde a Fase
  01.1 — isso por si só já impedia B de *ler* dados cacheados de A.
  Reforcei mesmo assim com `queryClient.clear()` no logout (novo, nesta
  sessão), para não deixar entradas órfãs acumulando na memória entre
  trocas de sessão.
- **Nenhuma exposição perceptível de dados textuais do usuário A** foi
  observada em nenhum momento da sessão do usuário B.

## 9. Matriz de RLS

Todas as operações abaixo foram executadas com o cliente autenticado real
de cada usuário (JWT obtido da própria sessão de login), nunca
`service_role`. IDs de usuário não são reproduzidos por extenso.

| Sessão | Tabela | Operação | Registro | Resultado esperado | Resultado observado | Tipo do bloqueio |
|---|---|---|---|---|---|---|
| QA A | `profiles` | SELECT | próprio | permitido | 200, 1 linha | — |
| QA A | `profiles` | UPDATE | próprio | permitido | 200, 1 linha afetada | — |
| QA A | `profiles` | SELECT | de B | 0 linhas | 200, 0 linhas | RLS (filtrado) |
| QA A | `profiles` | UPDATE | de B | 0 linhas afetadas | 200, 0 linhas afetadas; dado de B confirmado intacto depois | RLS (filtrado) |
| QA A | `profiles` | INSERT | nova linha | bloqueado | 403, `permission denied for table profiles` | Ausência de grant |
| QA A | `profiles` | DELETE | próprio | bloqueado | 403, `permission denied for table profiles` | Ausência de grant |
| QA A | `user_preferences` | SELECT/UPDATE | próprio | permitido | 200 nos dois | — |
| QA A | `user_preferences` | SELECT/UPDATE | de B | 0 linhas | 200, 0 linhas nos dois | RLS (filtrado) |
| QA A | `user_preferences` | INSERT/DELETE | — | bloqueado | 403 nos dois | Ausência de grant |
| QA B | `profiles`/`user_preferences` | SELECT/UPDATE | próprio | permitido | 200 em todos | — |
| QA B | `profiles`/`user_preferences` | SELECT/UPDATE | de A | 0 linhas | 200, 0 linhas; dado de A confirmado intacto (nome ainda o valor configurado por A, não "HACKED_BY_B") | RLS (filtrado) |
| QA B | `profiles`/`user_preferences` | INSERT/DELETE | — | bloqueado | 403 em todos | Ausência de grant |
| Anônimo (chave pública, sem JWT de usuário) | `profiles`/`user_preferences` | SELECT | qualquer | 0 linhas | 200, 0 linhas | RLS (nenhuma policy para `anon`) |
| Anônimo | `profiles`/`user_preferences` | UPDATE | linha de B | 0 linhas afetadas | 204, 0 linhas afetadas | RLS (filtrado — `anon` tem grant de tabela padrão do schema, mas `USING auth.uid()=id` nunca é verdadeiro sem JWT) |
| Anônimo | `profiles` | INSERT | nova linha | bloqueado | 401, `new row violates row-level security policy` | RLS (WITH CHECK) |
| Anônimo | `profiles` | DELETE | linha de B | 0 linhas | 200, 0 linhas; linha de B confirmada intacta depois | RLS (nenhuma policy de DELETE = deny padrão) |

`TRUNCATE`: não é uma operação exposta pela API REST (PostgREST só mapeia
SELECT/INSERT/UPDATE/DELETE); a ausência do grant para `authenticated` já
havia sido comprovada diretamente via `information_schema.role_table_grants`
na Fase 01.2 (só `SELECT`/`UPDATE` concedidos) — não repetido aqui por não
haver como testar sem SQL direto (que exigiria acesso que não tenho, ou
`service_role`, proibido).

## 10. Validações

- **Interface + Zod:** já cobertas por 14 testes automatizados
  (`app.configuracoes.schema.test.ts`, Fase 01.1/01.2) para os 6 campos
  numéricos, incluindo os 8 casos pedidos (válido, mínimo, máximo, zero,
  negativo, acima do máximo, decimal, vazio).
- **Banco remoto (requisição direta autenticada, ignorando a UI):**
  testado nesta sessão com o token real do Usuário QA A. **10 casos
  inválidos, todos bloqueados:** `daily_study_goal_minutes` (0, -10,
  1441), `pomodoro_focus_minutes` (0, 241), `pomodoro_cycles` (0, 21, 4.5
  decimal), `week_starts_on` (7, -1) — código Postgres `23514` (violação
  de `CHECK`) em todos, exceto o decimal em coluna inteira (`22P02`,
  formato inválido). Também testado texto (`'abc'` → `22P02`) e `null`
  explícito (→ `23502`, violação de `NOT NULL`). Valores válidos
  restaurados ao final.
- **Nome e fuso horário (banco, direto):** espaço-em-branco em `full_name`
  bloqueado (`23514`); `full_name` vazio permitido (default esperado);
  `timezone` vazio e `timezone` só-espaço bloqueados (`23514`);
  **`timezone` com texto livre arbitrário (`"Texto/Qualquer_Coisa"`) foi
  aceito** — ressalva já conhecida desde a Fase 01.1, documentada e não
  bloqueante (ver §13).
- **Trim do nome (interface):** testado — `"   Nome Com Espaco   "` salvo
  como `"Nome Com Espaco"`.

## 11. Responsividade

Larguras testadas autenticado: 320px, 375px, 768px, 1024px, 1440px —
`/app` (dashboard) e `/app/configuracoes`, todas sem overflow horizontal
(`scrollWidth === clientWidth` em todas).

Também verificado:
- Modal de pesquisa (Ctrl+K): abre dentro dos limites do viewport em
  1440px; título e mensagem "implementação futura" corretos (recurso em
  si é da Fase 02, aqui só validei que o placeholder não quebra o layout).
- Sheet de navegação mobile (375px): abre (`data-state=open`), conteúdo
  (todos os links) presente e correto no DOM. **Ressalva de ambiente:** a
  animação CSS de entrada (slide-in, via `tailwindcss-animate`) não
  completou visualmente nesta sessão de automação — o elemento ficou com
  `transform` na posição fechada apesar de `data-state=open`. Não
  considero isso um bug de produto: é o mesmo padrão `Sheet` usado em
  milhares de projetos shadcn sem essa classe de problema, o estado lógico
  (`data-state`, conteúdo, foco) está correto, e esta sessão já mostrou
  repetidamente que cliques/teclas sintéticos e algumas animações não se
  comportam de forma confiável neste ambiente de automação especificamente
  (ex.: o teste de Escape do §5 anterior pareceu falhar pelo mesmo motivo
  até eu corrigir a asserção). Recomendo uma verificação visual manual
  rápida (não bloqueante) num navegador real antes da Fase 02.
- Zoom 200%: não simulado de forma fiel (a ferramenta de preview só
  redimensiona o viewport); a aproximação em 320px cobre parcialmente o
  mesmo espaço de layout.

## 12. Acessibilidade

- **Landmarks:** `aside` (sidebar), `nav` (principal, breadcrumb e
  inferior — cada um com `aria-label` distinto), `header`, `main` — todos
  presentes e sem ambiguidade para leitor de tela.
- **Headings:** hierarquia sem saltos (`h1` saudação → `h2` seções → `h3`
  subseções) no dashboard.
- **Botões só-ícone:** 4 encontrados no dashboard; **1 sem nome acessível
  — corrigido nesta sessão (ver §17, bug 2).** Os outros 3
  ("Expandir/Recolher sidebar", "Criação rápida", "Alternar tema") já
  tinham `aria-label` correto.
- **Escape fecha dialogs:** confirmado — o modal de pesquisa muda de
  `data-state="open"` para `"closed"` ao despachar `Escape` (minha
  primeira tentativa de checar isso deu um falso negativo por eu checar
  só a presença do elemento no DOM, não o `data-state` — Radix mantém o
  elemento montado durante a animação de saída; corrigido o método de
  checagem antes de concluir).
- **Contraste (medido via conversão de cor real, não estimado):** sidebar
  — 17.7:1 no tema escuro, 13.6–15.4:1 no tema claro, todos muito acima do
  mínimo AA (4.5:1). O ajuste de contraste do botão primário feito na
  Fase 01.1 (4.39→4.77:1) permanece válido e não foi alterado.
- **Não testado nesta sessão:** navegação completa só-teclado ponta-a-
  ponta (tab order percorrendo sidebar → topbar → conteúdo → footer) e
  anúncio de mensagens de erro por leitor de tela real (só verificado
  `aria-invalid`/`aria-describedby` presentes no markup, não testado com
  um leitor de tela de verdade).

## 13. Pendências

1. **Fluxo completo de recuperação de senha** (nova senha, login com ela,
   falha da antiga, link inválido/expirado) — único item crítico do §18
   ainda em aberto. Bloqueia o veredito `APROVADO`.
2. Navegação completa só-teclado e teste com leitor de tela real — não
   executado.
3. Zoom de navegador em 200% — não simulado fielmente.
4. Verificação visual manual da animação do sheet de navegação mobile
   (ver §11) — recomendada, não bloqueante.
5. `timezone` continua aceitando texto livre não-vazio (não restrito a
   identificadores IANA válidos) — ressalva conhecida desde a Fase 01.1,
   não bloqueante porque valores vazios/só-espaço já são impedidos.
6. Google OAuth — segue oculto, fluxo completo não testado (Fase 01.1).
7. `.env` rastreado pelo git sem estar no `.gitignore` (só tem chave
   pública) — recomendação de hardening separada.
8. Contas de QA A e B — mantidas por decisão do operador, para uso em
   testes futuros (não excluídas).

## 14. Comandos finais

| Comando | Resultado | Erros | Warnings |
|---|---|---|---|
| `npm run typecheck` | OK | 0 | — |
| `npm run lint` | OK | 0 | 17 (ver §13/análise abaixo — 1 a mais que a Fase 01.2 porque `use-auth.tsx` passou a exportar `useSignOut` além de `useAuth`, mesmo padrão) |
| `npm run build` | OK | 0 | 1 warning do bundler, já documentado como inofensivo (config do Nitro/Cloudflare) |
| `npm run test` | OK | 0 | — (41/41 testes) |

**Warnings de lint — todos `react-refresh/only-export-components`,
mesma causa técnica em todos: um módulo exporta um componente React e
também um hook/constante/schema, o que impede o Fast Refresh do Vite de
trocar aquele módulo sem recarregar a página inteira — só afeta a
experiência de desenvolvimento (`vite dev`), não o build de produção nem
o runtime.**

- Padrão shadcn/ui pré-existente (variante `cva` junto do componente):
  `badge.tsx`, `button.tsx`, `toggle.tsx`, `navigation-menu.tsx` (1 cada).
- Padrão contexto+hook pré-existente: `form.tsx` (`useFormField`),
  `sidebar.tsx` (`useSidebar`).
- `hooks/use-auth.tsx` (2 ocorrências — `useAuth` e o novo `useSignOut`) e
  `hooks/use-theme.tsx` (1 — `useTheme`): mesmo padrão, incluindo a adição
  desta sessão.
- `components/layout/navigation.tsx` (5 ocorrências — `NAV_ITEMS`,
  `useCurrentPath`, `useBreadcrumbLabel`, e reexports de
  `usePreferences`/`useUpdatePreferences`/`Button`): pré-existente, não
  tocado nesta sessão.
- `routes/login.tsx`, `routes/cadastro.tsx`, `routes/app.configuracoes.tsx`
  (1 cada — `loginSchema`, `signupSchema`, `prefsSchema`): introduzidos na
  Fase 01.1 deliberadamente, para permitir testar os schemas isolados.

Nenhum destes indica dependência de hook incorreta, promise não tratada,
import inconsistente, problema de acessibilidade ou código morto — todos
são estritamente sobre granularidade de HMR em desenvolvimento. Corrigir
exigiria mover cada export não-componente para um arquivo separado, o que
tocaria bastante código de UI da Fase 01 sem nenhum ganho de comportamento
— avaliado e mantido como está.

## 15. Console e rede

- **Erros de console:** nenhum genuíno. As mensagens `[signInWithPassword]
  AuthApiError` e `[signUp]`/`[updatePreferences]` vistas durante os
  testes são `console.error` intencionais (adicionados na Fase 01.1) para
  manter o detalhe técnico disponível em dev sem expor isso na UI — não
  são exceções não tratadas.
- **Erros de servidor:** nenhum, do início ao fim da sessão
  (`preview_logs` limpo).
- **Erros de autenticação/banco:** todos os "erros" observados foram
  respostas esperadas de validação (senha incorreta, RLS bloqueando,
  CHECK constraint) — nenhum erro inesperado.
- **Falhas de redirect:** nenhuma, exceto o bug de logout já corrigido
  (§17).
- **Flash de tema:** reproduzido, causa raiz identificada e corrigida
  (§8, §17).
- **Flash de conteúdo privado:** não observado em nenhum teste.
- **Dados antigos após troca de usuário:** um caso encontrado e corrigido
  (tema, ver §8/§17); todos os outros campos testados nunca vazaram.
- **Requisições duplicadas:** não identificadas nas telas testadas
  (dashboard, configurações, login, cadastro, recuperar senha).

## 16. Segurança e limpeza

- **Sem credenciais no Git:** confirmado — nenhum arquivo `.env.qa.local`
  foi criado; busca por trechos das credenciais usadas nesta sessão nos
  arquivos rastreados não encontrou nenhuma ocorrência real (o único
  "match" foi o nome do repositório GitHub `erikcunhamkt-design`,
  coincidência de texto, não uma credencial).
- **Sem PII na documentação:** este documento e os anteriores usam
  "Usuário QA A/B" ou, quando necessário citar algo tecnicamente, só os
  últimos 4 caracteres de um ID — nunca e-mail completo, senha, ou ID
  completo desnecessário.
- **Sem tokens expostos:** os tokens de acesso usados para os testes de
  RLS (§9) viveram só em variáveis JavaScript no navegador durante a
  sessão de teste, nunca gravados em disco, nunca colados nas minhas
  respostas.
- **Sem `service_role` no cliente:** confirmado — todos os testes de RLS
  usaram o JWT real de sessão de cada usuário (obtido via login legítimo),
  nunca a chave de serviço.
- **Arquivos temporários removidos:** nenhum foi criado (as credenciais
  chegaram por mensagem de chat, não por arquivo).
- **Estado final das contas de QA:** mantidas por decisão do operador
  (§17 do roteiro / §13 pendência 8), sessão do navegador encerrada e
  `localStorage` limpo ao final desta auditoria.

## 17. Correções realizadas nesta sessão

1. **Logout não redirecionava (bug de sessão/UX).** Os três controles de
   logout (`SidebarFooter`, `MobileFooter`, `UserMenu` em
   `src/components/layout/navigation.tsx`) chamavam só `signOut()` do
   `useAuth()`, que limpa a sessão do Supabase mas nunca navega — como
   `beforeLoad` só roda em transições de rota, o usuário ficava "preso" em
   `/app` (sem os próprios dados, mas com o layout privado ainda montado)
   até navegar ou recarregar manualmente. Corrigido com um novo hook
   `useSignOut()` (`src/hooks/use-auth.tsx`) que encapsula
   `authStore.signOut()` + `queryClient.clear()` + `navigate({to:
   "/login", replace: true})`, usado nos três controles. Reproduzido antes
   e depois da correção; depois, os três controles redirecionam
   imediatamente.
2. **Tema do usuário anterior vazava para a tela de login e para o início
   da sessão do próximo usuário.** `ThemeProvider` é montado uma única vez
   na raiz e sobrevive a login/logout (navegação client-side, sem
   reload) — sem tratamento, o tema explícito escolhido por quem acabou de
   sair continuava sendo exibido. Corrigido em `src/hooks/use-theme.tsx`
   com um efeito que detecta a transição logado→deslogado (via
   `useRef` guardando o `user.id` anterior, para não disparar no mount
   inicial) e reseta o tema para `"system"` + limpa o
   `localStorage["studyos.theme"]` nesse momento exato. Reproduzido com
   temas propositalmente diferentes entre os dois usuários antes e depois
   da correção — antes, ~300–450ms de tema errado; depois, zero.
3. **Botão "Sair" da sidebar recolhida sem nome acessível.** Quando a
   sidebar está recolhida, o botão de logout mostra só o ícone
   (`aria-hidden`) e dependia só de um `Tooltip` visual — sem
   `aria-label`, um leitor de tela não tinha como anunciar o botão.
   Corrigido adicionando `aria-label="Sair"` condicional ao estado
   `collapsed` em `src/components/layout/navigation.tsx`.

Todas as três correções foram verificadas com `npm run typecheck`, `lint`,
`build` e `test` (41/41) depois de cada mudança, e reproduzidas ao vivo no
preview antes/depois.

## 18. Autorização

**`REPROVADO — CORREÇÕES NECESSÁRIAS`**

Checklist dos itens críticos exigidos para `APROVADO PARA A FASE 02`:

- [x] Login
- [x] Restauração da sessão
- [x] Logout (testado e corrigido)
- [ ] **Recuperação de senha — incompleta (só solicitação + abertura do link confirmadas)**
- [x] Persistência
- [x] Troca segura entre usuários (2 achados corrigidos)
- [x] RLS com duas contas
- [x] Bloqueio de usuário anônimo
- [x] Constraints remotas
- [x] Build
- [x] Testes automatizados
- [x] Ausência de falhas críticas em aberto (as 2 encontradas foram corrigidas)

Onze de doze itens comprovados com evidência técnica direta nesta sessão.
O item restante (recuperação de senha completa) depende só de completar o
fluxo com uma das contas de QA já disponíveis — quando isso for feito
(definir a senha nova, logar com ela, confirmar que a antiga falha, e
idealmente testar link inválido/expirado), este é o único ponto que falta
para reavaliar o veredito para `APROVADO PARA A FASE 02`.

## 19. Commit final

Como o veredito continua reprovado, este commit registra as correções
realizadas — não declara a Fase 01 concluída. Ver confirmação de hash e
estado da árvore na resposta desta sessão, gerada após este documento.
