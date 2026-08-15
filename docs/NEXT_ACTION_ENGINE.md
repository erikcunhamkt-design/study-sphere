# Dominus Next Action Engine V1.1

Central de decisão estratégica que responde à pergunta: **"O que devo fazer agora?"**

## 1. Arquitetura
O motor foi implementado como um hook centralizado (`useNextBestAction`) que consome dados de memória (FSRS), sessões ativas e progresso de cursos para derivar a recomendação mais valiosa cognitivamente.

## 2. Hierarquia de Prioridades (V1.1)

| Nível | Tipo | Razão Cognitiva | Regra de Ativação |
| :--- | :--- | :--- | :--- |
| **P0** | `resume` | Continuidade: Retomar sessão interrompida. | `ended_at` IS NULL AND `updated_at` < 4h. |
| **P1** | `review` | Retenção: Recuperação ativa FSRS. | `due <= now` (Urgência baseada em volume/atraso). |
| **P2** | `reinforce` | Qualidade: Conceitos com falhas ou mismatch. | `humanState` = 'reforco' ou `hasMismatch`. |
| **P3** | `test_memory` | Transição: Consolidação pós-primeiro contato. | `totalConcepts > 0` AND `evaluatedMemories == 0`. |
| **P4** | `first_study` | Onboarding: Iniciar primeiro conteúdo. | `courses.length > 0` AND `status` = 'not_started'. |
| **P5** | `continue` | Fluxo: Cursos em andamento. | `status` = 'in_progress' sem urgência P1/P2. |
| **P6** | `explore` | Expansão: Sugerir novos conteúdos. | Todos os conteúdos em dia. |
| **P7** | `add_content` | Setup: Usuário novo sem conteúdo. | `courses.length == 0`. |
| **P8** | `all_clear` | Manutenção: Tudo em dia. | Fallback determinístico. |

## 3. Matriz de Urgência
A urgência (`urgency`) desempata ações no mesmo nível ou pode promover ações se ultrapassar limites críticos:
- **P1 (Review)**: Base 0.5 + 0.05 por conceito + 0.02 por dia de atraso. Limite: 0.95.
- **P2 (Reinforce)**: Mismatch cognitivo gera urgência 0.92 (crítico).
- **P0 (Resume)**: Sempre urgência 1.0 (máxima prioridade de fluxo).

## 4. Auditoria e Isolamento
- **Dados de Teste**: `is_test_data = true` é rigorosamente ignorado em todos os filtros.
- **Sessões Abandonadas**: Sessões com > 4h de inatividade são descartadas de `resume`.
- **Determinismo**: O motor é puramente funcional e derivado do estado atual (sem aleatoriedade).
- **Timezone**: O cálculo de `due` respeita o `profile.timezone` através do startOfDayIso.

## 5. Explicabilidade Factualmente Pura
- **Resume**: "Você parou em [Aula] há X minutos."
- **Review**: "X conceitos estão prontos para recuperação (atraso de Y dias)."
- **Reinforce**: "Detectamos uma possível falha de percepção neste conceito."
- **Test Memory**: "Você concluiu o primeiro contato, mas ainda não testou o que reteve."

## 6. Casos-Limite Validados
- **Sessão Concluída**: Nunca aparece como `resume`.
- **Sem Material**: Se o próximo passo não tem material, o motor cai para a próxima ação válida.
- **Conceito Arquivado**: Nunca é alvo de `review` ou `reinforce`.
