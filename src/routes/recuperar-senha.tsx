import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({ email: z.string().trim().email("E-mail inválido") });

export const Route = createFileRoute("/recuperar-senha")({
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "E-mail inválido");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail");
      return;
    }
    setSent(true);
    toast.success("E-mail enviado", { description: "Confira sua caixa de entrada." });
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para você redefinir sua senha."
      footer={
        <span>
          Lembrou a senha?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </span>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm">
          Se existir uma conta com <strong>{email}</strong>, você receberá um e-mail com instruções
          em instantes.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
