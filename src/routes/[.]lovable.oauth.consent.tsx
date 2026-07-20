import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

type OAuthClient = { name?: string; client_id?: string; redirect_uri?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Typed shim for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: session lives in localStorage, unavailable during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) {
      throw new Error("Parâmetro authorization_id ausente");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      throw redirect({ href: immediate });
    }
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <AuthShell title="Autorização" subtitle="Não foi possível carregar esta solicitação.">
      <p className="text-sm text-destructive">{String((error as Error)?.message ?? error)}</p>
    </AuthShell>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "um aplicativo";
  const redirectUri = details?.client?.redirect_uri;
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <AuthShell
      title={`Conectar ${clientName} ao StudyOS`}
      subtitle="Este aplicativo poderá usar as ferramentas do StudyOS como você."
    >
      <div className="space-y-4 text-sm">
        {redirectUri ? (
          <p className="text-muted-foreground">
            Redireciona para: <span className="font-mono text-xs">{redirectUri}</span>
          </p>
        ) : null}

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="font-medium">O que este acesso permite:</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>Chamar as ferramentas MCP habilitadas do StudyOS enquanto você estiver conectado.</li>
            <li>Ler seus dados respeitando as regras de acesso do StudyOS (RLS).</li>
          </ul>
          {scopes.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Escopos solicitados: {scopes.join(", ")}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Isso não ignora as permissões do StudyOS nem as políticas do banco de dados.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={busy !== null}
            onClick={() => decide(true)}
          >
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy !== null}
            onClick={() => decide(false)}
          >
            {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar conexão"}
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
