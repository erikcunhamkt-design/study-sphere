# Plano Fase 06 — Agenda de estudos (calendário + revisões devidas)

Data: 06/08/2026
Status: **Aguardando aprovação do operador** (Gate 1 — Revisão 2)

## 1. Escopo e Fatiamento

A Fase 06 implementa a agenda de estudos do StudyOS, consolidando o que já existe (flashcards devidos, sessões realizadas, meta diária) e permitindo o planejamento ativo.

- **Fase 06.1 (Planejamento e Visão Mensal)**: Nova tabela `planned_studies`, visão de calendário mensal, criação de compromissos de estudo.
- **Fase 06.2 (Visão Diária e Execução)**: Foco no "Hoje", deep-links para revisões, início de sessões a partir do planejado via RPC.

## 2. Decisões de Produto (A aprovar pelo operador)

| Item | Recomendação | Justificativa |
|---|---|---|
| **1. Leitura x Planejamento** | **Introduzir entradas planejadas** (novo dado). | Uma agenda que não permite planejar o futuro é apenas um log; o valor está na organização antecipada. |
| **2. Modelo da Entrada** | **Mínimo viável**: título, data, vínculo opcional (aula/curso), status. | Evita sobrecarga de campos na v1; permite o essencial para organizar a rotina. |
| **3. Ciclo de Vida do Status** | **Semântica de Transição**: 'planned' → 'completed' ou 'skipped'. | O status muda para 'completed' **apenas após o término** de uma `study_session` vinculada. Se iniciada e abandonada, o `planned_study` permanece 'planned' (ou o usuário pode marcar como 'skipped'). |
| **4. Deep-link para Revisão** | **Navegação Simples**. | O clique em "Cards devidos" apenas navega para a rota de Flashcards (`/app/flashcards/estudar`) que já possui a lógica SM-2 para carregar a fila do dia. Não há recálculo de agendamento nesta fase. |
| **5. Views** | **Mês e Dia**. | Semana cortada da v1; Mês dá o contexto macro, Dia dá a execução micro. Mobile prioriza a lista do Dia. |
| **6. Timezone** | **Sempre `profile.timezone`**. | Reuso total de `src/lib/timezone.ts`. O "Hoje" é relativo ao fuso do usuário. |
| **7. Integração Dashboard** | **Widget "Agenda de Hoje"**. | Substitui o estado vazio de planejamento atual com os próximos itens da agenda. |

## 3. Modelo de Dados Proposto (Não implementado)

### Tabela `planned_studies`
- `id`: uuid primary key default gen_random_uuid().
- `user_id`: uuid references auth.users not null.
- `title`: text not null (CHECK: `char_length(trim(title)) > 0`).
- `scheduled_date`: date not null (tipo nativo SQL `date`).
- `study_area_id`: uuid (opcional).
- `course_id`: uuid (opcional).
- `estimated_minutes`: integer (opcional, CHECK `estimated_minutes BETWEEN 1 AND 1440`).
- `status`: text not null default 'planned' (CHECK `status IN ('planned', 'completed', 'skipped')`).
- `study_session_id`: uuid references study_sessions(id) **ON DELETE SET NULL** (opcional).

**Restrições de Integridade (FKs Compostas):**
- Foreign Key em `(study_area_id, user_id)` referenciando `study_areas(id, user_id)` para garantir isolamento (exige `UNIQUE(id, user_id)` em `study_areas`).
- Foreign Key em `(course_id, user_id)` referenciando `courses(id, user_id)` para garantir isolamento (exige `UNIQUE(id, user_id)` em `courses`).

**Índices:**
- `CREATE INDEX idx_planned_studies_user_date ON public.planned_studies (user_id, scheduled_date);` (Otimização para visão mensal/diária).
- `CREATE INDEX idx_planned_studies_status ON public.planned_studies (user_id, status) WHERE status = 'planned';` (Otimização para dashboard).

**RLS**: 
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` restritos a `auth.uid() = user_id`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_studies TO authenticated;`
- `GRANT ALL ON public.planned_studies TO service_role;`

## 4. RPCs Propostas

### `start_planned_study`
Cria uma sessão de estudo e vincula ao planejamento de forma atômica.
- **Assinatura**: `start_planned_study(p_planned_id uuid)`
- **Segurança**: `SECURITY INVOKER`, `SET search_path = public`.
- **Validações**:
    1. O `planned_study` pertence ao `auth.uid()`.
    2. O status atual é 'planned'.
    3. Se válido, insere em `study_sessions`, recupera o `id` e atualiza `planned_studies.study_session_id`.
    4. O status do `planned_study` NÃO muda automaticamente para 'completed' no início (ver seção 2, item 3).

## 5. UI e Rotas
- Rota: `/app/agenda`.
- Componente de Calendário: Reaproveitar primitives do shadcn (Calendar/Popovers).
- **Isolamento de Bundle**: A agenda não importará o BlockNote. Chunks de calendário serão carregados sob demanda via `React.lazy`. A verificação de isolamento de bundle é item obrigatório do QA.

## 6. Riscos e Limitações
- **Automação/QA**: Dropdowns Radix e modais de calendário são difíceis de testar com cliques sintéticos. O QA exigirá **verificação manual do operador** para interações complexas de UI.
- **Drift de Timezone**: Eventos `date` são fixos no dia civil em que foram criados, independentemente de mudanças futuras no fuso do perfil.

## 7. Conformidade com Restrições Inegociáveis

- **RLS**: Implementado via políticas por `user_id` e isolamento garantido por FKs compostas, impedindo que um usuário vincule cursos ou áreas de terceiros ao seu planejamento.
- **service_role**: Proibido no cliente; todas as operações usam o token do usuário autenticado.
- **Timezone**: O plano honra o fuso do usuário ao usar `profile.timezone` para determinar o "Hoje" e renderizar o calendário, utilizando as utilidades de `src/lib/timezone.ts`.
- **Zod + DB Checks**: Validação dupla. O Zod limpa os inputs no cliente/server-function, e o banco garante a integridade com CHECKs de trim e ranges de minutos.
- **IA**: Zero menção ou uso de IA no plano ou na implementação proposta.
- **Bundle**: Garantia de isolamento via `lazy loading` para componentes pesados, mantendo o bundle da agenda leve e sem dependências do editor.
