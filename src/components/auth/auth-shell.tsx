import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { APP_CONFIG } from "@/lib/app-config";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background text-foreground">
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-sidebar border-r border-sidebar-border">
        <Link to="/" className="inline-flex items-center gap-2 text-sidebar-foreground">
          <img
            src="/logo-dominus.png"
            alt="DominusApp Logo"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight">{APP_CONFIG.name}</span>
        </Link>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-sidebar-foreground">
            Do estudo ao domínio.
          </h2>
          <p className="text-sm text-muted-foreground">
            Áreas de conhecimento, anotações, flashcards, questões e revisão espaçada — reunidos em
            um único fluxo, do primeiro estudo ao domínio completo.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_CONFIG.name}
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="lg:hidden mb-8 inline-flex items-center gap-2 text-foreground">
            <img
              src="/logo-dominus.png"
              alt="DominusApp Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold">{APP_CONFIG.name}</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
