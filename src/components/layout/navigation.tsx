import { Link, useRouterState } from "@tanstack/react-router";
import { AppBrand } from "./app-brand";
import {
  BookOpen,
  Home,
  Library,
  ListChecks,
  Layers,
  LineChart,
  LogOut,
  Menu,
  Play,
  Settings,
  Target,
  User as UserIcon,
  RefreshCcw,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { APP_CONFIG } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth, useSignOut } from "@/hooks/use-auth";
import { useProfile, useUpdatePreferences, usePreferences } from "@/hooks/use-preferences";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  mobile?: boolean;
};

export const NAV_GROUPS = [
  {
    label: "PRINCIPAL",
    items: [
      { to: "/app", label: "Início", icon: Home, mobile: true },
    ],
  },
  {
    label: "APRENDER",
    items: [
      { to: "/app/estudar", label: "Estudar", icon: Play, mobile: true },
      { to: "/app/estudar?view=hub", label: "Revisar", icon: RefreshCcw, mobile: true },
    ],
  },
  {
    label: "CONTEÚDO",
    items: [
      { to: "/app/meus-estudos", label: "Meus estudos", icon: BookOpen, mobile: true },
      { to: "/app/biblioteca", label: "Biblioteca", icon: Library },
    ],
  },
  {
    label: "ORGANIZAÇÃO",
    items: [
      { to: "/app/planejamento", label: "Planejamento", icon: Target },
    ],
  },
  {
    label: "PROGRESSO",
    items: [
      { to: "/app/desempenho", label: "Desempenho", icon: LineChart, mobile: true },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
  [...NAV_ITEMS, { to: "/app/configuracoes", label: "Configurações", icon: Settings }].map((i) => [
    i.to,
    i.label,
  ]),
);

export function useCurrentPath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function useBreadcrumbLabel(): string {
  const path = useCurrentPath();
  return ROUTE_LABELS[path] ?? "";
}

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const path = useCurrentPath();
  return (
    <TooltipProvider delayDuration={100}>
      <nav aria-label="Navegação principal" className="flex flex-col gap-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-bold tracking-wider text-muted-foreground/50 mb-1">
                {group.label}
              </h3>
            )}
            {group.items.map((item) => {
              const active = path === item.to || (item.to.includes('?') && path + useRouterState({ select: s => s.location.search }) === item.to);
              const link = (
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                    active && "bg-sidebar-accent/80 text-sidebar-accent-foreground font-semibold shadow-sm",
                    collapsed && "justify-center px-0",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon aria-hidden className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active && "text-primary"
                  )} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.to}>{link}</div>
              );
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}

export function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = useCurrentPath();
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="border-b border-sidebar-border p-4">
        <AppBrand isCollapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <SidebarFooter collapsed={collapsed} settingsActive={path === "/app/configuracoes"} />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          <Menu className="h-4 w-4" aria-hidden />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarFooter({
  collapsed,
  settingsActive,
}: {
  collapsed: boolean;
  settingsActive: boolean;
}) {
  const { user } = useAuth();
  const signOut = useSignOut();
  const { data: profile } = useProfile();
  const initials = getInitials(profile?.full_name || user?.email || "?");

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent transition-colors",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-none mb-1">
                    {profile?.full_name || "Estudante"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-none">
                    {user?.email}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "start" : "end"} className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/app/configuracoes" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

export function MobileNav() {
  const path = useCurrentPath();
  const mobileItems = NAV_ITEMS.filter((i) => i.mobile);
  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {mobileItems.map((item) => {
            const active = path === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 text-[11px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon aria-hidden className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <MobileMenuTrigger />
          </li>
        </ul>
      </nav>
    </>
  );
}

function MobileMenuTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span>Mais</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Navegação</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SidebarNav collapsed={false} />
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <MobileFooter />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileFooter() {
  const signOut = useSignOut();
  return (
    <div className="flex flex-col gap-1">
      <Link
        to="/app/configuracoes"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
      >
        <Settings aria-hidden className="h-4 w-4" /> Configurações
      </Link>
      <button
        type="button"
        onClick={() => signOut()}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
      >
        <LogOut aria-hidden className="h-4 w-4" /> Sair
      </button>
    </div>
  );
}

export function UserMenu() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const { data: profile } = useProfile();
  const initials = getInitials(profile?.full_name || user?.email || "?");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/configuracoes">
            <UserIcon className="mr-2 h-4 w-4" aria-hidden /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase() || "?";
}

export function SidebarStateSync() {
  // hook consumido por app.tsx
  return null;
}

// Expor helpers ao layout
export { usePreferences, useUpdatePreferences };
export { Button };
