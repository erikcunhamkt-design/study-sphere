/**
 * Traduz mensagens de erro do Supabase Auth (em inglês, formato interno)
 * para mensagens amigáveis em pt-BR. O texto original é preservado no
 * console (via caller) para diagnóstico em desenvolvimento.
 */
export function friendlyAuthError(message: string): string {
  if (/invalid login/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/already registered|already exists|user already/i.test(message)) {
    return "Não foi possível concluir o cadastro. Verifique os dados informados.";
  }
  if (/weak|easy to guess|pwned|leaked/i.test(message)) {
    return "Essa senha é muito fraca ou comum. Escolha uma senha mais forte e menos óbvia.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }
  if (/network|fetch/i.test(message)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  return "Verifique seus dados e tente novamente.";
}
