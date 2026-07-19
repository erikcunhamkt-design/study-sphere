import { useEffect, useState } from "react";
import { Search, Sparkles, Sun, Moon, MonitorSmartphone, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { usePreferences } from "@/hooks/use-preferences";
import { UserMenu, useBreadcrumbLabel } from "./navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const label = useBreadcrumbLabel();
  const { data: prefs } = usePreferences();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/app">StudyOS</BreadcrumbLink>
          </BreadcrumbItem>
          {label && label !== "Início" ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => setSearchOpen(true)}
                aria-label="Pesquisa global"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline text-xs">Pesquisar</span>
                <kbd className="hidden md:inline text-[10px] rounded border border-border px-1 py-0.5 text-muted-foreground">
                  Ctrl K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pesquisar (Ctrl+K)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <QuickCreate />

        <DailyGoalIndicator minutes={prefs?.daily_study_goal_minutes ?? 60} />

        <ThemeToggle />

        <UserMenu />
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pesquisa global</DialogTitle>
            <DialogDescription>
              A indexação de conteúdo será implementada em uma fase posterior. Por enquanto, use a
              navegação lateral.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Atalho: <kbd className="rounded border border-border px-1">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-border px-1">K</kbd>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function QuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Criação rápida">
          <Sparkles className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Criar rapidamente</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {["Anotação", "Curso", "Flashcard", "Questão", "Sessão de estudo"].map((item) => (
          <DropdownMenuItem key={item} disabled>
            <span className="flex-1">{item}</span>
            <Badge variant="secondary" className="ml-2 text-[10px]">
              Em breve
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DailyGoalIndicator({ minutes }: { minutes: number }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="hidden md:flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
            aria-label={`Meta diária: ${minutes} minutos`}
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            <span>{minutes} min</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Meta diária de estudo</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorSmartphone;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alternar tema">
          <Icon className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" aria-hidden /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" aria-hidden /> Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorSmartphone className="mr-2 h-4 w-4" aria-hidden /> Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
