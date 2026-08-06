import { z } from "zod";

/** Espelha os CHECKs do banco: título 1..120 (trim não-vazio), minutos 1..1440 opcional. */
export const plannedStudyFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(120, "Máximo de 120 caracteres"),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  studyAreaId: z.string().uuid().nullable(),
  courseId: z.string().uuid().nullable(),
  estimatedMinutes: z
    .number()
    .int()
    .min(1, "Mínimo de 1 minuto")
    .max(1440, "Máximo de 1440 minutos")
    .nullable(),
});

export type PlannedStudyFormValues = z.infer<typeof plannedStudyFormSchema>;
