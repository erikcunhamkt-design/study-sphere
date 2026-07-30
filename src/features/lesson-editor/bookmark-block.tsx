import { createReactBlockSpec } from "@blocknote/react";
import { Bookmark, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSafeUrl } from "./document-schema";

/**
 * Bookmark (Fase 03.2): cartão de link salvo com título editável.
 * Versão deliberadamente privada — NENHUMA busca externa de metadados/
 * preview (nada de requisições a sites de terceiros a partir do caderno);
 * o usuário informa URL e título. Aceita apenas http(s); esquemas
 * perigosos são recusados na entrada E revalidados na renderização
 * (dados persistidos podem ter vindo de fora da UI).
 */

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!/^https?:\/\//i.test(withScheme)) return null;
  if (!isSafeUrl(withScheme)) return null;
  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    return null;
  }
}

function BookmarkEmptyState({ onConfirm }: { onConfirm: (url: string, title: string) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [invalid, setInvalid] = useState(false);

  function confirm() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setInvalid(true);
      return;
    }
    onConfirm(normalized, title.trim() || normalized.replace(/^https?:\/\//i, ""));
  }

  return (
    <div className="my-1 flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bookmark className="h-4 w-4" aria-hidden />
        Link salvo
      </div>
      <Input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        placeholder="https://exemplo.com/artigo"
        aria-label="URL do link"
        aria-invalid={invalid}
      />
      {invalid ? <p className="text-xs text-destructive">Informe uma URL http(s) válida.</p> : null}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        placeholder="Título (opcional)"
        aria-label="Título do link"
      />
      <div>
        <Button size="sm" onClick={confirm}>
          Salvar link
        </Button>
      </div>
    </div>
  );
}

export const bookmarkBlock = createReactBlockSpec(
  {
    type: "bookmark",
    propSchema: {
      url: { default: "" },
      title: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const { url, title } = block.props;

      if (!url) {
        return (
          <BookmarkEmptyState
            onConfirm={(confirmedUrl, confirmedTitle) =>
              editor.updateBlock(block, {
                props: { url: confirmedUrl, title: confirmedTitle },
              })
            }
          />
        );
      }

      // Revalidação defensiva: props persistidas fora da UI nunca geram
      // um href perigoso — o cartão degrada para texto simples.
      const safe = /^https?:\/\//i.test(url) && isSafeUrl(url);
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "";
      }

      const inner = (
        <span className="flex min-w-0 items-center gap-3">
          <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {title || url}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{host || url}</span>
          </span>
          {safe ? (
            <ExternalLink
              className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </span>
      );

      return (
        <div className="my-1 w-full rounded-lg border border-border bg-surface p-3">
          {safe ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block no-underline">
              {inner}
            </a>
          ) : (
            inner
          )}
        </div>
      );
    },
  },
);
