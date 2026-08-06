# Plano Fase 06.2 — Vínculo sessão↔planejamento e ciclo de vida do status

Data: 06/08/2026
Status: **Aguardando aprovação do operador** (Gate 1 - 06.2)

## 1. Escopo e Objetivos
Conectar os estudos planejados (Fase 06.1) às sessões de estudo reais (Fase 05.2). O objetivo é fechar o ciclo de vida do planejamento, garantindo que o status `completed` reflita a execução de uma sessão finalizada.

### Dentro de Escopo
- Mecanismo de transporte do `planned_study_id` para a tela de estudo.
- Gravação do vínculo `study_session_id` no registro de planejamento.
- Atualização automática do status para `completed` ao finalizar a sessão.
- Feedback visual mínimo na agenda para itens concluídos com sessão vinculada.

### Fora de Escopo
- Múltiplas sessões vinculadas a um único planejamento (relação 1:1 nesta fase).
- Mudanças profundas na UI de sessões da Fase 05.2.
- Métricas de aderência ou relatórios (fases futuras).
- Recorrência de planejamentos.

## 2. Decisões de Produto e Recomendações

| Item | Recomendação | Justificativa |
|---|---|---|
| **1. Transporte do ID** | **Query param na navegação** (`/app/estudar?plannedId=<uuid>`). | É a opção mais simples, resiliente a reloads e que não altera o contrato das rotas existentes. |
| **2. Momento do Vínculo** | **No Fim (Finalização da Sessão)**. | **OPÇÃO A escolhida.** `createStudySession` não grava nada em `planned_studies`. Apenas `finishStudySession` grava, simultaneamente: `study_session_id = <id>` E `status = 'completed'`. |
| **3. Lógica de Status** | **App-side no `finishStudySession`**. | O hook `useFinishStudySession` será estendido para disparar um UPDATE em `planned_studies` (status='completed', study_session_id='abc') apenas ao concluir a sessão real. |
| **4. Reversão (Delete)** | **Estado "Sessão Removida"**. | Se a sessão vinculada for excluída, o `study_session_id` no planejamento ficará NULL (via FK `ON DELETE SET NULL`). O app detectará `status='completed' AND study_session_id IS NULL` e exibirá um aviso no `DaySheet`, permitindo ao usuário reabrir (resetar para `planned`) ou limpar manualmente. Sem resets automáticos silenciosos. |
| **5. Feedback Visual** | **Duração real (Fetch extra)**. | No `DaySheet`, itens `completed` mostrarão a duração real da sessão vinculada. A duração é obtida via um segundo fetch das `study_sessions` filtradas pelos IDs vinculados no range atual (padrão PostgREST), sem joins SQL complexos. |

## 3. Fluxo de Execução (Diagrama)

```text
Agenda (DaySheet) 
  -- [Clique "Iniciar"] --> 
    Navigate("/app/estudar?plannedId=123")

Tela de Métodos
  -- [Escolhe Pomodoro/Livre/etc] -->
    Mutation: createStudySession(plannedId: "123")
      1. INSERT study_sessions (id: "abc")
      (Nenhuma alteração em planned_studies aqui)

Sessão Ativa
  -- [Timer rodando...] -->
  -- [Clique "Concluir"] -->
    Mutation: finishStudySession("abc")
      1. UPDATE study_sessions SET ended_at = now() WHERE id = "abc"
      2. UPDATE planned_studies SET 
           study_session_id = "abc",
           status = 'completed' 
         WHERE id = "123"
      (Invariante: study_session_id != null ⟺ status = 'completed')
```

## 4. Análise Técnica e Invariantes

### Atomicidade (Decisão 3)
Não utilizaremos RPC. Embora duas escritas no cliente não sejam atômicas, o risco é aceitável:
- Se a escrita da sessão falhar, o app nem tenta marcar o plano.
- Se a escrita da sessão funcionar mas a do plano falhar (ex.: queda de rede), a sessão real existe e o usuário pode marcar "Concluído" manualmente depois ou o app pode sugerir a reconciliação ao detectar um vínculo sem status condizente.
- Manter a lógica no cliente evita reabrir as discussões de segurança/complexidade de RPC do Gate 2 da 06.1.

### Reversão e Integridade (Decisão 4)
A migration 06.1 já garante integridade referencial: `ON DELETE SET NULL`. 
- **Decisão**: Se a sessão vinculada for excluída, o app detectará a inconsistência (`status === 'completed'` mas `study_session_id === null`). Em vez de reset automático, a UI do `DaySheet` exibirá um aviso visual informando que a sessão foi removida, oferecendo botões explícitos para o usuário "Limpar vínculo" (voltar para `planned`) ou manter como concluído manualmente. Isso evita escritas silenciosas disparadas por leituras.

### Restrições Inegociáveis
- **Sem RPC**: Respeitado. Usaremos `UPDATE` via RLS.
- **Sessões Reais**: Respeitado. O vínculo só ocorre se uma `study_session` for legitimamente criada pelo fluxo da 05.2.
- **Timezone**: Respeitado. O `DaySheet` já usa `dateLabel` e `scheduled_date` (YYYY-MM-DD), mantendo a integridade do dia civil do usuário.
- **Isolamento de Bundle**: Respeitado. Nenhuma dependência pesada será adicionada.
- **Zod**: Utilizaremos `z.string().uuid().optional()` para o `plannedId` nos novos inputs de mutation.
- **IA**: Zero uso de IA.

## 5. Declaração de Conformidade
- **RLS**: Todas as operações de vínculo respeitam `auth.uid() = user_id`.
- **service_role**: Proibido e não utilizado.
- **Próximo Passo**: Aguardar validação da Fase 06.1 em QA (Gate 4) e aprovação deste plano pelo operador para iniciar o Gate 2 (SQL/Código) da 06.2.

---
Nada da 06.2 foi implementado; aguardando QA da 06.1 e aprovação deste plano.
