/**
 * Aceita apenas caminhos internos (um único "/" inicial) — nunca URLs
 * absolutas nem "//host" (protocol-relative) — para evitar open redirect
 * via parâmetros de busca manipulados (ex.: /login?redirect=...).
 */
export function isSafeInternalPath(value: string): boolean {
  return /^\/(?!\/|\\)/.test(value);
}
