import { supabase } from "@/integrations/supabase/client";
import { LessonDocumentConflictError, VERSION_CONFLICT_ERROR_CODE, } from "./types";
const DOCUMENT_COLUMNS = "id, lesson_id, user_id, content, schema_version, version, created_at, updated_at";
export async function fetchLessonDocument(userId, lessonId) {
    const { data, error } = await supabase
        .from("lesson_documents")
        .select(DOCUMENT_COLUMNS)
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
export async function fetchLessonDocumentVersions(userId, documentId) {
    const { data, error } = await supabase
        .from("lesson_document_versions")
        .select("id, document_id, user_id, version, content, schema_version, reason, created_at")
        .eq("user_id", userId)
        .eq("document_id", documentId)
        .order("version", { ascending: false });
    if (error)
        throw error;
    return (data ?? []);
}
/**
 * Cria ou atualiza o documento com controle de versão otimista. Lança
 * LessonDocumentConflictError especificamente quando o banco detecta que
 * expectedVersion não bate com a versão atual (ERRCODE VC409) — o chamador
 * decide o que fazer (nunca deve sobrescrever silenciosamente).
 */
export async function saveLessonDocument(lessonId, content, schemaVersion, expectedVersion) {
    const { data, error } = await supabase.rpc("save_lesson_document", {
        p_lesson_id: lessonId,
        p_content: content,
        p_schema_version: schemaVersion,
        p_expected_version: expectedVersion,
    });
    if (error) {
        if (error.code === VERSION_CONFLICT_ERROR_CODE) {
            throw new LessonDocumentConflictError(error.message);
        }
        throw error;
    }
    return data;
}
export async function checkpointLessonDocument(lessonId) {
    const { data, error } = await supabase.rpc("checkpoint_lesson_document", {
        p_lesson_id: lessonId,
    });
    if (error)
        throw error;
    return data;
}
export async function restoreLessonDocumentVersion(lessonId, version) {
    const { data, error } = await supabase.rpc("restore_lesson_document_version", {
        p_lesson_id: lessonId,
        p_version: version,
    });
    if (error)
        throw error;
    return data;
}
