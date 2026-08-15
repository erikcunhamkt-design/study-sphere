import { z } from "zod";
/**
 * Validação da frente/verso de um cartão — mesmo formato de conteúdo
 * inline do BlockNote usado no caderno da aula (texto com estilos, link
 * com URL segura), para que a conversão bloco→cartão preserve
 * formatação sem perda. Chamada em runtime na criação/edição e antes de
 * qualquer gravação (lição da auditoria cruzada da Fase 03.1: Zod que só
 * existe nos testes não protege nada).
 *
 * isSafeUrl é uma cópia deliberada da de lesson-editor/document-schema.ts
 * — NÃO importada de lá. document-schema.ts importa STUDY_KIND_VALUES de
 * study-block.tsx, que importa @blocknote/react; importar qualquer coisa
 * de document-schema.ts arrastaria o BlockNote inteiro para o chunk da
 * rota /app/flashcards (achado ao medir o build antes deste commit —
 * flashcard-form-dialog chegou a 220 KB gzip com blocknote embutido).
 * Duas linhas duplicadas é preço baixo por manter a rota de flashcards
 * livre de um editor que ela nunca usa.
 */
const DANGEROUS_URL_SCHEME = /^\s*(javascript|data|vbscript|file):/i;
function isSafeUrl(value) {
    if (value.trim() === "")
        return true;
    return !DANGEROUS_URL_SCHEME.test(value);
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
    href: z.string().refine(isSafeUrl, { message: "URL não permitida neste link" }),
    content: z.array(inlineTextSchema),
});
const inlineContentItemSchema = z.union([inlineTextSchema, inlineLinkSchema]);
export const flashcardContentSchema = z
    .array(inlineContentItemSchema)
    .min(1, "O cartão precisa ter conteúdo");
export function validateFlashcardContent(value) {
    return flashcardContentSchema.safeParse(value);
}
export const RATING_VALUES = ["errei", "dificil", "bom", "facil"];
export const flashcardRatingSchema = z.enum(RATING_VALUES);
export const flashcardFormSchema = z.object({
    lessonId: z.string().uuid().nullable(),
    deckId: z.string().uuid().nullable(),
    sourceBlockId: z.string().nullable(),
    front: flashcardContentSchema,
    back: flashcardContentSchema,
});
/** Achata conteúdo inline para texto simples (pré-visualização, listagem, fila de revisão). */
export function textFromInlineContent(content) {
    return content
        .map((item) => (item.type === "text" ? item.text : item.content.map((c) => c.text).join("")))
        .join("");
}
/** Adaptador do textarea simples (v1 de criação manual) para o formato JSONB inline-content. */
export function plainTextToInlineContent(text) {
    return [{ type: "text", text, styles: {} }];
}
/**
 * Decide o que persistir como frente do cartão (achado do Gate 3: a
 * conversão bloco→cartão e a edição de um cartão já rico achatavam para
 * texto simples e nunca devolviam a formatação — negrito/links da
 * pergunta original morriam mesmo sem o usuário tocar no campo).
 *
 * Se o texto no textarea é igual (ignorando espaços nas pontas) ao texto
 * achatado do conteúdo original, o usuário não editou a frente — persiste
 * o conteúdo rico original, formatação intacta. Se editou, persiste o
 * texto simples digitado (comportamento v1, sem editor rico no diálogo).
 */
export function resolveFrontContentForSubmit(editedText, original) {
    if (original && editedText.trim() === original.text.trim()) {
        return original.content;
    }
    return plainTextToInlineContent(editedText.trim());
}
