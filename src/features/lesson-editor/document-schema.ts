import { z } from "zod";

import { STUDY_KIND_VALUES } from "./study-block";

/**
 * Validação estrutural do documento do caderno.
 * Fase 03.1 (Etapa 2): espelha o schema restrito da prova 03.0 em Zod,
 * para validar o JSON antes de enviar ao banco e antes de carregar no
 * editor (o banco valida array/tamanho/contagem, mas não tipo de bloco,
 * profundidade nem URLs perigosas: essa camada é só do cliente).
 * Fase 03.2: mídia nativa (image/video/audio/file), tabela simples,
 * bookmark e índice. URLs de mídia só podem ser caminho do storage
 * (relativo, sem esquema) ou http(s) — nunca javascript:/data:/etc.
 */

export const MAX_DOCUMENT_BLOCKS = 5000;
export const MAX_DOCUMENT_DEPTH = 10;

const ALLOWED_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "quote",
  "codeBlock",
  "divider",
  "callout",
  // Fase 03.2
  "image",
  "video",
  "audio",
  "file",
  "table",
  "bookmark",
  "tableOfContents",
  // Fase 03.3
  "studyBlock",
] as const;

export const CALLOUT_TYPES = ["info", "attention", "success"] as const;

// javascript:/data:/vbscript:/file: em href/src é o vetor clássico de
// XSS/leitura local — bloqueado na validação, não só confiado ao
// sanitizador do BlockNote.
const DANGEROUS_URL_SCHEME = /^\s*(javascript|data|vbscript|file):/i;

export function isSafeUrl(value: string): boolean {
  if (value.trim() === "") return true; // vazio (em edição/upload) é inofensivo
  return !DANGEROUS_URL_SCHEME.test(value);
}

function isSafeHref(href: string): boolean {
  return isSafeUrl(href);
}

/**
 * URL de mídia persistida: ou caminho do storage (relativo — sem esquema
 * nenhum) ou http(s) absoluto. Qualquer outro esquema é recusado.
 */
function isSafeMediaUrl(value: string): boolean {
  if (value.trim() === "") return true;
  if (/^https?:\/\//i.test(value)) return true;
  // Relativo = não começa com esquema algum.
  return !/^\s*[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

const colorProp = z.string().max(40);

const textStyleSchema = z
  .object({
    bold: z.boolean(),
    italic: z.boolean(),
    underline: z.boolean(),
    strike: z.boolean(),
    code: z.boolean(),
    textColor: colorProp,
    backgroundColor: colorProp,
  })
  .partial()
  .strict();

const inlineTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  styles: textStyleSchema.default({}),
});

const inlineLinkSchema = z.object({
  type: z.literal("link"),
  href: z.string().refine(isSafeHref, { message: "URL não permitida neste link" }),
  content: z.array(inlineTextSchema),
});

const inlineContentItemSchema = z.union([inlineTextSchema, inlineLinkSchema]);

const inlineContentSchema = z.array(inlineContentItemSchema);

// ── Tabela (Fase 03.2) ───────────────────────────────────────────────
const tableCellPropsSchema = z
  .object({
    colspan: z.number().int().min(1).max(50),
    rowspan: z.number().int().min(1).max(50),
    backgroundColor: colorProp,
    textColor: colorProp,
    textAlignment: z.enum(["left", "center", "right", "justify"]),
  })
  .partial();

const tableCellSchema = z.object({
  type: z.literal("tableCell"),
  content: inlineContentSchema,
  props: tableCellPropsSchema.default({}),
});

// Células podem vir como objeto tableCell (formato atual) ou array de
// conteúdo inline (formato tolerado pelo BlockNote ao parsear).
const tableCellUnionSchema = z.union([tableCellSchema, inlineContentSchema]);

const tableContentSchema = z.object({
  type: z.literal("tableContent"),
  columnWidths: z.array(z.number().positive().nullable()).max(50).optional(),
  headerRows: z.number().int().min(0).max(1).optional(),
  headerCols: z.number().int().min(0).max(1).optional(),
  rows: z
    .array(
      z.object({
        cells: z.array(tableCellUnionSchema).max(50),
      }),
    )
    .max(500),
});

const blockContentSchema = z.union([inlineContentSchema, tableContentSchema]).optional();

// ── Props por tipo ───────────────────────────────────────────────────
const commonBlockProps = z
  .object({
    backgroundColor: colorProp,
    textColor: colorProp,
    textAlignment: z.enum(["left", "center", "right", "justify"]),
  })
  .partial();

const headingPropsSchema = commonBlockProps
  .extend({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    isToggleable: z.boolean(),
  })
  .partial();

const checkListItemPropsSchema = commonBlockProps.extend({ checked: z.boolean() }).partial();

const codeBlockPropsSchema = z.object({ language: z.string().max(40) }).partial();

const calloutPropsSchema = z.object({ type: z.enum(CALLOUT_TYPES) }).partial();

const emptyPropsSchema = z.object({}).strict();

const mediaUrlProp = z
  .string()
  .max(2000)
  .refine(isSafeMediaUrl, { message: "URL de mídia não permitida" });

const mediaCommonProps = z
  .object({
    backgroundColor: colorProp,
    textAlignment: z.enum(["left", "center", "right", "justify"]),
    name: z.string().max(300),
    url: mediaUrlProp,
    caption: z.string().max(1000),
    showPreview: z.boolean(),
    previewWidth: z.number().min(0).max(10000),
  })
  .partial();

const studyBlockPropsSchema = z
  .object({
    kind: z.enum(STUDY_KIND_VALUES as [string, ...string[]]),
  })
  .partial();

const bookmarkPropsSchema = z
  .object({
    url: z
      .string()
      .max(2000)
      .refine((v) => v === "" || (/^https?:\/\//i.test(v) && isSafeUrl(v)), {
        message: "Bookmark só aceita URLs http(s)",
      }),
    title: z.string().max(300),
  })
  .partial();

function propsSchemaForType(type: (typeof ALLOWED_BLOCK_TYPES)[number]) {
  switch (type) {
    case "heading":
      return headingPropsSchema;
    case "checkListItem":
      return checkListItemPropsSchema;
    case "codeBlock":
      return codeBlockPropsSchema;
    case "callout":
      return calloutPropsSchema;
    case "divider":
      return emptyPropsSchema;
    case "image":
    case "video":
    case "audio":
    case "file":
      return mediaCommonProps;
    case "table":
      return commonBlockProps;
    case "bookmark":
      return bookmarkPropsSchema;
    case "tableOfContents":
      return emptyPropsSchema;
    case "studyBlock":
      return studyBlockPropsSchema;
    default:
      return commonBlockProps;
  }
}

export interface LessonBlock {
  id: string;
  type: (typeof ALLOWED_BLOCK_TYPES)[number];
  props: Record<string, unknown>;
  content?: z.infer<typeof blockContentSchema>;
  children: LessonBlock[];
}

// Recursivo: children pode conter qualquer bloco permitido, sem limite de
// profundidade codificado no tipo — profundidade real é medida à parte
// (ver walkTree), porque Zod não modela bem recursão com parâmetro de
// profundidade decrescente.
export const lessonBlockSchema: z.ZodType<LessonBlock, z.ZodTypeDef, unknown> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      type: z.enum(ALLOWED_BLOCK_TYPES),
      props: z.record(z.string(), z.unknown()).default({}),
      content: blockContentSchema,
      children: z.array(lessonBlockSchema).default([]),
    })
    .superRefine((block, ctx) => {
      const propsSchema = propsSchemaForType(block.type);
      const result = propsSchema.safeParse(block.props);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ ...issue, path: ["props", ...issue.path] });
        }
      }
      // Tabela exige conteúdo tabular; os demais tipos nunca o carregam.
      const isTableContent =
        !!block.content && !Array.isArray(block.content) && block.content.type === "tableContent";
      if (block.type === "table" && block.content !== undefined && !isTableContent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "Bloco de tabela exige conteúdo tableContent",
        });
      }
      if (block.type !== "table" && isTableContent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: `Bloco ${block.type} não pode carregar conteúdo de tabela`,
        });
      }
    }),
);

interface TreeStats {
  count: number;
  maxDepth: number;
  ids: string[];
}

function walkTree(blocks: LessonBlock[], depth: number, stats: TreeStats) {
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  for (const block of blocks) {
    stats.count += 1;
    stats.ids.push(block.id);
    if (block.children.length > 0) {
      walkTree(block.children, depth + 1, stats);
    }
  }
}

/**
 * Schema do documento inteiro: raiz é sempre um array de blocos (nunca
 * HTML, nunca Markdown — é o JSON nativo do BlockNote). Valida contagem
 * total, profundidade e unicidade de ID em uma só passada pela árvore.
 */
export const lessonDocumentSchema = z.array(lessonBlockSchema).superRefine((blocks, ctx) => {
  const stats: TreeStats = { count: 0, maxDepth: blocks.length > 0 ? 1 : 0, ids: [] };
  walkTree(blocks, 1, stats);

  if (stats.count > MAX_DOCUMENT_BLOCKS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Documento com ${stats.count} blocos excede o limite de ${MAX_DOCUMENT_BLOCKS}`,
    });
  }

  if (stats.maxDepth > MAX_DOCUMENT_DEPTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Profundidade ${stats.maxDepth} excede o limite de ${MAX_DOCUMENT_DEPTH} níveis`,
    });
  }

  const seen = new Set<string>();
  for (const id of stats.ids) {
    if (seen.has(id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ID de bloco duplicado: ${id}` });
      break;
    }
    seen.add(id);
  }
});

export type LessonDocument = z.infer<typeof lessonDocumentSchema>;

export function validateLessonDocument(value: unknown) {
  return lessonDocumentSchema.safeParse(value);
}
