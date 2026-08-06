# Plano Fase 06 — Agenda de estudos (calendário + revisões devidas)

Data: 06/08/2026
Status: **Aguardando aprovação do operador** (Gate 1)

## 1. Escopo e Fatiamento

A Fase 06 implementa a agenda de estudos do StudyOS, consolidando o que já existe (flashcards devidos, sessões realizadas, meta diária) e permitindo o planejamento ativo.

- **Fase 06.1 (Planejamento e Visão Mensal)**: Nova tabela `planned_studies`, visão de calendário mensal, criação de compromissos de estudo.
- **Fase 06.2 (Visão Diária e Execução)**: Foco no "Hoje", deep-links para revisões, início de sessões a partir do planejado.

## 2. Decisões de Produto (A aprovar pelo operador)

| Item | Recomendação | Justificativa |
|---|---|---|
| **1. Leitura x Planejamento** | **Introduzir entradas planejadas** (novo dado). | Uma agenda que não permite planejar o futuro é apenas um log; o valor está na organização antecipada. |
| **2. Modelo da Entrada** | **Mínimo viável**: título, data, vínculo opcional (aula/curso), status (planejado/feito/pulado). | Evita sobrecarga de campos na v1; permite o essencial para organizar a rotina. |
| **3. Vínculo com Sessões** | **Independentes com "link de início"**. | Ao iniciar um item planejado, cria-se uma `study_sessions` real. A meta diária conta apenas a sessão real para evitar fraude/contagem dupla. |
| **4. Deep-link para Revisão** | **Sessão de revisão filtrada**. | Clicar em "N cards devidos" na agenda abre a interface de revisão (Fase 04) já carregando a fila daquele dia/fuso. |
| **5. Views** | **Mês e Dia**. | Semana cortada da v1; Mês dá o contexto macro, Dia dá a execução micro. Mobile prioriza a lista do Dia. |
| **6. Timezone** | **Sempre `profile.timezone`**. | Reuso total de `startOfDayIso` e `addCivilDays` (`src/lib/timezone.ts`). O "Hoje" de quem estuda no Japão é diferente do "Hoje" do servidor UTC. |
| **7. Integração Dashboard** | **Widget "Agenda de Hoje"**. | Substitui ou complementa o estado vazio de planejamento atual com os próximos itens da agenda. |

## 3. Modelo de Dados Proposto (Não implementado)

### Tabela `planned_studies`
- `id`: uuid primary key.
- `user_id`: uuid references auth.users (RLS).
- `title`: text (Zod: 1-100 chars).
- `scheduled_date`: date (tipo nativo SQL `date`, para queries indexadas por dia civil).
- `study_area_id`, `course_id`: uuid (opcionais, FKs).
- `estimated_minutes`: integer (CHECK 1-1440).
- `status`: text (enum: 'planned', 'completed', 'skipped') default 'planned'.
- `study_session_id`: uuid references study_sessions (opcional, vínculo pós-execução).

**RLS**: 
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` restritos a `auth.uid() = user_id`.
- Sem `anon` access.

## 4. RPCs Propostas
- Nenhuma RPC complexa necessária para o CRUD básico (RLS resolve).
- Possível RPC `start_planned_study(planned_id)` para criar a sessão e vincular em uma transação atômica server-side.

## 5. UI e Rotas
- Rota: `/app/agenda`.
- Componente de Calendário: Reaproveitar primitives do shadcn (Calendar/Popovers).
- Isolamento de Bundle: A agenda não importará o BlockNote. Chunks de calendário serão carregados sob demanda.

## 6. Riscos e Limitações
- **Automação/QA**: Dropdowns Radix e modais de calendário são difíceis de testar com cliques sintéticos. O QA dependerá de verificação visual do operador para interações complexas de UI.
- **Drift de Timezone**: Mudanças de fuso no perfil podem deslocar visualmente eventos passados se não tratados (decisão: eventos `date` são fixos no dia civil em que foram criados).

## 7. Conformidade com Restrições Inegociáveis
- **RLS**: Declarado no modelo acima.
- **service_role**: Proibido no cliente.
- **Timezone**: Uso obrigatório de `src/lib/timezone.ts`.
- **Zod**: Validação em todas as entradas de formulário.
- **IA**: Zero menção ou uso de IA.

---
*Aguardando aprovação das recomendações acima para iniciar o Gate 2 (SQL).*
