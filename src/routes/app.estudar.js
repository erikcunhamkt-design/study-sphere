import { createFileRoute } from "@tanstack/react-router";
import { Brain, Columns3, MessageCircleQuestion, Play, Timer, Zap } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-shell";
import { BlurtingSession } from "@/features/study-sessions/blurting-session";
import { CornellSession } from "@/features/study-sessions/cornell-session";
import { FeynmanSession } from "@/features/study-sessions/feynman-session";
import { LivreSession } from "@/features/study-sessions/livre-session";
import { PomodoroSession } from "@/features/study-sessions/pomodoro-session";
import { STUDY_METHOD_LABELS } from "@/features/study-sessions/labels";
import { RecordacaoAtivaHub } from "@/features/study-sessions/recordacao-ativa-hub";
import { ResumeBanner } from "@/features/study-sessions/resume-banner";
export const Route = createFileRoute("/app/estudar")({
    validateSearch: (search) => {
        const plannedId = typeof search.plannedId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.plannedId)
            ? search.plannedId
            : undefined;
        const method = typeof search.method === "string" && METHODS.some(m => m.method === search.method)
            ? search.method
            : undefined;
        return { plannedId, method };
    },
    component: EstudarPage,
});
const METHODS = [
    {
        method: "pomodoro",
        description: "Blocos de foco e pausa com os tempos das suas preferências.",
        icon: Timer,
    },
    {
        method: "feynman",
        description: "Explique o assunto como se estivesse ensinando um iniciante.",
        icon: MessageCircleQuestion,
    },
    {
        method: "blurting",
        description: "Escreva tudo o que lembra, sem consultar nada.",
        icon: Zap,
    },
    {
        method: "cornell",
        description: "Notas, pistas e resumo em três colunas.",
        icon: Columns3,
    },
    {
        method: "recordacao_ativa",
        description: "Teste sua memória com flashcards ou questões.",
        icon: Brain,
    },
    {
        method: "livre",
        description: "Cronômetro simples para qualquer tipo de estudo.",
        icon: Play,
    },
];
function EstudarPage() {
    const { plannedId, method: initialMethod } = Route.useSearch();
    const [activeMethod, setActiveMethod] = useState(initialMethod ?? null);
    const [resumingSession, setResumingSession] = useState(null);
    function backToHub() {
        setActiveMethod(null);
        setResumingSession(null);
    }
    function handleResume(session) {
        setResumingSession(session);
        setActiveMethod(session.method);
    }
    if (activeMethod) {
        const label = STUDY_METHOD_LABELS[activeMethod];
        return (<div className="space-y-6">
        <PageHeader title={label}/>
        {activeMethod === "pomodoro" ? (<PomodoroSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId}/>) : activeMethod === "feynman" ? (<FeynmanSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId}/>) : activeMethod === "blurting" ? (<BlurtingSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId}/>) : activeMethod === "cornell" ? (<CornellSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId}/>) : activeMethod === "livre" ? (<LivreSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId}/>) : (<RecordacaoAtivaHub onBack={backToHub}/>)}
      </div>);
    }
    return (<div className="space-y-6">
      <PageHeader title="Estudar" description="Escolha um método de estudo para começar uma sessão."/>

      <ResumeBanner onResume={handleResume}/>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METHODS.map((m) => (<button key={m.method} type="button" onClick={() => setActiveMethod(m.method)} className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <m.icon className="h-4 w-4" aria-hidden/>
            </span>
            <span className="text-sm font-medium text-foreground">
              {STUDY_METHOD_LABELS[m.method]}
            </span>
            <span className="text-xs text-muted-foreground">{m.description}</span>
          </button>))}
      </div>
    </div>);
}
