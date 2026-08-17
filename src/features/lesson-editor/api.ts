import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DocumentAnchor } from "./document-anchor";
import type { LessonDocument } from "./document-schema";
import {
  LessonDocumentConflictError,
  VERSION_CONFLICT_ERROR_CODE,
  type LessonDocumentRow,
  type LessonDocumentVersionRow,
  type RestoreLessonDocumentResult,
  type SaveLessonDocumentResult,
} from "./types";

const DOCUMENT_COLUMNS =
  "id, lesson_id, course_id, user_id, content, schema_version, version, created_at, updated_at, published_content, published_version, published_at";

export async function fetchLessonDocument(
  userId: string,
  anchor: DocumentAnchor,
): Promise<LessonDocumentRow | null> {
  const query = supabase.from("lesson_documents").select(DOCUMENT_COLUMNS).eq("user_id", userId);
  // typeof === "string" (não `anchor.lessonId ? ...` nem `"lessonId" in
  // anchor`): como lessonId?: never é uma chave opcional válida nos dois
  // membros da união, nem truthiness nem "in" discriminam — só checar o
  // tipo de runtime do valor narrowa corretamente os dois ramos.
  const { data, error } = await (
    typeof anchor.lessonId === "string"
      ? query.eq("lesson_id", anchor.lessonId)
      : query.eq("course_id", anchor.courseId)
  ).maybeSingle();
  if (error) throw error;
  return data as LessonDocumentRow | null;
}

export async function fetchLessonDocumentVersions(
  userId: string,
  documentId: string,
): Promise<LessonDocumentVersionRow[]> {
  const { data, error } = await supabase
    .from("lesson_document_versions")
    .select("id, document_id, user_id, version, content, schema_version, reason, created_at")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LessonDocumentVersionRow[];
}

/**
 * Cria ou atualiza o documento com controle de versão otimista. Lança
 * LessonDocumentConflictError especificamente quando o banco detecta que
 * expectedVersion não bate com a versão atual (ERRCODE VC409) — o chamador
 * decide o que fazer (nunca deve sobrescrever silenciosamente).
 */
export async function saveLessonDocument(
  anchor: DocumentAnchor,
  content: LessonDocument,
  schemaVersion: number,
  expectedVersion: number,
): Promise<SaveLessonDocumentResult> {
  const { data, error } = await supabase.rpc("save_lesson_document", {
    p_lesson_id: anchor.lessonId ?? null,
    p_course_id: anchor.courseId ?? null,
    p_content: content as unknown as Json,
    p_schema_version: schemaVersion,
    p_expected_version: expectedVersion,
  });
  if (error) {
    if (error.code === VERSION_CONFLICT_ERROR_CODE) {
      throw new LessonDocumentConflictError(error.message);
    }
    throw error;
  }
  return data as unknown as SaveLessonDocumentResult;
}

export async function checkpointLessonDocument(
  anchor: DocumentAnchor,
): Promise<SaveLessonDocumentResult> {
  const { data, error } = await supabase.rpc("checkpoint_lesson_document", {
    p_lesson_id: anchor.lessonId ?? null,
    p_course_id: anchor.courseId ?? null,
  });
  if (error) throw error;
  return data as unknown as SaveLessonDocumentResult;
}

export async function restoreLessonDocumentVersion(
  anchor: DocumentAnchor,
  version: number,
): Promise<RestoreLessonDocumentResult> {
  const { data, error } = await supabase.rpc("restore_lesson_document_version", {
    p_lesson_id: anchor.lessonId ?? null,
    p_course_id: anchor.courseId ?? null,
    p_version: version,
  });
  if (error) throw error;
  return data as unknown as RestoreLessonDocumentResult;
}

export async function publishLessonDocument(
  anchor: DocumentAnchor,
): Promise<{ document_id: string; published_version: number; published_at: string }> {
  const { data, error } = await supabase.rpc("publish_lesson_document", {
    p_lesson_id: anchor.lessonId ?? null,
    p_course_id: anchor.courseId ?? null,
  });
  if (error) throw error;
  return data as unknown as {
    document_id: string;
    published_version: number;
    published_at: string;
  };
}
