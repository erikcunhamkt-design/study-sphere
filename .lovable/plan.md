# Plano de Implementação: Sessão de Revisão Real (V1)

Implementação do fluxo completo da sessão de revisão ativada pelo botão "Testar Memória", garantindo foco cognitivo, recuperação ativa e integração FSRS.

## 1. Seleção e Ordenação de Conceitos
- Criar a regra de ordenação na query de conceitos devidos (`due <= now`).
- Prioridade: 1. Atraso (mais antigo primeiro), 2. Dificuldade (maior primeiro).
- Garantir que cada conceito seja revisado apenas uma vez por ciclo, independentemente do formato.

## 2. Persistência e Sessão
- Criar sessão com `method = 'recuperacao'`.
- Garantir retomada: se uma sessão `recuperacao` estiver aberta, usá-la em vez de criar uma nova.
- Implementar proteção contra duplicidade (idempotência) no registro de evidências.

## 3. Interface de Foco Cognitivo
- Refatorar `ReviewSession.tsx` para o design minimalista aprovado.
- Estrutura: Título (Nome do Conceito) -> Progresso -> Pergunta -> Campo de Resposta.
- Ocultar material, notas e respostas esperadas durante a tentativa.
- Implementar transição automática para o próximo conceito após autoavaliação.

## 4. Fluxo de Recuperação e Avaliação
- Priorizar `discursiva` (resposta livre) se disponível.
- Revelação: Mostrar "Sua Resposta" vs "Resposta Esperada".
- Escala de Autoavaliação: 1-4 (Não sabia, Dificuldade, Lembrei, Facilidade).
- Registro de `cognitive_evidence` e chamada imediata do motor FSRS.

## 5. Conclusão e Próxima Ação
- Tela de resumo factual: Quantidade de conceitos por nível de lembrança e confiança média.
- Recomendações baseadas em dados reais: "Continuar estudando", "Reforçar conceitos" ou "Tudo em dia".
- Garantir atualização da Home após conclusão.

## Detalhes Técnicos
- Arquivo principal: `src/features/study-sessions/components/review/ReviewSession.tsx`.
- Hook de estado semântico: `src/features/study-sessions/hooks.semantic.ts`.
- API de evidências: `src/features/study-sessions/api.evidence.ts`.
- Proteção de idempotência via estado local `isSubmitting` no componente.
- Lógica de ordenação estritamente baseada em campos de `memory_states`.
