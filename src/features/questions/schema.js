import { z } from "zod";
/**
 * Formato plano (não JSONB inline-content): decisão do Gate 1 da Fase
 * 05.1, registrada no cabeçalho da migration — não há bridge de
 * conversão bloco→questão nesta fase, então não há motivo para carregar
 * o formato rico do editor aqui (evita também o risco de vazamento do
 * bundle do BlockNote, achado da Fase 04).
 */
export const QUESTION_TYPE_VALUES = ["multipla_escolha", "discursiva"];
export const questionTypeSchema = z.enum(QUESTION_TYPE_VALUES);
const statementSchema = z
    .string()
    .trim()
    .min(1, "Escreva o enunciado da questão")
    .max(5000, "Enunciado muito longo (máx. 5000 caracteres)");
const optionTextSchema = z
    .string()
    .trim()
    .min(1, "A alternativa não pode ficar vazia")
    .max(500, "Alternativa muito longa (máx. 500 caracteres)");
const expectedAnswerSchema = z
    .string()
    .trim()
    .min(1, "Escreva a resposta esperada")
    .max(5000, "Resposta muito longa (máx. 5000 caracteres)");
/** Espelha questions_type_shape_check no banco — validado em runtime antes de qualquer gravação. */
export const questionFormSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("multipla_escolha"),
        lessonId: z.string().uuid().nullable(),
        statement: statementSchema,
        options: z
            .array(optionTextSchema)
            .min(2, "Mínimo de 2 alternativas")
            .max(6, "Máximo de 6 alternativas"),
        correctOptionIndex: z.number().int().min(0),
    }),
    z.object({
        type: z.literal("discursiva"),
        lessonId: z.string().uuid().nullable(),
        statement: statementSchema,
        expectedAnswer: expectedAnswerSchema,
    }),
]);
/** Segunda checagem depois do discriminatedUnion: o índice precisa apontar para uma alternativa real. */
export function validateQuestionForm(value) {
    const parsed = questionFormSchema.safeParse(value);
    if (!parsed.success)
        return parsed;
    if (parsed.data.type === "multipla_escolha" &&
        parsed.data.correctOptionIndex > parsed.data.options.length - 1) {
        return {
            success: false,
            error: new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    message: "Selecione qual alternativa é a correta",
                    path: ["correctOptionIndex"],
                },
            ]),
        };
    }
    return parsed;
}
export const examFormSchema = z.object({
    title: z.string().trim().min(1, "Dê um título ao simulado").max(200, "Título muito longo"),
    description: z
        .string()
        .trim()
        .max(2000, "Descrição muito longa")
        .nullable()
        .transform((v) => (v === "" ? null : v)),
    timeLimitMinutes: z.number().int().positive("O tempo precisa ser maior que zero").nullable(),
});
