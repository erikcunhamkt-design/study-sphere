import { z } from "zod";

import { STUDY_METHOD_VALUES, type StudyMethod, type StudySessionDetails } from "./types";

export const studyMethodSchema = z.enum(STUDY_METHOD_VALUES);

export const startSessionSchema = z.object({
  method: studyMethodSchema,
  lessonId: z.string().uuid().nullable(),
});

export type StartSessionValues = z.infer<typeof startSessionSchema>;

/**
 * Validação por método, chamada em runtime antes de qualquer UPDATE de
 * details — espelha o CHECK de forma solta do banco (jsonb_typeof =
 * 'object' + teto de ~100KB), mas dá feedback específico por campo.
 * Textos livres, sem editor rico (lição da Fase 04); os tetos por campo
 * aqui são de sanidade — quem realmente barra tamanho é o CHECK do banco.
 */
const freeText = (max: number) => z.string().trim().max(max);

export const pomodoroDetailsSchema = z.object({
  cycles_completed: z.number().int().min(0),
});

export const feynmanDetailsSchema = z.object({
  explicacao: freeText(20000),
});

export const blurtingDetailsSchema = z.object({
  texto: freeText(20000),
});

export const cornellDetailsSchema = z.object({
  notas: freeText(20000),
  pistas: freeText(20000),
  resumo: freeText(20000),
});

export const livreDetailsSchema = z.object({
  nota: freeText(20000).optional(),
});

export const detailsSchemaByMethod = {
  pomodoro: pomodoroDetailsSchema,
  feynman: feynmanDetailsSchema,
  blurting: blurtingDetailsSchema,
  cornell: cornellDetailsSchema,
  livre: livreDetailsSchema,
} as const;

/** Forma inicial gravada no INSERT — recordacao_ativa nunca chega aqui (não cria sessão, ver hub). */
export function initialDetailsForMethod(method: StudyMethod): StudySessionDetails {
  switch (method) {
    case "pomodoro":
      return { cycles_completed: 0 };
    case "feynman":
      return { explicacao: "" };
    case "blurting":
      return { texto: "" };
    case "cornell":
      return { notas: "", pistas: "", resumo: "" };
    case "livre":
      return {};
    case "recordacao_ativa":
      return {};
  }
}
