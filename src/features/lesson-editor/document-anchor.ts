/**
 * A mesma estrutura de escrita (editor, autosave, versionamento) agora
 * serve dois contextos: o caderno de uma aula ou a escrita livre de um
 * curso. Nunca os dois ao mesmo tempo — mesma regra do banco
 * (lesson_documents_exactly_one_anchor_check, migration
 * 20260816230000_curso_free_writing_document).
 */
export type DocumentAnchor =
  { lessonId: string; courseId?: never } | { lessonId?: never; courseId: string };

/** Chave estável para uso em contextos que só precisam de um identificador opaco (IndexedDB, BroadcastChannel, caminho de storage). */
export function anchorKey(anchor: DocumentAnchor): string {
  return anchor.lessonId ? `lesson-${anchor.lessonId}` : `course-${anchor.courseId}`;
}

/**
 * Como DocumentAnchor, mas permite "nenhum dos dois" — um Flashcard/
 * Questão pode nascer avulso (biblioteca), de uma aula ou de um curso,
 * diferente de um lesson_document que sempre tem exatamente uma âncora.
 * Um DocumentAnchor real é atribuível aqui sem conversão (string é
 * atribuível a string | null) — usado como prefill de criação nos
 * diálogos de Flashcard/Questão.
 */
export type CreationAnchor =
  { lessonId: string | null; courseId?: never } | { lessonId?: never; courseId: string };
