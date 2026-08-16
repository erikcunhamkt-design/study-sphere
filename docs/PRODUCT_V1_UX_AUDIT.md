# DOMINUS V1 — AUDITORIA REAL DE PRODUTO E UX

Data: 16/08/2026. Método: percurso real no app (desktop 1280px e mobile 390px), com conta que já possui conteúdo, sessões e histórico.
Escopo: experiência. **Nenhuma solução foi implementada** — exceto uma correção de P0 de tela em branco (abaixo), que era pré-requisito para conseguir auditar.

---

## 0. Correção pontual já aplicada (P0 de bloqueio)

`src/routes/index.tsx` chamava `React.useState` dentro de um ternário (`import.meta.env.SSR ? [...] : useState`). Isso viola as regras de hooks e produz ordem de hooks diferente entre servidor e cliente — origem do tipo de erro de runtime com tela branca na landing. Substituído por `useState` incondicional. Sem mudança visual.

---

## 1. Jornada percorrida

```text
landing → login → Início → Estudar → Meus estudos → Biblioteca → Revisar → Desempenho → Planejamento → Configurações
```

Perfis simulados: **A** (nunca viu), **B** (estudou uma vez), **C** (com memória/revisões), **D** (mobile).

---

## 2. Matriz de problemas

| # | Área | Problema | Sev. | Evidência | Recomendação |
|---|---|---|---:|---|---|
| 1 | Estudar | **Tela Estudar renderiza vazia**: só título e subtítulo, nada abaixo | **P0** | `/app/estudar` em conta com 13 áreas, 1 curso, 3 flashcards: página em branco de 1.600px | O hero tem `: null` no fim da cadeia de ternários (linha ~295) e as seções 3/4 dependem de `in_progress`. Estados como "tudo em dia"/sem curso ativo caem no vazio. Garantir um bloco terminal sempre renderizado |
| 2 | Home | **Onboarding aparece para usuário veterano**: "BEM-VINDO AO DOMINUS / Comece pelo seu primeiro estudo" acima da saudação, para quem já tem sessões e planejamentos concluídos | **P1** | `/app` desktop e mobile | O gate depende de `onboarding_state` no perfil, que ficou desatualizado em relação à atividade real. Derivar também de "existe sessão concluída" |
| 3 | Home / Meus estudos | **Dados de auditoria visíveis ao usuário**: "Audit Area 1786820455866", "Audit 1786820522059" ocupam o Mapa de Domínio e o catálogo | **P1** | `/app`, `/app/meus-estudos` | Não filtrar visualmente: essas áreas não estão marcadas como `is_test_data`. Ou marcá-las, ou permitir exclusão em massa de áreas vazias |
| 4 | Home | **Mapa de Domínio dominado por ruído**: 13 áreas, quase todas "AINDA NÃO AVALIADO 0/0" | P1 | `/app` | Mostrar apenas áreas com conteúdo; "0/0" não informa nada |
| 5 | Estudar vs Revisar | Distinção depende de o usuário ler o subtítulo; ambos os cards levam a "TESTAR MEMÓRIA" | P1 | `/app/estudar`, `/app/revisar`, `/app/desempenho` | Copy fixa e curta em cada topo: Estudar = conhecimento novo; Revisar = recuperar o que já estudou |
| 6 | Desempenho | Título "ANÁLISE COGNITIVA" + subtítulo de 3 linhas antes de qualquer informação | P2 | `/app/desempenho` | Encurtar para uma linha; a explicação longa só ajuda na primeira visita |
| 7 | Revisar/Desempenho | Três telas oferecem o mesmo CTA "TESTAR MEMÓRIA" sem dizer o que virá | P2 | Início, Revisar, Desempenho | Nomear o objeto: "Testar memória (1 aula)" |
| 8 | Planejamento | Resumo do dia "0/1", "1/1 · 27 min" sem legenda | P2 | `/app/planejamento` | Legenda discreta "concluídos/planejados" |
| 9 | Biblioteca | Subtítulo interno: "Gestão de conteúdos avulsos (flashcards e questões não vinculados a aulas)" | P2 | `/app/biblioteca` | Linguagem humana: "Cartões e questões que não pertencem a uma aula" |
| 10 | Biblioteca | Flashcards de teste ("zsczsc", "sdfsdfsf") aparecem como conteúdo real | P2 | `/app/biblioteca` | Mesma causa do item 3 |
| 11 | Identidade | "Tudo em dia" em **verde**, fora da paleta grafite/magenta | P2 | Home, mobile | Usar magenta/foreground |
| 12 | Landing | Dois CTAs concorrentes no topo para usuário logado: "ACESSAR MEU ESPAÇO" e "RETOMAR" | P2 | `/` logado | Um CTA primário |
| 13 | Estudar | Spinner + "Organizando seus estudos..." como único feedback | P2 | `/app/estudar` | Esqueleto do layout em vez de spinner |
| 14 | Home mobile | Onboarding + saudação + progresso: primeiro estudo fica abaixo de ~700px de scroll | P1 | `m_app.png` | Um bloco de destaque por vez |
| 15 | Global | Tipografia "black" em caixa alta com tracking largo em rótulos de 9–10px | P3 | Todas | Reduzir densidade de rótulos maiúsculos |
| 16 | Domínio | "Em desenvolvimento" não é explicado no ponto de leitura | P3 | Mapa de Domínio | Uma linha de explicação no card |

Não foram observados: erros de rede 4xx/5xx nas rotas visitadas, erros de console, quebras de layout mobile, ou textos em inglês inesperados. O termo "cockpit" não aparece mais na interface.

---

## 3. Respostas por teste

- **T1 Primeiro acesso**: CTA "Começar" é óbvio; texto aceitável. Fricção: dois blocos de destaque simultâneos.
- **T2 Adicionar conteúdo**: diálogo direto a partir do próprio fluxo — sem fricção relevante.
- **T3 Começar estudo**: bloqueado hoje pelo item 1 (Estudar vazia). Pela Home o caminho é direto.
- **T4/T5 Aprender**: título, progresso por blocos e saída existem; conclusão explícita presente.
- **T6/T7 Recuperação/feedback**: fluxo de autoavaliação claro; nada convida a "espiar" o conteúdo.
- **T8 Revisão**: conceito aparece como unidade; falta dizer *por que* aquele item voltou.
- **T9 Estudar vs Revisar**: distinção fraca (item 5).
- **T10/T11 Next Action e explicabilidade**: recomendações confiáveis e sem score/fórmula expostos — ok.
- **T12/T13/T14 Desempenho, domínio, revisões**: sem excesso de números; falta explicabilidade local (itens 6 e 16).
- **T15 Mobile**: navegação inferior boa; problema é hierarquia (item 14).
- **T16 Performance percebida**: transições rápidas; único ponto fraco é o spinner do Estudar.
- **T17 Estados vazios**: todos respondem "o que faço agora" — este é o ponto mais forte do produto.
- **T18 Erros**: nenhuma falha técnica exposta nas rotas visitadas.

---

## 4. Quick wins

1. Bloco terminal sempre visível na tela Estudar (item 1).
2. Ocultar onboarding quando existir sessão concluída (item 2).
3. Ocultar áreas sem conteúdo no Mapa de Domínio (item 4).
4. Copy de uma linha diferenciando Estudar e Revisar (item 5).
5. Verde → magenta em "Tudo em dia" (item 11).
6. Um CTA na landing para usuário logado (item 12).

## 5. Mudanças estruturais recomendadas

1. **Higiene de dados do próprio usuário**: as áreas/cartões de auditoria são conteúdo real e poluem toda a experiência. Precisa existir exclusão em massa ou marcação correta.
2. **Estado de onboarding derivado da atividade**, não de um campo de perfil que pode ficar dessincronizado.
3. **Um único bloco de destaque por tela**, especialmente no mobile.
4. **Explicabilidade no ponto de leitura** (domínio e revisão devida), em vez de documentação separada.

---

## 6. O que impede o Dominus de ser um ótimo V1

Não é falta de funcionalidade — é **falta de foco na tela**. O motor cognitivo já responde bem "o que fazer agora", mas a interface entrega essa resposta ao lado de ruído (onboarding fora de hora, 13 áreas vazias, conteúdo de teste) e, na tela mais importante do produto — Estudar —, às vezes não entrega nada.
