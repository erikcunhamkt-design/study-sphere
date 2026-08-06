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
| **2. Momento do Vínculo** | **No Início (Criação da Sessão)**. | Gravar o `study_session_id` no `planned_studies` logo no `createStudySession`. Isso permite que, se o usuário fechar o browser, o vínculo já exista. |
| **3. Lógica de Status** | **App-side no `finishStudySession`**. | O hook `useFinishStudySession` será estendido para disparar um segundo UPDATE em `planned_studies` (status='completed') apenas se houver um `plannedId`. |
| **4. Reversão (Delete)** | **Status volta para `planned`**. | Se a sessão vinculada for excluída, o `study_session_id` no planejamento ficará NULL (via FK `ON DELETE SET NULL`). O app deve detectar isso e oferecer/fazer o reset do status para evitar "concluídos órfãos". |
| **5. Feedback Visual** | **Duração real + Ícone de link**. | No `DaySheet`, itens `completed` mostrarão a duração real da sessão vinculada (join simples) e um link para rever os detalhes daquela sessão. |

## 3. Fluxo de Execução (Diagrama)

```text
Agenda (DaySheet) 
  -- [Clique "Estudar"] --> 
    Navigate("/app/estudar?plannedId=123")

Tela de Métodos
  -- [Escolhe Pomodoro/Livre/etc] -->
    Mutation: createStudySession(plannedId: "123")
      1. INSERT study_sessions (id: "abc")
      2. UPDATE planned_studies SET study_session_id = "abc" WHERE id = "123"
      (Status continua 'planned')

Sessão Ativa
  -- [Timer rodando...] -->
  -- [Clique "Concluir"] -->
    Mutation: finishStudySession("abc")
      1. UPDATE study_sessions SET ended_at = now() WHERE id = "abc"
      2. UPDATE planned_studies SET status = 'completed' WHERE id = "123"
      (Status vira 'completed')
```

## 4. Análise Técnica e Invariantes

### Atomicidade (Decisão 3)
Não utilizaremos RPC. Embora duas escritas no cliente não sejam atômicas, o risco é aceitável:
- Se a escrita da sessão falhar, o app nem tenta marcar o plano.
- Se a escrita da sessão funcionar mas a do plano falhar (ex.: queda de rede), a sessão real existe e o usuário pode marcar "Concluído" manualmente depois ou o app pode sugerir a reconciliação ao detectar um vínculo sem status condizente.
- Manter a lógica no cliente evita reabrir as discussões de segurança/complexidade de RPC do Gate 2 da 06.1.

### Reversão e Integridade (Decisão 4)
A migration 06.1 já garante integridade referencial: `ON DELETE SET NULL`. 
- **Decisão**: Se a sessão sumir, o status `completed` deve ser tratado como inconsistente. Recomendamos que o hook de busca (`usePlannedStudiesInRange`) ou a UI do `DaySheet` trate isso: se `status === 'completed'` mas `study_session_id === null`, exibe um aviso ou reseta para `planned`.

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
