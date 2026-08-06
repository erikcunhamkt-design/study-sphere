# Plano Fase 06.2 — Vínculo sessão↔planejamento e ciclo de vida do status

Data: 06/08/2026
Status: **Aguardando aprovação do operador** (Gate 1 - 06.2)

## 1. Escopo e Objetivos
Conectar os estudos planejados (Fase 06.1) às sessões de estudo reais (Fase 05.2). O objetivo é fechar o ciclo de vida do planejamento, garantindo que o status `completed` reflita a execução de uma sessão finalizada.

### Dentro de Escopo
- Mecanismo de transporte do `planned_study_id` para a tela de estudo.
- Gravação do vínculo `study_session_id` no registro de planejamento.
- Atualização automática do status para `completed` ao finalizar a sessão.
- Alterações cirúrgicas nas 5 telas de método (separação de callbacks `onFinished` vs `onCancel`).
- Botão "Marcar como concluído manualmente" no `DaySheet` como rede de segurança.
- Feedback visual na agenda para itens concluídos com sessão vinculada.

### Fora de Escopo
- Múltiplas sessões vinculadas a um único planejamento (relação 1:1 nesta fase).
- Reescrita completa das telas de sessão (apenas ajuste de assinaturas de callback).
- Métricas de aderência ou relatórios (fases futuras).
- Recorrência de planejamentos.

## 2. Decisões de Produto e Recomendações

| Item | Recomendação | Justificativa |
|---|---|---|
| **1. Transporte do ID** | **Query param na navegação** (`/app/estudar?plannedId=<uuid>`). | É a opção mais simples, resiliente a reloads e que não altera o contrato das rotas existentes. |
| **2. Momento do Vínculo** | **App-side no onSuccess do useFinishStudySession** (via parâmetro plannedId). | Decisão central (Opção A) escolhida: o vínculo ocorre apenas quando a sessão é finalizada com sucesso. |
| **3. Lógica de Status** | **App-side no `onFinished`**. | As telas de método dispararão `onFinished(session)` após o sucesso real. O hook de consumo disparará o UPDATE em `planned_studies`. |
| **4. Reversão (Delete)** | **Estado "Sessão Removida"**. | Se a sessão vinculada for excluída, o app detectará `status='completed' AND study_session_id IS NULL` e exibirá um aviso no `DaySheet`, permitindo ao usuário reabrir ou limpar manualmente. |
| **5. Feedback Visual** | **Duração real (Fetch extra)**. | No `DaySheet`, itens `completed` mostrarão a duração real obtida via fetch secundário das `study_sessions` vinculadas (PostgREST simples). |

## 3. Análise Técnica

### Abordagem de Implementação (vínculo no hook, não em callbacks)
  A ambiguidade do `onDone` (usado tanto para concluir quanto para cancelar) NÃO é
  resolvida reescrevendo callbacks. Em vez disso, o vínculo do planejamento ocorre
  dentro do hook `useFinishStudySession`, no seu `onSuccess` — que por definição só
  dispara quando a sessão é finalizada com sucesso. O hook recebe um parâmetro
  opcional `plannedId`; havendo-o, após finalizar a sessão ele faz o UPDATE em
  `planned_studies` (study_session_id + status='completed'). Cancelar ("Sair sem
  finalizar") chama `onDone()` sem passar pelo finish, logo nunca vincula. As 5 telas
  de método são tocadas apenas para RECEBER e REPASSAR um `plannedId` opcional — sem
  mudança de assinatura de callback, sem reescrita. A ambiguidade pré-existente do
  `onDone` fica registrada como dívida técnica menor (não causa bug com esta
  abordagem) e pode ser tratada em fase futura.

### Atomicidade e Segurança
Não utilizaremos RPC.
- Se a escrita do plano falhar após a sessão ser concluída, o usuário usará o novo botão **"Marcar como concluído manualmente"** no `DaySheet` para reconciliar o estado. Sem esse botão, a reconciliação não teria gatilho manual.

### Arquivos Modificados
1. **MODIFICADOS**:
   - `src/features/study-sessions/blurting-session.tsx` (recebe e repassa plannedId, sem mudar callbacks)
   - `src/features/study-sessions/cornell-session.tsx` (recebe e repassa plannedId, sem mudar callbacks)
   - `src/features/study-sessions/feynman-session.tsx` (recebe e repassa plannedId, sem mudar callbacks)
   - `src/features/study-sessions/livre-session.tsx` (recebe e repassa plannedId, sem mudar callbacks)
   - `src/features/study-sessions/pomodoro-session.tsx` (recebe e repassa plannedId, sem mudar callbacks)
   - `src/features/study-sessions/api.ts` / `hooks.ts`
   - `src/routes/app.estudar.tsx` 
   - `src/features/planned-studies/day-sheet.tsx`

2. **NOVOS**:
   - Nenhum de schema.

## 4. Invariantes e Restrições
- **Sem Migration**: A coluna `study_session_id` e as constraints necessárias já foram aplicadas na Fase 06.1.
- **Timezone**: Respeitado via fuso do perfil.
- **Invariante Central**: `study_session_id != null ⟺ status = 'completed'` (exceto no caso de deleção da sessão, tratado na Decisão 4).

## 5. Declaração de Conformidade
- **RLS**: Mantido.
- **service_role**: Proibido.
- **IA**: Zero.

---
Nada da 06.2 foi implementado; aguardando aprovação deste plano revisado.
