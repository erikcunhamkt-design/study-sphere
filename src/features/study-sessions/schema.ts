import { z } from "zod";
import { 
  STUDY_METHOD_VALUES, 
  type StudyMethod, 
  type StudySessionDetails 
} from "./types";

export const studyMethodSchema = z.enum(STUDY_METHOD_VALUES);

export const startSessionSchema = z.object({
  method: studyMethodSchema,
  lessonId: z.string().uuid().nullable(),
});

export type StartSessionValues = z.infer<typeof startSessionSchema>;

/**
 * Especificação testada da forma de `details` por método (ver
 * schema.test.ts) — nenhum componente chama estes schemas em runtime, os
 * componentes constroem `details` já tipado via TS antes do finish. A
 * barreira real contra payload absurdo é `maxLength={20000}` nas
 * textareas + o CHECK de ~100KB no banco (jsonb_typeof = 'object' +
 * octet_length). Textos livres, sem editor rico (lição da Fase 04).
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

export const aprenderDetailsSchema = z.object({
  nota: freeText(20000).optional(),
});

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
    case "aprender":
      return {};
    case "recordacao_ativa":
      return {};
  }
}
