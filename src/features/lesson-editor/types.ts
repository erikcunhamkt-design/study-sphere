import type { LessonDocument } from "./document-schema";

export interface LessonDocumentRow {
  id: string;
  lesson_id: string;
  user_id: string;
  content: LessonDocument;
  schema_version: number;
  version: number;
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

/** Código Postgres para "serialization_failure" — usado aqui como o sinal de conflito de versão otimista (ERRCODE 40001 nas funções da Fase 03.1). */
export const VERSION_CONFLICT_ERROR_CODE = "40001";

export class LessonDocumentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonDocumentConflictError";
  }
}
