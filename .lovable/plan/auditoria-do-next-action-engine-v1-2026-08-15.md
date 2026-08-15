# Auditoria do Next Action Engine V1

Auditoria técnica e comportamental do motor de decisão estratégica do DominusApp para validar a transição para a versão 1.1.

## Objetivos
1. Validar a hierarquia de prioridades P0-P8.
2. Garantir determinismo e explicabilidade das ações recomendadas.
3. Verificar a integridade do isolamento de dados de teste/auditoria.
4. Otimizar a lógica de retomada (P0) e urgência de revisão (P1).

## Tarefas Técnicas

### 1. Refinamento de P0 (Retomada)
- **Local:** `src/features/next-action/hooks/use-next-best-action.ts`
- **Ajuste:** Garantir que sessões concluídas (`ended_at IS NOT NULL`) sejam rigorosamente excluídas de `resume`.
- **Ajuste:** Validar que o timestamp `updated_at` é usado corretamente para o cálculo de inatividade (limite de 4h).
- **Ajuste:** Adicionar verificação de `method !== 'aprender'` para `resume` se não houver material (fallback cognitivo).

### 2. Calibração de P1 (Revisão) vs P2 (Reforço)
- **Local:** `src/features/next-action/hooks/use-next-best-action.ts`
- **Ajuste:** Implementar score de urgência dinâmico para P1 baseado no atraso FSRS (`due` vs `now`).
- **Ajuste:** Definir que `review` (P1) sempre vence `reinforce` (P2) a menos que a urgência de reforço por discrepância metacognitiva seja crítica (> 0.9).

### 3. Melhoria na Explicabilidade (Razões Factuais)
- **Local:** `src/features/next-action/utils/engine-utils.ts`
- **Ajuste:** Tornar as razões mais específicas (ex: "X conceitos estão atrasados há mais de 3 dias").
- **Ajuste:** Remover qualquer linguagem genérica ou motivacional; manter foco em dados.

### 4. Filtro Rigoroso de Dados
- **Local:** `src/features/next-action/hooks/use-next-best-action.ts`
- **Ajuste:** Aplicar `isProductionEligible` em todos os níveis do motor (cursos, aulas, sessões, conceitos).
- **Ajuste:** Garantir que o `PerformanceDashboard` (consumido pelo motor) também ignore `is_test_data`.

### 5. Documentação V1.1
- **Local:** `docs/NEXT_ACTION_ENGINE.md`
- **Ações:** Atualizar a matriz de decisão com os novos scores de urgência e casos-limite validados.

## Critérios de Aceite
- [ ] Ação `resume` nunca aponta para sessão finalizada.
- [ ] Usuário sem conteúdo recebe `add_content` como ação primária.
- [ ] Revisão devida aparece como P1 com contagem exata.
- [ ] Dados de auditoria (Course/Lesson de teste) não aparecem na Home ou Estudar.
- [ ] Timezone é respeitado no cálculo de `due`.
