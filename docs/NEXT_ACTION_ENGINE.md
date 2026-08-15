# Dominus Next Action Engine

Central de decisão estratégica que responde à pergunta: **"O que devo fazer agora?"**

## 1. Arquitetura
O motor foi implementado como um hook centralizado (`useNextBestAction`) que consome dados de memória (FSRS), sessões ativas e progresso de cursos para derivar a recomendação mais valiosa cognitivamente.

## 2. Hierarquia de Prioridades (Conservadora)

| Nível | Tipo | Razão Cognitiva |
| :--- | :--- | :--- |
| **P0** | `resume` | Continuidade: Retomar sessão interrompida recentemente (< 4h). |
| **P1** | `review` | Retenção: FSRS sinaliza conceitos prontos para recuperação. |
| **P2** | `reinforce` | Qualidade: Conceitos com falhas recentes ou desalinhamento metacognitivo. |
| **P3** | `test_memory` | Transição: Sessões concluídas mas sem recuperação inicial realizada. |
| **P4** | `first_study` | Onboarding: Usuário com conteúdo mas sem histórico. |
| **P5** | `continue` | Fluxo: Cursos em andamento sem urgência de memória. |
| **P6** | `explore` | Expansão: Tudo em dia, sugerir novos conteúdos. |
| **P7** | `add_content` | Setup: Usuário novo sem conteúdo cadastrado. |

## 3. Lógica de Urgência
A urgência (`urgency`) é um score de 0 a 1 que desempatar ações no mesmo nível de prioridade.
- `review`: Cresce conforme o número de conceitos `due`.
- `resume`: Decai conforme o tempo de inatividade aumenta.
- `reinforce`: Baseado no risco de perda de estabilidade do conceito.

## 4. Integrações
- **FSRS**: Consome `due` e `stability` via Dashboard de Desempenho.
- **Domain Model**: Identifica áreas `EM DESENVOLVIMENTO` para reforço.
- **Home/Estudar**: Unificados sob o mesmo motor para garantir consistência absoluta.

## 5. Explicabilidade
Cada recomendação acompanha uma `reason` factual:
- "Você parou em [Aula] há 18 minutos."
- "4 conceitos estão prontos para recuperação."
- "Este conceito teve dificuldades nas últimas recuperações."

## 6. Casos-Limite
- **Dados de Teste**: `is_test_data = true` é rigorosamente ignorado.
- **Sessões Abandonadas**: Sessões com > 4h de inatividade não são sugeridas para retomada.
- **Determinismo**: Dado o mesmo estado, a recomendação é idêntica (sem aleatoriedade).
