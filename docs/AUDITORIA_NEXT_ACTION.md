
# Next Action Engine V1 — Auditoria de Testes Realizados

Para garantir o determinismo e a precisão do motor de decisão, foram realizados os seguintes testes lógicos (unitários e de integração manual):

## 1. Casos de Sucesso (Caminho Feliz)
- **TESTE A (Retomada):** Criada sessão há 10 minutos. 
  - *Resultado:* Primary = `resume`, Priority = 0.
- **TESTE B (Revisão):** 5 conceitos due no FSRS. 
  - *Resultado:* Primary = `review`, Priority = 1.
- **TESTE C (Reforço):** Conceito estável mas com `hasMismatch = true`.
  - *Resultado:* Primary = `reinforce`, Priority = 2.
- **TESTE D (Transição):** Usuário com 10 conceitos em reps=0.
  - *Resultado:* Primary = `test_memory`, Priority = 3.
- **TESTE E (Usuário Novo):** Cadastro limpo com 1 curso.
  - *Resultado:* Primary = `first_study`, Priority = 4.
- **TESTE F (Vazio):** Cadastro limpo sem cursos.
  - *Resultado:* Primary = `add_content`, Priority = 7.

## 2. Casos de Conflito (Prioridade)
- **Sessão vs Revisão:** Sessão ativa recente (1h) vs 10 revisões devidas.
  - *Resultado:* `resume` vence por continuidade cognitiva (P0).
- **Sessão Abandonada:** Sessão ativa com última atualização há 5 horas.
  - *Resultado:* `resume` é ignorada, motor pula para `review`.
- **Revisão vs Estudo:** Revisão devida vs Curso em andamento.
  - *Resultado:* `review` vence para evitar o acúmulo de débito de memória (P1 > P5).

## 3. Casos-Limite e Integridade
- **is_test_data:** Inseridos dados com flag de teste.
  - *Resultado:* Motor retornou `add_content`, ignorando completamente os dados de teste.
- **Sessão Concluída:** Sessão com `ended_at` presente.
  - *Resultado:* Motor ignorou a sessão para retomada.
- **Consistência Home/Estudar:** Verificado se ambos os componentes recebem a mesma `primaryAction`.
  - *Resultado:* Identidade absoluta de dados via cache do TanStack Query.

## 4. Auditoria Cognitiva
- **Explicabilidade:** Validado se as strings de `reason` são honestas.
  - *Correto:* "Você parou em [Título] há X minutos" em vez de "Volte a estudar agora".
- **Metacognição:** Validado se o reforço (P2) é acionado por desalinhamento metacognitivo.
  - *Correto:* Conceitos com confiança alta e resultado baixo geram recomendação de reforço.

**CONCLUSÃO: MOTOR V1 ESTÁVEL E DETERMINÍSTICO.**
