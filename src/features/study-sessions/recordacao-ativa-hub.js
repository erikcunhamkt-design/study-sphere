import { useState } from "react";
import { Layers, ListChecks, ChevronLeft, Play, RotateCcw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDueFlashcards, useDueFlashcardsByDeck, useFlashcardsByDeck } from "@/features/flashcards/hooks";
import { ReviewSession } from "@/features/flashcards/review-session";
import { useExams, useStartExamAttempt } from "@/features/questions/hooks";
import { ExamAttemptRunner } from "@/features/questions/exam-attempt-runner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecks } from "@/features/decks/hooks";
export function RecordacaoAtivaHub({ onBack, deckId: initialDeckId, mode: initialMode }) {
    const [view, setView] = useState(initialDeckId ? (initialMode === "training" ? "flashcards_training" : "flashcards") : "hub");
    const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
    const { data: globalDueFlashcards, isLoading: loadingFlashcards } = useDueFlashcards();
    const { data: decks, isLoading: loadingDecks } = useDecks();
    // Queries específicas do baralho
    const { data: deckDueFlashcards, isLoading: loadingDeckDue } = useDueFlashcardsByDeck(selectedDeckId);
    const { data: deckAllFlashcards, isLoading: loadingDeckAll } = useFlashcardsByDeck(selectedDeckId);
    const dueFlashcards = selectedDeckId ? deckDueFlashcards : globalDueFlashcards;
    const { data: exams, isLoading: loadingExams } = useExams();
    const startExam = useStartExamAttempt();
    const [activeAttempt, setActiveAttempt] = useState(null);
    const handleStartExam = async (exam) => {
        try {
            const attempt = await startExam.mutateAsync(exam.id);
            setActiveAttempt({ exam, attempt });
            setView("exam_runner");
        }
        catch (error) {
            console.error("Erro ao iniciar simulado:", error);
        }
    };
    if (view === "flashcards_training" && deckAllFlashcards) {
        return (<ReviewSession queue={deckAllFlashcards} onFinish={() => onBack()} isTrainingMode={true}/>);
    }
    if (view === "flashcards" && dueFlashcards) {
        return (<ReviewSession queue={dueFlashcards} onFinish={() => setView("hub")}/>);
    }
    if (view === "exam_runner" && activeAttempt) {
        return (<ExamAttemptRunner exam={activeAttempt.exam} attempt={activeAttempt.attempt} onFinish={(result) => {
                setView("hub");
                setActiveAttempt(null);
            }} onExit={() => {
                setView("hub");
                setActiveAttempt(null);
            }}/>);
    }
    if (view === "questions_list") {
        return (<div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("hub")}>
            <ChevronLeft className="h-4 w-4"/>
          </Button>
          <h3 className="font-semibold">Escolha um Simulado</h3>
        </div>
        
        {loadingExams ? (<div className="space-y-2">
            <Skeleton className="h-12 w-full"/>
            <Skeleton className="h-12 w-full"/>
          </div>) : !exams || exams.length === 0 ? (<p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum simulado encontrado. Crie um em Estudos para praticar aqui.
          </p>) : (<div className="grid gap-2">
            {exams.map((exam) => (<button key={exam.id} onClick={() => handleStartExam(exam)} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40">
                <div>
                  <p className="text-sm font-medium">{exam.title}</p>
                  {exam.description && (<p className="text-xs text-muted-foreground">{exam.description}</p>)}
                </div>
                <ListChecks className="h-4 w-4 text-muted-foreground"/>
              </button>))}
          </div>)}
      </div>);
    }
    if (view === "deck_selection") {
        return (<div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("hub")}>
            <ChevronLeft className="h-4 w-4"/>
          </Button>
          <h3 className="font-semibold">Escolha um Baralho</h3>
        </div>

        {loadingDecks ? (<div className="space-y-2">
            <Skeleton className="h-12 w-full"/>
            <Skeleton className="h-12 w-full"/>
          </div>) : !decks || decks.length === 0 ? (<p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum baralho encontrado. Crie um na Biblioteca para estudar aqui.
          </p>) : (<div className="grid gap-2">
            {decks.map((deck) => (<button key={deck.id} onClick={() => {
                        setSelectedDeckId(deck.id);
                        setView("deck_mode_selection");
                    }} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: deck.color || "#3b82f6" }}/>
                  <span className="text-sm font-medium">{deck.name}</span>
                </div>
                <Layers className="h-4 w-4 text-muted-foreground"/>
              </button>))}
          </div>)}
      </div>);
    }
    if (view === "deck_mode_selection" && selectedDeckId) {
        const deck = decks?.find(d => d.id === selectedDeckId);
        return (<div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("deck_selection")}>
            <ChevronLeft className="h-4 w-4"/>
          </Button>
          <h3 className="font-semibold">{deck?.name}</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Escolha como deseja praticar este baralho.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => setView("flashcards")} disabled={loadingDeckDue || !deckDueFlashcards?.length} className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <RotateCcw className="h-4 w-4"/>
            </span>
            <div className="text-left">
              <span className="block text-sm font-medium text-foreground">Revisar devidos</span>
              <span className="text-xs text-muted-foreground">
                {loadingDeckDue ? "..." : `${deckDueFlashcards?.length ?? 0} cartões`}
              </span>
            </div>
          </button>

          <button onClick={() => setView("flashcards_training")} disabled={loadingDeckAll || !deckAllFlashcards?.length} className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Play className="h-4 w-4"/>
            </span>
            <div className="text-left">
              <span className="block text-sm font-medium text-foreground">Estudar tudo</span>
              <span className="text-xs text-muted-foreground">Modo treino</span>
            </div>
          </button>
        </div>
      </div>);
    }
    return (<div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-10 transition-all">
      <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none"/>
      
      <div className="relative z-10 space-y-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-[0_0_20px_rgba(217,0,110,0.2)]">
          <Brain className="h-8 w-8 fill-primary/20"/>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tighter">Recordação Ativa</h3>
          <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto font-medium">
            Testar sua memória é mais eficiente que reler. Escolha como quer praticar hoje.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => {
            setSelectedDeckId(undefined);
            setView("flashcards");
        }} disabled={loadingFlashcards || !globalDueFlashcards?.length} className="group flex flex-col p-6 rounded-2xl border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30 disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors mb-4">
              <Layers className="h-5 w-5"/>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">Revisar geral</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                {loadingFlashcards ? "Carregando..." : `${globalDueFlashcards?.length ?? 0} devidos`}
              </span>
            </div>
          </button>

          <button onClick={() => setView("deck_selection")} className="group flex flex-col p-6 rounded-2xl border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors mb-4">
              <Layers className="h-5 w-5"/>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">Por baralho</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                Escolher acervo
              </span>
            </div>
          </button>

          <button onClick={() => setView("questions_list")} className="group flex flex-col p-6 rounded-2xl border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors mb-4">
              <ListChecks className="h-5 w-5"/>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">Simulados</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                Praticar questões
              </span>
            </div>
          </button>
        </div>

        <Button variant="ghost" onClick={onBack} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary">
          Voltar ao Hub de Métodos
        </Button>
      </div>
    </div>);
}
