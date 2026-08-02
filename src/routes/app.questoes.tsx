import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Plus } from "lucide-react";
import { useState } from "react";

import { EmptyState, PageHeader, Section } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttemptHistory } from "@/features/questions/attempt-history";
import { ExamAttemptRunner } from "@/features/questions/exam-attempt-runner";
import { ExamFormDialog } from "@/features/questions/exam-form-dialog";
import { ExamList } from "@/features/questions/exam-list";
import { useExams, useQuestions, useStartExamAttempt } from "@/features/questions/hooks";
import { QuestionFormDialog } from "@/features/questions/question-form-dialog";
import { QuestionList } from "@/features/questions/question-list";
import type { ExamAttemptRow, ExamRow, FinishExamAttemptResult } from "@/features/questions/types";

export const Route = createFileRoute("/app/questoes")({
  component: QuestoesPage,
});

function QuestoesPage() {
  const [tab, setTab] = useState("banco");
  const [running, setRunning] = useState<{ exam: ExamRow; attempt: ExamAttemptRow } | null>(null);
  const [result, setResult] = useState<{ exam: ExamRow; result: FinishExamAttemptResult } | null>(
    null,
  );
  const startAttempt = useStartExamAttempt();

  async function handleStart(exam: ExamRow) {
    try {
      const attempt = await startAttempt.mutateAsync(exam.id);
      setResult(null);
      setRunning({ exam, attempt });
    } catch (err) {
      console.error("[questions] falha ao iniciar simulado", err);
    }
  }

  if (running) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={running.exam.title}
          description="Responda cada questão com honestidade — o placar final é congelado ao finalizar."
        />
        <ExamAttemptRunner
          exam={running.exam}
          attempt={running.attempt}
          onFinish={(res) => {
            setResult({ exam: running.exam, result: res });
            setRunning(null);
          }}
          onExit={() => setRunning(null)}
        />
      </div>
    );
  }

  if (result) {
    const pct =
      result.result.score_total > 0
        ? Math.round((result.result.score_correct / result.result.score_total) * 100)
        : null;
    return (
      <div className="space-y-6">
        <PageHeader title="Resultado" description={result.exam.title} />
        <div className="space-y-4 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-4xl font-semibold text-foreground">
            {result.result.score_correct}/{result.result.score_total}
          </p>
          {pct !== null ? <p className="text-sm text-muted-foreground">{pct}% de acerto</p> : null}
          <Button onClick={() => setResult(null)}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questões"
        description="Crie questões, monte simulados e pratique com feedback imediato."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="banco">Banco de questões</TabsTrigger>
          <TabsTrigger value="simulados">Simulados</TabsTrigger>
        </TabsList>

        <TabsContent value="banco">
          <QuestionBankPanel />
        </TabsContent>

        <TabsContent value="simulados">
          <div className="space-y-6">
            <ExamsPanel
              onStart={(exam) => void handleStart(exam)}
              startPending={startAttempt.isPending}
            />
            <Section title="Tentativas anteriores">
              <AttemptHistory />
            </Section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionBankPanel() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: questions, isLoading } = useQuestions();
  const hasQuestions = !!questions && questions.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova questão
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !hasQuestions ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Sem questões criadas"
          description="Crie sua primeira questão para praticar avulsa ou compor um simulado."
        />
      ) : (
        <QuestionList questions={questions} />
      )}

      <QuestionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function ExamsPanel({
  onStart,
  startPending,
}: {
  onStart: (exam: ExamRow) => void;
  startPending: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const { data: exams, isLoading } = useExams();
  const hasExams = !!exams && exams.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Novo simulado
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !hasExams ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Sem simulados criados"
          description="Crie um simulado e adicione questões do seu banco para praticar em conjunto."
        />
      ) : (
        <ExamList exams={exams} onStart={onStart} startDisabled={startPending} />
      )}

      <ExamFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
