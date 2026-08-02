import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import {
  useAddQuestionToExam,
  useExamQuestions,
  useQuestions,
  useRemoveQuestionFromExam,
  useReorderExamQuestions,
} from "./hooks";
import type { ExamRow } from "./types";

const ALL_LESSONS_VALUE = "__todas__";
const NO_LESSON_VALUE = "__avulsa__";

interface ExamComposerProps {
  exam: ExamRow | null;
  onOpenChange: (open: boolean) => void;
}

export function ExamComposer({ exam, onOpenChange }: ExamComposerProps) {
  const examId = exam?.id;
  const [lessonFilter, setLessonFilter] = useState<string>(ALL_LESSONS_VALUE);

  const { data: composed, isLoading: composedLoading } = useExamQuestions(examId);
  const { data: allQuestions } = useQuestions();
  const { data: lessons } = useAllLessons();

  const addQuestion = useAddQuestionToExam(examId ?? "");
  const removeQuestion = useRemoveQuestionFromExam(examId ?? "");
  const reorder = useReorderExamQuestions(examId ?? "");

  const composedIds = useMemo(
    () => new Set((composed ?? []).map((c) => c.question_id)),
    [composed],
  );

  const availableQuestions = useMemo(() => {
    return (allQuestions ?? []).filter((q) => {
      if (q.is_archived || composedIds.has(q.id)) return false;
      if (lessonFilter === ALL_LESSONS_VALUE) return true;
      if (lessonFilter === NO_LESSON_VALUE) return q.lesson_id === null;
      return q.lesson_id === lessonFilter;
    });
  }, [allQuestions, composedIds, lessonFilter]);

  async function handleAdd(questionId: string) {
    if (!examId) return;
    const nextPosition = (composed ?? []).length;
    try {
      await addQuestion.mutateAsync({ questionId, position: nextPosition });
    } catch (err) {
      console.error("[questions] falha ao adicionar questão ao simulado", err);
      toast.error("Não foi possível adicionar a questão");
    }
  }

  async function handleRemove(questionId: string) {
    try {
      await removeQuestion.mutateAsync(questionId);
    } catch (err) {
      console.error("[questions] falha ao remover questão do simulado", err);
      toast.error("Não foi possível remover a questão");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!composed) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= composed.length) return;
    const ids = composed.map((c) => c.question_id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved);
    try {
      await reorder.mutateAsync(ids);
    } catch (err) {
      console.error("[questions] falha ao reordenar simulado", err);
      toast.error("Não foi possível reordenar");
    }
  }

  return (
    <Dialog open={!!exam} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compor: {exam?.title}</DialogTitle>
          <DialogDescription>
            Selecione as questões do seu banco que compõem este simulado. A ordem aqui é a ordem de
            exibição durante a execução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Questões no simulado ({composed?.length ?? 0})
          </p>
          {composedLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !composed || composed.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma questão adicionada ainda.</p>
          ) : (
            <div className="space-y-1">
              {composed.map((item, index) => (
                <div
                  key={item.question_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.question.statement}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mover para cima"
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => void handleMove(index, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mover para baixo"
                      disabled={index === composed.length - 1 || reorder.isPending}
                      onClick={() => void handleMove(index, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover do simulado"
                      disabled={removeQuestion.isPending}
                      onClick={() => void handleRemove(item.question_id)}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Banco de questões</p>
            <Select value={lessonFilter} onValueChange={setLessonFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LESSONS_VALUE}>Todas as aulas</SelectItem>
                <SelectItem value={NO_LESSON_VALUE}>Avulsas</SelectItem>
                {(lessons ?? [])
                  .filter((l) => !l.is_archived)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {availableQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma questão disponível para adicionar com este filtro.
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {availableQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">{q.statement}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Adicionar ao simulado"
                    disabled={addQuestion.isPending}
                    onClick={() => void handleAdd(q.id)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
