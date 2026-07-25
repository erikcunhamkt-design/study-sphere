import type { BlockNoteEditor } from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import {
  AlertTriangle,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Minus,
  Quote,
  Type,
} from "lucide-react";

import type { LabEditorSchema } from "./schema";

type Editor = BlockNoteEditor<
  LabEditorSchema["blockSchema"],
  LabEditorSchema["inlineContentSchema"],
  LabEditorSchema["styleSchema"]
>;

/**
 * Menu / restrito aos blocos autorizados na prova, em português, com
 * aliases e agrupado exatamente como especificado (Básicos / Estrutura).
 * Substitui totalmente o menu padrão — nenhum item fora do escopo
 * (imagem, vídeo, arquivo, tabela, IA) é exposto.
 */
export function getLabEditorSlashMenuItems(editor: Editor): DefaultReactSuggestionItem[] {
  return [
    // Básicos
    {
      title: "Texto",
      subtext: "Parágrafo simples",
      aliases: ["texto", "parágrafo", "paragrafo", "p"],
      group: "Básicos",
      icon: <Type className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "paragraph" }),
    },
    {
      title: "Título 1",
      subtext: "Cabeçalho de nível 1",
      aliases: ["título", "titulo", "h1", "cabeçalho"],
      group: "Básicos",
      icon: <Heading1 className="h-4 w-4" aria-hidden />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 1 } }),
    },
    {
      title: "Título 2",
      subtext: "Cabeçalho de nível 2",
      aliases: ["título", "titulo", "h2"],
      group: "Básicos",
      icon: <Heading2 className="h-4 w-4" aria-hidden />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 2 } }),
    },
    {
      title: "Título 3",
      subtext: "Cabeçalho de nível 3",
      aliases: ["título", "titulo", "h3"],
      group: "Básicos",
      icon: <Heading3 className="h-4 w-4" aria-hidden />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 3 } }),
    },
    {
      title: "Lista com marcadores",
      subtext: "Lista não ordenada",
      aliases: ["lista", "marcadores", "bullets", "ul"],
      group: "Básicos",
      icon: <List className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bulletListItem" }),
    },
    {
      title: "Lista numerada",
      subtext: "Lista ordenada",
      aliases: ["lista", "numerada", "números", "numeros", "ol"],
      group: "Básicos",
      icon: <ListOrdered className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "numberedListItem" }),
    },
    {
      title: "Checklist",
      subtext: "Lista de tarefas com caixas de marcação",
      aliases: ["checklist", "tarefas", "afazeres", "todo"],
      group: "Básicos",
      icon: <ListChecks className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "checkListItem" }),
    },
    {
      title: "Lista recolhível",
      subtext: "Conteúdo que pode ser expandido ou recolhido",
      aliases: ["lista", "recolhível", "recolhivel", "toggle", "expansível"],
      group: "Básicos",
      icon: <ListTree className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "toggleListItem" }),
    },
    // Estrutura
    {
      title: "Citação",
      subtext: "Bloco de citação",
      aliases: ["citação", "citacao", "quote"],
      group: "Estrutura",
      icon: <Quote className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "quote" }),
    },
    {
      title: "Código",
      subtext: "Bloco de código com destaque de sintaxe",
      aliases: ["código", "codigo", "code"],
      group: "Estrutura",
      icon: <Code2 className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "codeBlock" }),
    },
    {
      title: "Divisor",
      subtext: "Linha horizontal de separação",
      aliases: ["divisor", "separador", "linha", "hr"],
      group: "Estrutura",
      icon: <Minus className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "divider" }),
    },
    {
      title: "Aviso",
      subtext: "Callout de informação, atenção ou sucesso",
      aliases: ["aviso", "callout", "destaque", "nota", "alerta"],
      group: "Estrutura",
      icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { type: "info" } }),
    },
  ];
}
