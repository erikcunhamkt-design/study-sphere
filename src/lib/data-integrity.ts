/**
 * Utilitários de resiliência da cadeia cognitiva.
 *
 * Regra: um elo quebrado (relação inválida, entidade ausente, formato
 * inesperado) nunca pode derrubar a renderização. A entidade inválida é
 * ignorada e o problema é registrado no console para observabilidade.
 * Nunca registrar o conteúdo da resposta do usuário.
 */

export function safeArray<T>(value: unknown, context?: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return [];
  logIntegrityIssue("invalid_relation", {
    context,
    receivedType: typeof value,
  });
  return [];
}

export type IntegrityIssue =
  | "invalid_relation"
  | "missing_concept"
  | "missing_question"
  | "invalid_session"
  | "rpc_failure"
  | "query_failure";

export function logIntegrityIssue(
  issue: IntegrityIssue,
  meta: Record<string, unknown> = {},
) {
  // Somente metadados estruturais — nunca respostas ou conteúdo do usuário.
  console.warn("[data-integrity]", issue, {
    ...meta,
    at: new Date().toISOString(),
  });
}
