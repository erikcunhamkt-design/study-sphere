import type { PartialBlock } from "@blocknote/core";

import type { LabEditorSchema } from "./schema";

/**
 * Documento de exemplo do laboratório — dados puramente locais, nunca
 * persistidos, nunca misturados com cursos/aulas reais.
 */
export const sampleDocument: PartialBlock<
  LabEditorSchema["blockSchema"],
  LabEditorSchema["inlineContentSchema"],
  LabEditorSchema["styleSchema"]
>[] = [
  {
    type: "heading",
    props: { level: 1 },
    content: "Documento de teste — laboratório do editor",
  },
  {
    type: "paragraph",
    content:
      "Este é o primeiro parágrafo de conteúdo local, usado apenas para validar o motor do editor. Nenhum dado aqui é salvo em qualquer lugar.",
  },
  {
    type: "paragraph",
    content:
      "Segundo parágrafo — sirva-se para testar formatação inline: negrito, itálico, sublinhado, tachado, código e links.",
  },
  {
    type: "bulletListItem",
    content: "Primeiro item da lista com marcadores",
  },
  {
    type: "bulletListItem",
    content: "Segundo item da lista com marcadores",
  },
  {
    type: "numberedListItem",
    content: "Primeiro item da lista numerada",
  },
  {
    type: "numberedListItem",
    content: "Segundo item da lista numerada",
  },
  {
    type: "checkListItem",
    props: { checked: false },
    content: "Item de checklist pendente",
  },
  {
    type: "checkListItem",
    props: { checked: true },
    content: "Item de checklist concluído",
  },
  {
    type: "quote",
    content: "Uma citação de teste, só para validar o bloco de citação.",
  },
  {
    type: "codeBlock",
    props: { language: "typescript" },
    content: "const laboratorio = true;\nconsole.log('bloco de código');",
  },
  {
    type: "toggleListItem",
    content: "Lista recolhível — clique para expandir/recolher",
    children: [
      {
        type: "paragraph",
        content: "Conteúdo aninhado dentro da lista recolhível.",
      },
    ],
  },
  {
    type: "divider",
  },
  {
    type: "callout",
    props: { type: "info" },
    content: "Bloco de callout experimental (custom block) — tipo Informação.",
  },
];
