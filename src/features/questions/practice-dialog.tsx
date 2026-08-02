import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSubmitQuestionAttempt } from "./hooks";
import type { QuestionRow, SubmitQuestionAttemptResult } from "./types";

interface PracticeDialogProps {
  question: QuestionRow | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Prática avulsa: responde uma questão fora de qualquer simulado
 * (exam_attempt_id nulo). O feedback exibido (is_correct) vem sempre da
 * RPC — o cliente nunca calcula acerto sozinho, mesmo em múltipla
 * escolha onde teria os dados para isso.
 */
export function PracticeDialog({ question, onOpenChange }: PracticeDialogProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [result, setResult] = useState<SubmitQuestionAttemptResult | null>(null);
  const submitAttempt = useSubmitQuestionAttempt();

  useEffect(() => {
    setSelectedOptionIndex(null);
    setAnswerRevealed(false);
    setResult(null);
  }, [question?.id]);

  if (!question) return null;

  async function handleSubmitMultipleChoice() {
    if (selectedOptionIndex === null || !question) return;
    try {
      const res = await submitAttempt.mutateAsync({
        questionId: question.id,
        selectedOptionIndex,
      });
      setResult(res);
    } catch (err) {
      console.error("[questions] falha ao registrar resposta", err);
      toast.error("Não foi possível registrar sua resposta");
    }
  }

  async function handleSelfAssess(correct: boolean) {
    if (!question) return;
    try {
      const res = await submitAttempt.mutateAsync({
        questionId: question.id,
        selfAssessedCorrect: correct,
      });
      setResult(res);
    } catch (err) {
      console.error("[questions] falha ao registrar resposta", err);
      toast.error("Não foi possível registrar sua resposta");
    }
  }

  return (
    <Dialog open={!!question} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Praticar</DialogTitle>
          <DialogDescription>{question.statement}</DialogDescription>
        </DialogHeader>

        {question.type === "multipla_escolha" ? (
          <div className="space-y-4">
            <RadioGroup
              value={selectedOptionIndex === null ? undefined : String(selectedOptionIndex)}
              onValueChange={(v) => setSelectedOptionIndex(Number(v))}
              className="space-y-2"
            >
              {question.options.map((opt, index) => {
                const isCorrectOption = result && index === question.correct_option_index;
                const isSelectedWrong =
                  result && !result.is_correct && index === selectedOptionIndex;
                return (
                  <Label
                    key={index}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm",
                      isCorrectOption && "border-green-600 bg-green-600/10",
                      isSelectedWrong && "border-destructive bg-destructive/10",
                    )}
                  >
                    <RadioGroupItem value={String(index)} disabled={!!result} />
                    {opt}
                  </Label>
                );
              })}
            </RadioGroup>

            {result ? (
              <ResultBanner isCorrect={result.is_correct} />
            ) : (
              <Button
                onClick={() => void handleSubmitMultipleChoice()}
                disabled={selectedOptionIndex === null || submitAttempt.isPending}
                className="w-full"
              >
                Responder
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {answerRevealed ? (
              <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                {question.expected_answer}
              </div>
            ) : null}

            {result ? (
              <ResultBanner isCorrect={result.is_correct} />
            ) : !answerRevealed ? (
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultBanner({ isCorrect }: { isCorrect: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border p-3 text-sm font-medium",
        isCorrect
          ? "border-green-600 bg-green-600/10 text-green-700 dark:text-green-400"
          : "border-destructive bg-destructive/10 text-destructive",
      )}
      role="status"
    >
      {isCorrect ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      ) : (
        <XCircle className="h-4 w-4" aria-hidden />
      )}
      {isCorrect ? "Você acertou" : "Você errou"}
    </div>
  );
}
