import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Chrome, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouteLoading } from "@/components/route-loading";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { isSafeInternalPath } from "@/lib/safe-redirect";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const Route = createFileRoute("/login")({
  // Mesma razão de /app e /: a checagem de sessão só é confiável no cliente.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    if (typeof search.redirect === "string" && isSafeInternalPath(search.redirect)) {
      return { redirect: search.redirect };
    }
    return {};
  },
  beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth),
  pendingComponent: RouteLoading,
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      console.error("[signInWithPassword]", error);
      toast.error("Não foi possível entrar", { description: friendlyAuthError(error.message) });
      return;
    }
    toast.success("Bem-vindo de volta!");
    if (redirectTo) {
      navigate({ href: redirectTo, replace: true });
    } else {
      navigate({ to: "/app", replace: true });
    }
  }

  // Login com Google (Lovable OAuth) fica oculto por ora: o fluxo completo
  // (callback, criação de profiles/user_preferences, ausência de duplicação
  // de usuário) não pôde ser testado ponta a ponta nesta auditoria. Ver
  // docs/AUDITORIA_FASE_01_1.md §7. A integração (src/integrations/lovable)
  // permanece intacta para reativação futura após teste completo.

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acesse seus estudos e continue de onde parou."
      footer={
        <span>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="text-primary font-medium hover:underline">
            Criar conta
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined}
          />
          {errors.email ? (
            <p id="email-err" className="text-xs text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to="/recuperar-senha"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Esqueceu?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "pass-err" : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p id="pass-err" className="text-xs text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
