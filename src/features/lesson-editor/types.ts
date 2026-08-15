import type { LessonDocument } from "./document-schema";

export interface LessonDocumentRow {
  id: string;
  lesson_id: string;
  user_id: string;
  content: LessonDocument;
  schema_version: number;
  version: number;
  published_content: LessonDocument | null;
  published_version: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type VersionReason = "automatic" | "manual" | "before_restore";

export interface LessonDocumentVersionRow {
  id: string;
  document_id: string;
  user_id: string;
  version: number;
  content: LessonDocument;
  schema_version: number;
  reason: VersionReason;
  created_at: string;
}

export interface SaveLessonDocumentResult {
  document_id: string;
  version: number;
  snapshot_created: boolean;
}

export interface RestoreLessonDocumentResult {
  document_id: string;
  version: number;
  restored_from: number;
}

/**
 * SQLSTATE customizado ('VC409') que save_lesson_document usa para sinalizar
 * conflito de versão otimista. Não pode ser 40001 (serialization_failure):
 * o PostgREST/pooler re-executa transações com esse código em loop e a
 * resposta do conflito nunca chega ao cliente (achado do QA da Fase 03.1).
 */
export const VERSION_CONFLICT_ERROR_CODE = "VC409";

export class LessonDocumentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonDocumentConflictError";
  }
}
