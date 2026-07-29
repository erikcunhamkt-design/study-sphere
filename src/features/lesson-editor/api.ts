import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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
  "id, lesson_id, user_id, content, schema_version, version, created_at, updated_at";

export async function fetchLessonDocument(
  userId: string,
  lessonId: string,
): Promise<LessonDocumentRow | null> {
  const { data, error } = await supabase
    .from("lesson_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
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
 * expectedVersion não bate com a versão atual (ERRCODE 40001) — o chamador
 * decide o que fazer (nunca deve sobrescrever silenciosamente).
 */
export async function saveLessonDocument(
  lessonId: string,
  content: LessonDocument,
  schemaVersion: number,
  expectedVersion: number,
): Promise<SaveLessonDocumentResult> {
  const { data, error } = await supabase.rpc("save_lesson_document", {
    p_lesson_id: lessonId,
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
  lessonId: string,
): Promise<SaveLessonDocumentResult> {
  const { data, error } = await supabase.rpc("checkpoint_lesson_document", {
    p_lesson_id: lessonId,
  });
  if (error) throw error;
  return data as unknown as SaveLessonDocumentResult;
}

export async function restoreLessonDocumentVersion(
  lessonId: string,
  version: number,
): Promise<RestoreLessonDocumentResult> {
  const { data, error } = await supabase.rpc("restore_lesson_document_version", {
    p_lesson_id: lessonId,
    p_version: version,
  });
  if (error) throw error;
  return data as unknown as RestoreLessonDocumentResult;
}
