import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  Play,
  Search,
  Sparkles,
  Sun,
  Moon,
  MonitorSmartphone,
  Target,
} from "lucide-react";

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
import { useTheme } from "@/hooks/use-theme";
import { usePreferences, useProfile } from "@/hooks/use-preferences";
import { startOfDayIso } from "@/lib/timezone";
import { useStudySessionSecondsSince } from "@/features/study-sessions/hooks";
import { UserMenu, useBreadcrumbLabel } from "./navigation";
import { APP_CONFIG } from "@/lib/app-config";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StudyAreaFormDialog } from "@/features/studies/components/study-area-form-dialog";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { CourseModuleFormDialog } from "@/features/studies/components/course-module-form-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const label = useBreadcrumbLabel();
  const { data: prefs } = usePreferences();
  const { data: profile } = useProfile();
  const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
  const { data: todaySeconds } = useStudySessionSecondsSince(sinceIso);

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
            <BreadcrumbLink href="/app">{APP_CONFIG.name}</BreadcrumbLink>
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

        <DailyGoalIndicator
          todaySeconds={todaySeconds ?? 0}
          goalMinutes={prefs?.daily_study_goal_minutes ?? 60}
        />

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
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const params = useParams({ strict: false }) as {
    areaId?: string;
    courseId?: string;
    moduleId?: string;
  };
  const currentAreaId = params.areaId;
  const currentCourseId = params.courseId;
  const currentModuleId = params.moduleId;
  const hasModuleContext = !!currentCourseId && !!currentModuleId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Criação rápida">
            <Sparkles className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Criar rapidamente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAreaFormOpen(true)}>Nova área</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCourseFormOpen(true)}>Novo curso</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModuleFormOpen(true)}>Novo módulo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLessonFormOpen(true)}>Nova aula</DropdownMenuItem>
          {/* Criação avulsa de flashcards/questões volta aqui quando a Biblioteca existir (Fase 08.x) */}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/app/estudar">
              <Play className="mr-2 h-4 w-4" aria-hidden /> Nova sessão de estudo
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StudyAreaFormDialog open={areaFormOpen} onOpenChange={setAreaFormOpen} />
      <CourseFormDialog
        open={courseFormOpen}
        onOpenChange={setCourseFormOpen}
        defaultAreaId={currentAreaId}
      />
      <CourseModuleFormDialog
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        fixedCourseId={currentCourseId}
      />
      <LessonFormDialog
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        fixedCourseId={hasModuleContext ? currentCourseId : undefined}
        fixedModuleId={hasModuleContext ? currentModuleId : undefined}
      />
    </>
  );
}

function DailyGoalIndicator({
  todaySeconds,
  goalMinutes,
}: {
  todaySeconds: number;
  goalMinutes: number;
}) {
  const todayMinutes = Math.round(todaySeconds / 60);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="hidden md:flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
            aria-label={`Meta diária: ${todayMinutes} de ${goalMinutes} minutos`}
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            <span>
              {todayMinutes}/{goalMinutes} min
            </span>
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
