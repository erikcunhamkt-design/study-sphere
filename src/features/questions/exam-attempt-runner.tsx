import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useExamQuestions,
  useFinishExamAttempt,
  useQuestionAttempts,
  useSubmitQuestionAttempt,
} from "./hooks";
import type { ExamAttemptRow, ExamRow, FinishExamAttemptResult } from "./types";

interface ExamAttemptRunnerProps {
  exam: ExamRow;
  attempt: ExamAttemptRow;
  onFinish: (result: FinishExamAttemptResult) => void;
  onExit: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Execução do simulado: uma questão por vez, respondida via
 * submit_question_attempt com exam_attempt_id — o placar final só é
 * calculado por finish_exam_attempt, nunca somado no cliente. O timer é
 * puramente consultivo (time_limit_minutes), não interrompe nada.
 */
export function ExamAttemptRunner({ exam, attempt, onFinish, onExit }: ExamAttemptRunnerProps) {
  const { data: examQuestions, isLoading } = useExamQuestions(exam.id);
  const { data: priorAttempts } = useQuestionAttempts(attempt.id);
  const submitAttempt = useSubmitQuestionAttempt();
  const finishAttempt = useFinishExamAttempt();

  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (priorAttempts) {
      setAnsweredIds(new Set(priorAttempts.map((a) => a.question_id)));
    }
  }, [priorAttempts]);

  useEffect(() => {
    const startedAt = new Date(attempt.started_at).getTime();
    // started_at vem do relógio do servidor (now() no INSERT) — se ele
    // estiver um pouco à frente do relógio do cliente (achado do Gate 4:
    // ~3,8s de desvio observado), Date.now() - startedAt fica negativo
    // nos primeiros segundos. Consultivo, não precisa de sincronização de
    // relógio: só piso em zero até o desvio ser superado pelo tempo real.
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [attempt.started_at]);

  const pending = useMemo(
    () => (examQuestions ?? []).filter((eq) => !answeredIds.has(eq.question_id)),
    [examQuestions, answeredIds],
  );
  const current = pending[0];
  const totalCount = examQuestions?.length ?? 0;
  const answeredCount = totalCount - pending.length;

  const timeLimitLabel =
    exam.time_limit_minutes != null
      ? `de ${exam.time_limit_minutes} min (consultivo)`
      : "sem limite definido";

  async function handleSubmitMultipleChoice() {
    if (!current || selectedOptionIndex === null) return;
    try {
      await submitAttempt.mutateAsync({
        questionId: current.question_id,
        selectedOptionIndex,
        examAttemptId: attempt.id,
      });
      setAnsweredIds((prev) => new Set(prev).add(current.question_id));
      setSelectedOptionIndex(null);
    } catch (err) {
      console.error("[questions] falha ao registrar resposta do simulado", err);
      toast.error("Não foi possível registrar sua resposta");
    }
  }

  async function handleSelfAssess(correct: boolean) {
    if (!current) return;
    try {
      await submitAttempt.mutateAsync({
        questionId: current.question_id,
        selfAssessedCorrect: correct,
        examAttemptId: attempt.id,
      });
      setAnsweredIds((prev) => new Set(prev).add(current.question_id));
      setAnswerRevealed(false);
    } catch (err) {
      console.error("[questions] falha ao registrar resposta do simulado", err);
      toast.error("Não foi possível registrar sua resposta");
    }
  }

  async function handleFinish() {
    try {
      const result = await finishAttempt.mutateAsync(attempt.id);
      onFinish(result);
    } catch (err) {
      console.error("[questions] falha ao finalizar simulado", err);
      toast.error("Não foi possível finalizar o simulado");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Questão {Math.min(answeredCount + 1, totalCount)} de {totalCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatElapsed(elapsed)} decorridos · {timeLimitLabel}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Sair sem finalizar
        </Button>
      </div>

      {!current ? (
        <div className="space-y-4 py-6 text-center">
          <p className="text-lg font-medium text-foreground">
            Todas as {totalCount} questões foram respondidas
          </p>
          <Button onClick={() => void handleFinish()} disabled={finishAttempt.isPending}>
            Finalizar simulado
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="min-h-24 rounded-lg border border-border p-4 text-base text-foreground">
            {current.question.statement}
          </div>

          {current.question.type === "multipla_escolha" ? (
            <div className="space-y-3">
              <RadioGroup
                value={selectedOptionIndex === null ? undefined : String(selectedOptionIndex)}
                onValueChange={(v) => setSelectedOptionIndex(Number(v))}
                className="space-y-2"
              >
                {current.question.options.map((opt, index) => (
                  <Label
                    key={index}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value={String(index)} />
                    {opt}
                  </Label>
                ))}
              </RadioGroup>
              <Button
                onClick={() => void handleSubmitMultipleChoice()}
                disabled={selectedOptionIndex === null || submitAttempt.isPending}
                className="w-full"
              >
                Responder e continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {answerRevealed ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {current.question.expected_answer}
                </div>
              ) : null}

              {!answerRevealed ? (
                <Button onClick={() => setAnswerRevealed(true)} className="w-full">
                  Mostrar resposta esperada
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    disabled={submitAttempt.isPending}
                    onClick={() => void handleSelfAssess(false)}
                  >
                    Errei
                  </Button>
                  <Button
                    variant="outline"
                    disabled={submitAttempt.isPending}
                    onClick={() => void handleSelfAssess(true)}
                  >
                    Acertei
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
