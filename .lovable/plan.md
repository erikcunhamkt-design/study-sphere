# Plano: Baralhos 1.3 — Estudar baralho no Estudar (Arquitetura Praticar vs. Gerenciar)

Este plano detalha a migração da porta de entrada de estudo de baralhos para a seção "Estudar", consolidando a Biblioteca como um acervo puramente de gestão.

## 1. Conceito e Arquitetura
A separação de responsabilidades (Fase 08) dita que:
- **Biblioteca**: Gestão passiva (organizar, criar, editar, visualizar acervo).
- **Estudar**: Ação ativa (praticar, revisar, treinar).

Os baralhos, embora organizados na Biblioteca, são instrumentos de estudo e sua execução deve residir no módulo de Recordação Ativa.

## 2. Mudanças no RecordacaoAtivaHub (/app/estudar)
O motor de execução (`ReviewSession` com `deckId`) já está pronto. O trabalho aqui é a interface de seleção no Hub.

- **Nova View "hub"**:
  - Abaixo das opções "Revisar Flashcards" (geral) e "Responder Questões", adicionar uma nova seção: **"Estudar por Baralho"**.
  - Esta seção listará os baralhos ativos (usando `useDecks`).
  - Cada item de baralho exibirá: `Nome do Baralho` + `N devidos / M total`.
- **Fluxo de Navegação**:
  1. Usuário clica em um Baralho na lista do Hub.
  2. O Hub transiciona para uma sub-view de **Seleção de Modo** (ou abre um pequeno menu contextual/dropdown):
     - **Revisar devidos**: Inicia `ReviewSession` com `deckId` e `mode=review`.
     - **Modo Treino**: Inicia `ReviewSession` com `deckId` e `mode=training` (isTrainingMode=true).
- **Consistência**: O Hub gerenciará o estado local de qual baralho foi selecionado antes de disparar a sessão.

## 3. Limpeza na Biblioteca (/app/biblioteca/baralho/$deckId)
A tela de detalhes do baralho será simplificada para focar em gestão.

- **Remoção**: Retirar os botões "Treinar" e "Revisar" que hoje ocupam o topo da tela.
- **Substituição**: Adicionar um link/botão secundário e discreto: *"Ir para Estudar"* ou *"Praticar este baralho"*.
  - Este link apenas fará um `router.navigate({ to: '/app/estudar', search: { deckId: id, mode: 'review' } })`.
  - A ação real de estudo não acontece na rota da Biblioteca, mantendo a integridade da arquitetura.

## 4. Detalhes Técnicos
- **Hooks**: Reuso de `useDecks`, `useFlashcardsByDeck` (para contagem total) e `useDueFlashcardsByDeck` (para contagem de revisões).
- **Status**: O modo treino continuará sem invocar a RPC de SM-2, garantindo que o progresso de agendamento não seja afetado.
- **Responsividade**: A lista de baralhos no Hub deve ser otimizada para toque (mobile) e visualização em Bento Grid (desktop).

## 5. Resumo da Conformidade
- Sem novas tabelas ou migrations.
- Sem novas dependências.
- Respeito absoluto ao SM-2 (não grava no treino).
- Alinhamento total com a diretriz "Praticar vs Gerenciar".

---
*Aguardando aprovação para iniciar a implementação.*
