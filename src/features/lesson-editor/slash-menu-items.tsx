import type { BlockNoteEditor } from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import {
  AlertTriangle,
  Bookmark,
  Code2,
  FileAudio,
  FileText,
  FileUp,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Minus,
  Quote,
  Table,
  Type,
  Video,
} from "lucide-react";

import { STUDY_KINDS, type StudyKind } from "./study-block";
import type { LessonEditorSchema } from "./schema";

type Editor = BlockNoteEditor<
  LessonEditorSchema["blockSchema"],
  LessonEditorSchema["inlineContentSchema"],
  LessonEditorSchema["styleSchema"]
>;

/**
 * Menu / do caderno da aula, em português, substituindo integralmente o
 * padrão. Fase 03.2 adiciona os grupos de mídia e estrutura de documento;
 * nada de IA, colunas (licença GPL do xl-*) ou blocos fora do escopo.
 */
const STUDY_KIND_ALIASES: Record<StudyKind, string[]> = {
  conceito: ["conceito", "importante"],
  definicao: ["definição", "definicao", "termo"],
  exemplo: ["exemplo", "caso"],
  duvida: ["dúvida", "duvida", "pergunta"],
  atencao: ["atenção", "atencao", "cuidado"],
  resumo: ["resumo", "síntese", "sintese"],
  formula: ["fórmula", "formula", "equação", "equacao"],
  linhaDoTempo: ["linha do tempo", "timeline", "cronologia"],
  perguntaRevisao: ["pergunta de revisão", "revisão", "revisao", "quiz"],
  referencia: ["referência", "referencia", "fonte", "bibliografia"],
  aplicacaoPratica: ["aplicação prática", "aplicacao", "prática", "pratica"],
  causaConsequencia: ["causa e consequência", "causa", "consequência", "consequencia"],
  erroComum: ["erro comum", "erro", "pegadinha"],
};

function studyItems(editor: Editor): DefaultReactSuggestionItem[] {
  return (Object.entries(STUDY_KINDS) as [StudyKind, (typeof STUDY_KINDS)[StudyKind]][]).map(
    ([kind, config]) => {
      const Icon = config.icon;
      return {
        title: config.label,
        subtext: `Bloco de estudo: ${config.label.toLowerCase()}`,
        aliases: STUDY_KIND_ALIASES[kind],
        group: "Estudo",
        icon: <Icon className="h-4 w-4" aria-hidden />,
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, { type: "studyBlock", props: { kind } }),
      };
    },
  );
}

export function getLessonEditorSlashMenuItems(editor: Editor): DefaultReactSuggestionItem[] {
  return [
    ...studyItems(editor),
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
    // Mídia
    {
      title: "Imagem",
      subtext: "Envie uma imagem (JPEG, PNG, WebP ou GIF, até 5 MB)",
      aliases: ["imagem", "foto", "figura", "image", "img"],
      group: "Mídia",
      icon: <Image className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "image" }),
    },
    {
      title: "Vídeo",
      subtext: "Envie um vídeo (MP4 ou WebM, até 50 MB)",
      aliases: ["vídeo", "video", "filme", "aula"],
      group: "Mídia",
      icon: <Video className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "video" }),
    },
    {
      title: "Áudio",
      subtext: "Envie um áudio (MP3, M4A, OGG ou WAV, até 50 MB)",
      aliases: ["áudio", "audio", "som", "gravação", "gravacao", "podcast"],
      group: "Mídia",
      icon: <FileAudio className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "audio" }),
    },
    {
      title: "Arquivo",
      subtext: "Envie um PDF, documento, planilha ou ZIP (até 20 MB)",
      aliases: ["arquivo", "pdf", "documento", "anexo", "file"],
      group: "Mídia",
      icon: <FileUp className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "file" }),
    },
    // Estrutura
    {
      title: "Tabela",
      subtext: "Tabela simples",
      aliases: ["tabela", "table", "grade"],
      group: "Estrutura",
      icon: <Table className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "table" }),
    },
    {
      title: "Link salvo",
      subtext: "Cartão de bookmark com URL e título",
      aliases: ["link", "bookmark", "favorito", "referência", "referencia", "site"],
      group: "Estrutura",
      icon: <Bookmark className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bookmark" }),
    },
    {
      title: "Índice",
      subtext: "Sumário automático dos títulos do caderno",
      aliases: ["índice", "indice", "sumário", "sumario", "toc"],
      group: "Estrutura",
      icon: <FileText className="h-4 w-4" aria-hidden />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "tableOfContents" }),
    },
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
