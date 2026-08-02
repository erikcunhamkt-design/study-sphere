# Decisão — Provedor de IA para geração de flashcards e resumos

Data: 02/08/2026
Status: **decidido** (provedor e política de dados). Implementação continua em **Fase Futura** — o plano mestre coloca IA depois do núcleo maduro, e nenhuma linha de código de IA existe no repositório.

---

## 1. Decisão

**Google Gemini, tier gratuito**, para a geração de flashcards e resumos a partir do conteúdo do caderno.

Motivo: custo zero e capacidade suficiente para a tarefa (geração de texto estruturado a partir de texto curto). Modelos leves da família Flash cobrem o caso de uso; o modelo exato deve ser escolhido na implementação, não fixado aqui — a linha de modelos do Gemini muda com frequência.

## 2. Política de dados — o trade-off aceito conscientemente

A documentação oficial do Google distingue os tiers exatamente nisso:

| Tier | Uso dos dados |
|---|---|
| Gratuito | *"Content used to improve our products"* |
| Pago | *"Content **not** used to improve our products"* |

**O operador aceitou esse trade-off para uso pessoal**, com a justificativa de que o conteúdo processado é material de estudo derivado de fontes públicas (resumos de aulas de Marketing, História, Tecnologia) — conteúdo que já existe amplamente na internet e cujo uso para treino não representa perda real.

Essa avaliação é válida **enquanto o único usuário for o operador**.

## 3. A linha que exige revisitar esta decisão

**Se o StudyOS passar a ter outros usuários, esta decisão precisa ser reaberta antes do primeiro cadastro externo.**

O conteúdo que passa pela API deixa de ser do operador e passa a ser dos usuários. Enviar o caderno de terceiros para um tier que treina com os dados é uma decisão que não cabe ao operador tomar por eles — exigiria, no mínimo, consentimento explícito e informado, e provavelmente a migração para o tier pago (que não treina).

Gatilho concreto: **antes de liberar cadastro para qualquer pessoa além do operador.**

## 4. Restrições técnicas (independentes do provedor)

Valem para qualquer provedor de IA que venha a ser usado:

1. **A chave de API nunca pode chegar ao cliente.** Mesma regra do `service_role` estabelecida na Fase 01 e auditada desde então. A chamada precisa sair de uma Edge Function do Supabase ou de um server route do TanStack Start. Chave em bundle de navegador é vazamento permanente e irreversível.
2. **Veto aos pacotes `@blocknote/xl-*`.** São GPL-3.0 (auditoria da Fase 03.0, §2), incompatíveis com uso comercial fechado. A IA no editor, se existir, é implementação própria chamando a API diretamente — nunca esses pacotes. A Fase 03.2 adicionou um teste automatizado (`schema.test.ts`) que falha se qualquer bloco de coluna do `xl-*` entrar no schema; o mesmo princípio de veto se aplica aos pacotes de IA.
3. **Nada gerado por IA entra na coleção do usuário sem revisão.** Coerente com o princípio de honestidade de dados do plano mestre: a IA propõe flashcards/resumos, o usuário aprova. Sem geração silenciosa direto para `flashcards`.

## 5. Contexto de custo (para referência futura)

Levantado em 02/08/2026, caso a decisão precise ser revisitada por qualidade ou limite de uso:

| Opção | Custo estimado (100 aulas) | Treina com os dados |
|---|---|---|
| Gemini free tier | US$ 0 | **Sim** |
| Gemini pago (Flash) | centavos | Não |
| Claude Haiku 4.5 ($1/$5 por MTok) | ~US$ 0,70 | Não |
| Claude Sonnet 5 ($3/$15 por MTok) | ~US$ 2,00 | Não |

Estimativa por aula: ~2.500 tokens de entrada (caderno + instruções), ~800 de saída (10 flashcards).

A diferença de custo entre gratuito e pago é desprezível no volume pessoal — a migração para o tier pago, se necessária, não é uma decisão de custo, é de política de dados ou de limite operacional.

## 6. Limitações operacionais conhecidas do free tier

- **Limites de requisição não são publicados** na documentação; o Google direciona ao painel do AI Studio, e eles variam por projeto. Não dá para planejar capacidade em cima disso.
- **Sem SLA.** Um recurso que falha de forma imprevisível é pior, em produto, que um recurso ausente — a UI precisa degradar com clareza (mensagem explícita, nunca um flashcard vazio ou um resumo truncado apresentado como completo).
- Modelos mais capazes não estão disponíveis no tier gratuito.

Se qualquer um desses pontos atrapalhar na prática, a migração para o tier pago é de baixo custo e não exige mudança de arquitetura.
