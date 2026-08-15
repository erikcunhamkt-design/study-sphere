# Plano de Correção: Bug de Inicialização da Sessão de Aprendizagem

O objetivo deste plano é corrigir a falha funcional na criação de sessões de estudo (erro "Não foi possível iniciar a sessão") e garantir que o fluxo de "Aprender Primeiro" funcione de ponta a ponta sem telas desnecessárias.

## Investigação e Causa Raiz

Com base na auditoria do código e do banco de dados:
1.  **Causa Provável do Erro**: O `LivreSession` tenta persistir no campo `details` um objeto contendo `courseId`. No entanto, o `createStudySession` na API utiliza o helper `initialDetailsForMethod(method)`, que para os métodos `livre` e `aprender` retorna um objeto vazio `{}`. Se houver alguma validação de schema (Zod ou banco) que não preveja campos extras ou se o payload estiver sendo malformado durante o `mutateAsync`, a inserção falha.
2.  **Incompatibilidade de Contexto**: A implementação anterior de "refinamento" adicionou lógica no `useEffect` para carregar a primeira aula automaticamente, mas o acionamento do `handleStart` pode estar ocorrendo com um `lessonId` ainda nulo ou indefinido antes do estado ser estabilizado, causando erros de constraint no Supabase se `lesson_id` for obrigatório em certos contextos (embora seja `nullable` no schema, o `isFreeSession` depende dele).
3.  **Fluxo Interrompido**: O botão "Começar a aprender" na tela intermediária aciona `handleStart`, que por sua vez falha silenciosamente no log do usuário, exibindo apenas o Toast de erro genérico.

## Ações Propostas

### 1. Robustez na Criação da Sessão (`LivreSession.tsx`)
- Adicionar logs de depuração detalhados no `catch` de `handleStart` (apenas em ambiente de desenvolvimento/preview).
- Garantir que `handleStart` só seja chamado quando o `lessonId` estiver resolvido (para cursos com aulas) ou explicitamente como sessão livre (para cursos sem aulas).
- Refinar a lógica de `useEffect` para evitar chamadas duplas ou prematuras ao `handleStart`.

### 2. Correção do Payload de Detalhes
- Atualizar `initialDetailsForMethod` em `schema.ts` para aceitar opcionalmente o `courseId` ou garantir que o merge de objetos não viole as expectativas da API.
- Garantir que `isFreeSession` seja enviado corretamente como `true` apenas quando não houver `lessonId`.

### 3. Eliminação da Tela Intermediária
- Ajustar a lógica de renderização condicional: se o componente receber `initialLessonId` ou `courseId` e conseguir resolver a aula inicial, ele deve entrar direto no estado "Optimistic Start" e ocultar a UI de seleção.

### 4. Validação do Vínculo de Conteúdo
- Certificar que o `lessonId` selecionado pertence ao `courseId` informado através de uma verificação simples antes do `INSERT`.

## Detalhes Técnicos

- **Arquivo**: `src/features/study-sessions/livre-session.tsx`
- **Função**: `handleStart` e os `useEffect` de inicialização automática.
- **Payload**:
  ```typescript
  {
    method: "aprender",
    lessonId: "uuid-da-primeira-aula",
    isFreeSession: false,
    details: { courseId: "uuid-do-curso" }
  }
  ```
- **Verificação de Sucesso**: Criação de linha na tabela `study_sessions` vinculada corretamente ao `lesson_id` de 'asdad' (ID: `1ad7812b-...`) e `course_id` de 'sdfsd' (ID: `e5ac6532-...`).

## Critérios de Aceite
- Ao clicar em "Começar" no cockpit "Dominus Recomenda", o usuário deve ser levado diretamente para a interface de notas.
- A sessão deve ser persistida no banco com os IDs reais.
- O cronômetro deve iniciar do zero e o contexto (Curso/Aula) deve ser exibido corretamente.
- Sair e voltar deve mostrar o botão "Continuar" (retomada funcional).
