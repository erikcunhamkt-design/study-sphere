import { z } from "zod";

import { COURSE_STATUSES, STUDY_AREA_COLORS, STUDY_AREA_ICONS } from "../types";

// Mesmos limites impostos pelos CHECKs de study_areas/courses no banco (ver
// supabase/migrations/20260719140000_fase02_1_study_areas_and_courses.sql) —
// validados aqui também para feedback imediato na interface.
const name = z.string().trim().min(1, "Informe um nome").max(120, "Máximo de 120 caracteres");

const description = z
  .string()
  .trim()
  .max(1000, "Máximo de 1000 caracteres")
  .optional()
  .or(z.literal(""));

export const studyAreaColorSchema = z.enum(STUDY_AREA_COLORS);
export const studyAreaIconSchema = z.enum(STUDY_AREA_ICONS);
export const courseStatusSchema = z.enum(COURSE_STATUSES);

export const studyAreaSchema = z.object({
  name,
  description,
  icon: studyAreaIconSchema,
  color: studyAreaColorSchema,
});

export type StudyAreaFormValues = z.infer<typeof studyAreaSchema>;

export const courseSchema = z.object({
  study_area_id: z.string().uuid("Selecione uma área"),
  name,
  description,
  status: courseStatusSchema,
});

export type CourseFormValues = z.infer<typeof courseSchema>;

const title = z.string().trim().min(1, "Informe um título").max(160, "Máximo de 160 caracteres");

export const courseModuleSchema = z.object({
  course_id: z.string().uuid("Selecione um curso"),
  name,
  description,
});

export type CourseModuleFormValues = z.infer<typeof courseModuleSchema>;

export const lessonSchema = z.object({
  module_id: z.string().uuid("Selecione um módulo"),
  course_id: z.string().uuid("Selecione um curso"),
  title,
  description,
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
