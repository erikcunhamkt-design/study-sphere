import { z } from "zod";

/**
 * Validação estrutural do documento do caderno (Fase 03.1, Etapa 2).
 * Espelha o schema restrito da Fase 03.0 (src/features/lab-editor/schema.ts)
 * — mesmos 10 blocos + callout — mas em Zod, para validar o JSON antes de
 * enviar ao banco (que também valida array/tamanho/contagem, mas não tipo
 * de bloco nem profundidade nem URLs perigosas: essa camada é só do
 * cliente).
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
] as const;

export const CALLOUT_TYPES = ["info", "attention", "success"] as const;

// javascript:/data:/vbscript:/file: em href de link é o vetor clássico de
// XSS/leitura local via clique — bloqueado na validação, não só confiado
// ao sanitizador do BlockNote.
const DANGEROUS_URL_SCHEME = /^\s*(javascript|data|vbscript|file):/i;

function isSafeHref(href: string): boolean {
  if (href.trim() === "") return true; // link vazio (em edição) é inofensivo
  return !DANGEROUS_URL_SCHEME.test(href);
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

const blockContentSchema = z.array(inlineContentItemSchema).optional();

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
// (ver countAndValidateTree), porque Zod não modela bem recursão com
// parâmetro de profundidade decrescente.
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
