import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * NOVO ESTUDO — FLUXO UNIFICADO
 * "Comece em segundos. Organize quando precisar."
 *
 * Toda a estrutura (área → curso → módulo → aula → conteúdo) é criada em
 * UMA única ação, a partir de um rascunho que vive apenas no estado da tela.
 * Nada é persistido enquanto o usuário preenche o formulário.
 *
 * Se qualquer etapa crítica falhar, o curso criado é removido (cascade),
 * evitando estrutura pela metade.
 */

export interface QuickStudyLessonDraft {
  id: string; // id local (apenas UI)
  title: string;
  content: string;
}

export interface QuickStudyModuleDraft {
  id: string; // id local (apenas UI)
  name: string;
  lessons: QuickStudyLessonDraft[];
}

export interface QuickStudyDraft {
  name: string;
  /** Conteúdo do estudo simples (quando não há módulos). */
  content: string;
  hasModules: boolean;
  modules: QuickStudyModuleDraft[];
}

export interface QuickStudyResult {
  courseId: string;
  studyAreaId: string;
  firstLessonId: string | null;
}

const DEFAULT_AREA_NAME = "Meus estudos";
/** Container técnico interno — nunca exibido quando o usuário escolheu "sem módulos". */
const INTERNAL_MODULE_NAME = "Conteúdo";

/** Converte texto simples em documento BlockNote válido (array de blocos). */
export function textToLessonDocument(text: string): unknown[] {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = lines
    .filter((line, index, all) => line.trim() !== "" || (index > 0 && index < all.length - 1))
    .map((line) => {
      const trimmed = line.trim();
      const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
      if (headingMatch) {
        return {
          id: crypto.randomUUID(),
          type: "heading",
          props: { level: headingMatch[1].length as 1 | 2 | 3 },
          content: [{ type: "text", text: headingMatch[2], styles: {} }],
          children: [],
        };
      }
      return {
        id: crypto.randomUUID(),
        type: "paragraph",
        props: {},
        content:
          trimmed === "" ? [] : [{ type: "text", text: line, styles: {} }],
        children: [],
      };
    });

  return blocks.length > 0
    ? blocks
    : [{ id: crypto.randomUUID(), type: "paragraph", props: {}, content: [], children: [] }];
}

export function draftHasContent(draft: QuickStudyDraft): boolean {
  if (draft.name.trim() !== "") return true;
  if (draft.content.trim() !== "") return true;
  return draft.modules.some(
    (m) =>
      m.name.trim() !== "" ||
      m.lessons.some((l) => l.title.trim() !== "" || l.content.trim() !== ""),
  );
}

/** Garante uma área padrão sem pedir nada ao usuário (área é organização avançada). */
async function ensureDefaultStudyArea(userId: string): Promise<string> {
  const { data: existing, error: readError } = await supabase
    .from("study_areas")
    .select("id, name, position")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (readError) throw readError;

  if (existing && existing.length > 0) {
    const preferred = existing.find((a) => a.name === DEFAULT_AREA_NAME);
    return (preferred ?? existing[0]).id;
  }

  const { data: created, error: insertError } = await supabase
    .from("study_areas")
    .insert({
      user_id: userId,
      name: DEFAULT_AREA_NAME,
      icon: "BookOpen",
      color: "magenta",
      position: 0,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

async function nextCoursePosition(userId: string, areaId: string): Promise<number> {
  const { data, error } = await supabase
    .from("courses")
    .select("position")
    .eq("user_id", userId)
    .eq("study_area_id", areaId)
    .order("position", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? (data[0].position ?? 0) + 1 : 0;
}

async function persistLessonContent(lessonId: string, content: string): Promise<void> {
  const document = textToLessonDocument(content);
  const { error: saveError } = await supabase.rpc("save_lesson_document", {
    p_lesson_id: lessonId,
    p_content: document as unknown as Json,
    p_schema_version: 1,
    p_expected_version: 0,
  });
  if (saveError) throw saveError;

  // O estudo precisa estar disponível imediatamente para a sessão Aprender,
  // então publicamos a primeira versão junto da criação.
  const { error: publishError } = await supabase.rpc("publish_lesson_document", {
    p_lesson_id: lessonId,
  });
  if (publishError) throw publishError;
}

/**
 * Cria todo o estudo em uma única ação. Em caso de falha, remove o curso
 * criado (o cascade remove módulos, aulas e documentos) — sem estado parcial.
 */
export async function createQuickStudy(
  userId: string,
  draft: QuickStudyDraft,
): Promise<QuickStudyResult> {
  const name = draft.name.trim();
  if (name === "") throw new Error("Dê um nome ao estudo para continuar.");

  const studyAreaId = await ensureDefaultStudyArea(userId);
  const position = await nextCoursePosition(userId, studyAreaId);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: userId,
      study_area_id: studyAreaId,
      name,
      status: "not_started",
      position,
    })
    .select("id")
    .single();
  if (courseError) throw courseError;

  const courseId = course.id;

  try {
    let firstLessonId: string | null = null;

    if (!draft.hasModules) {
      // Container técnico mínimo — invisível na experiência do usuário.
      const { data: mod, error: modError } = await supabase
        .from("course_modules")
        .insert({ user_id: userId, course_id: courseId, name: INTERNAL_MODULE_NAME, position: 0 })
        .select("id")
        .single();
      if (modError) throw modError;

      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          user_id: userId,
          course_id: courseId,
          module_id: mod.id,
          title: name,
          position: 0,
        })
        .select("id")
        .single();
      if (lessonError) throw lessonError;

      await persistLessonContent(lesson.id, draft.content);
      firstLessonId = lesson.id;
    } else {
      const modules = draft.modules
        .map((m) => ({
          ...m,
          lessons: m.lessons.filter(
            (l) => l.title.trim() !== "" || l.content.trim() !== "",
          ),
        }))
        .filter((m) => m.name.trim() !== "" || m.lessons.length > 0);

      if (modules.length === 0) throw new Error("Adicione ao menos um módulo com uma aula.");

      for (let mi = 0; mi < modules.length; mi += 1) {
        const draftModule = modules[mi];
        const { data: mod, error: modError } = await supabase
          .from("course_modules")
          .insert({
            user_id: userId,
            course_id: courseId,
            name: draftModule.name.trim() || `Módulo ${mi + 1}`,
            position: mi,
          })
          .select("id")
          .single();
        if (modError) throw modError;

        const lessons =
          draftModule.lessons.length > 0
            ? draftModule.lessons
            : [{ id: "auto", title: draftModule.name.trim() || `Módulo ${mi + 1}`, content: "" }];

        for (let li = 0; li < lessons.length; li += 1) {
          const draftLesson = lessons[li];
          const { data: lesson, error: lessonError } = await supabase
            .from("lessons")
            .insert({
              user_id: userId,
              course_id: courseId,
              module_id: mod.id,
              title: draftLesson.title.trim() || `Aula ${li + 1}`,
              position: li,
            })
            .select("id")
            .single();
          if (lessonError) throw lessonError;

          await persistLessonContent(lesson.id, draftLesson.content);
          if (!firstLessonId) firstLessonId = lesson.id;
        }
      }
    }

    return { courseId, studyAreaId, firstLessonId };
  } catch (error) {
    // Rollback: apaga o curso; módulos/aulas/documentos caem por cascade.
    await supabase.from("courses").delete().eq("id", courseId);
    throw error;
  }
}
