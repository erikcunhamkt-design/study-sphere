import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RouteLoading } from "@/components/route-loading";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Informe seu nome").max(100),
    email: z.string().trim().email("E-mail inválido").max(255),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua uma letra")
      .regex(/\d/, "Inclua um número"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

export const Route = createFileRoute("/cadastro")({
  // Mesma razão de /app e /: a checagem de sessão só é confiável no cliente.
  ssr: false,
  beforeLoad: ({ context }) => redirectIfAuthenticated(context.auth),
  pendingComponent: RouteLoading,
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ fullName, email, password, confirm, terms });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setSubmitting(false);
    if (error) {
      console.error("[signUp]", error);
      toast.error("Não foi possível criar a conta", {
        description: friendlyAuthError(error.message),
      });
      return;
    }
    toast.success("Conta criada!", {
      description: "Se necessário, confirme seu e-mail para continuar.",
    });
    navigate({ to: "/login" });
  }

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Alguns segundos e você começa a estudar."
      footer={
        <span>
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Nome" id="fullName" error={errors.fullName}>
          <Input
            id="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Field label="E-mail" id="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Senha"
          id="password"
          error={errors.password}
          hint="Mínimo 8 caracteres com letra e número"
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmar senha" id="confirm" error={errors.confirm}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
          <div className="flex-1">
            <Label htmlFor="terms" className="text-sm font-normal">
              Aceito os termos de uso e a política de privacidade
            </Label>
            {errors.terms ? <p className="text-xs text-destructive mt-1">{errors.terms}</p> : null}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
