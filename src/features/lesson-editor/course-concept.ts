import { supabase } from "@/integrations/supabase/client";

/**
 * Único ponto de criação de concepts a partir do cliente. Chamada em
 * silêncio pelos diálogos de Flashcard/Questão quando ancorados em curso
 * (nunca em aula) — o usuário nunca vê "conceito" como um passo separado.
 */
export async function createCourseConcept(courseId: string, title: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_course_concept", {
    p_course_id: courseId,
    p_title: title,
  });
  if (error) throw error;
  return data as unknown as string;
}
