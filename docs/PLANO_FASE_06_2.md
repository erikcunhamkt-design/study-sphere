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
| **2. Momento do Vínculo** | **No Fim (Finalização da Sessão)**. | **OPÇÃO A escolhida.** `createStudySession` não grava nada em `planned_studies`. Apenas `finishStudySession` grava, simultaneamente: `study_session_id = <id>` E `status = 'completed'`. |
| **3. Lógica de Status** | **App-side no `onFinished`**. | As telas de método dispararão `onFinished(session)` após o sucesso real. O hook de consumo disparará o UPDATE em `planned_studies`. |
| **4. Reversão (Delete)** | **Estado "Sessão Removida"**. | Se a sessão vinculada for excluída, o app detectará `status='completed' AND study_session_id IS NULL` e exibirá um aviso no `DaySheet`, permitindo ao usuário reabrir ou limpar manualmente. |
| **5. Feedback Visual** | **Duração real (Fetch extra)**. | No `DaySheet`, itens `completed` mostrarão a duração real obtida via fetch secundário das `study_sessions` vinculadas (PostgREST simples). |

## 3. Análise Técnica

### Descoberta Técnica: Ambiguidade do onDone
A análise do código da Fase 05.2 revelou que as 5 telas de método (`pomodoro`, `feynman`, `blurting`, `cornell`, `livre`) usam um único `onDone` para conclusão com sucesso e cancelamento ("Voltar").
- **Implicação**: Não é possível marcar o plano como `completed` confiavelmente apenas com `onDone`.
- **Solução**: Separar os callbacks: `onFinished(session: StudySessionRow)` (sucesso) e `onCancel()` (voltar sem concluir).

### Atomicidade e Segurança
Não utilizaremos RPC.
- Se a escrita do plano falhar após a sessão ser concluída, o usuário usará o novo botão **"Marcar como concluído manualmente"** no `DaySheet` para reconciliar o estado. Sem esse botão, a reconciliação não teria gatilho manual.

### Arquivos Modificados
1. **MODIFICADOS**:
   - `src/features/study-sessions/blurting-session.tsx` (Callbacks)
   - `src/features/study-sessions/cornell-session.tsx` (Callbacks)
   - `src/features/study-sessions/feynman-session.tsx` (Callbacks)
   - `src/features/study-sessions/livre-session.tsx` (Callbacks)
   - `src/features/study-sessions/pomodoro-session.tsx` (Callbacks)
   - `src/features/study-sessions/api.ts` / `hooks.ts` (Ajustes de retorno/mutação se necessário)
   - `src/routes/app.estudar.tsx` (Passagem do plannedId e novos callbacks)
   - `src/features/planned-studies/day-sheet.tsx` (Feedback visual e botão de conclusão manual)

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
