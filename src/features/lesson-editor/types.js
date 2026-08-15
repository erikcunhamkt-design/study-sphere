/**
 * SQLSTATE customizado ('VC409') que save_lesson_document usa para sinalizar
 * conflito de versão otimista. Não pode ser 40001 (serialization_failure):
 * o PostgREST/pooler re-executa transações com esse código em loop e a
 * resposta do conflito nunca chega ao cliente (achado do QA da Fase 03.1).
 */
export const VERSION_CONFLICT_ERROR_CODE = "VC409";
export class LessonDocumentConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "LessonDocumentConflictError";
    }
}
