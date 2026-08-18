import { useEffect, useId, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { validateQuestionForm, type QuestionType } from "./schema";
import { useCreateQuestion, useUpdateQuestion } from "./hooks";
import type { QuestionRow } from "./types";
import type { CreationAnchor } from "@/features/lesson-editor/document-anchor";
import { createCourseConcept } from "@/features/lesson-editor/course-concept";

const AVULSO_VALUE = "__avulso__";
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: QuestionRow;
  prefill?: { anchor: CreationAnchor };
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  prefill,
}: QuestionFormDialogProps) {
  const isEditing = !!question;
  const statementId = useId();

  const [type, setType] = useState<QuestionType>("multipla_escolha");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Curso: âncora fixa vinda da Escrita Livre — editar preserva o vínculo
  // (mesmo Concept), criar gera um Concept novo em silêncio no submit.
  const courseId = question ? question.course_id : (prefill?.anchor.courseId ?? null);
  const conceptId = question ? question.concept_id : null;
  const isCourseAnchored = courseId !== null;

  const { data: lessons } = useAllLessons();
  const activeLessons = (lessons ?? []).filter((l) => !l.is_archived);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion(question?.id ?? "");
  const isPending = createQuestion.isPending || updateQuestion.isPending;

  useEffect(() => {
    if (!open) return;
    if (question) {
      setType(question.type);
      setLessonId(question.lesson_id);
      setStatement(question.statement);
      setOptions(question.options.length >= MIN_OPTIONS ? question.options : ["", ""]);
      setCorrectOptionIndex(question.correct_option_index);
      setExpectedAnswer(question.expected_answer ?? "");
    } else {
      setType("multipla_escolha");
      setLessonId(prefill?.anchor.lessonId ?? null);
      setStatement("");
      setOptions(["", ""]);
      setCorrectOptionIndex(null);
      setExpectedAnswer("");
    }
    setError(null);
  }, [open, question, prefill]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectOptionIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (createQuestion.isPending || updateQuestion.isPending) return;

    const effectiveLessonId = isCourseAnchored ? null : lessonId;

    const formValue =
      type === "multipla_escolha"
        ? {
            type,
            lessonId: effectiveLessonId,
            statement,
            options: options.map((o) => o.trim()),
            correctOptionIndex: correctOptionIndex ?? -1,
          }
        : { type, lessonId: effectiveLessonId, statement, expectedAnswer };

    const parsed = validateQuestionForm(formValue);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os campos da questão.");
      return;
    }
    setError(null);

    const input =
      parsed.data.type === "multipla_escolha"
        ? {
            lessonId: parsed.data.lessonId,
            type: parsed.data.type,
            statement: parsed.data.statement,
            options: parsed.data.options,
            correctOptionIndex: parsed.data.correctOptionIndex,
            expectedAnswer: null,
          }
        : {
            lessonId: parsed.data.lessonId,
            type: parsed.data.type,
            statement: parsed.data.statement,
            options: [],
            correctOptionIndex: null,
            expectedAnswer: parsed.data.expectedAnswer,
          };

    try {
      if (isEditing && question) {
        // Curso: preserva o mesmo Concept — editar nunca troca a que
        // conceito a questão está ligada, só o conteúdo.
        await updateQuestion.mutateAsync({ ...input, courseId, conceptId });
        toast.success("Questão atualizada");
      } else {
        // Curso: cria o Concept em silêncio antes da questão — nunca
        // pedido ao usuário, nunca exposto como "conceito" na UI.
        const newConceptId =
          isCourseAnchored && courseId
            ? await createCourseConcept(courseId, input.statement)
            : null;

        await createQuestion.mutateAsync({ ...input, courseId, conceptId: newConceptId });
        toast.success("Questão criada");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[questions] falha ao salvar questão", err);
      toast.error(
        isEditing ? "Não foi possível atualizar a questão" : "Não foi possível criar a questão",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar questão" : "Nova questão"}</DialogTitle>
          <DialogDescription>
            Escolha o tipo, escreva o enunciado e defina a resposta correta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as QuestionType)}
              className="grid grid-cols-2 gap-2"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="multipla_escolha" />
                Múltipla escolha
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="discursiva" />
                Discursiva
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor={statementId}>Enunciado</Label>
            <Textarea
              id={statementId}
              value={statement}
              maxLength={5000}
              rows={3}
              placeholder="Ex.: O que é RLS?"
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>

          {type === "multipla_escolha" ? (
            <div className="space-y-2">
              <Label>Alternativas</Label>
              <RadioGroup
                value={correctOptionIndex === null ? undefined : String(correctOptionIndex)}
                onValueChange={(v) => setCorrectOptionIndex(Number(v))}
                className="space-y-2"
              >
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={String(index)}
                      aria-label={`Marcar alternativa ${index + 1} como correta`}
                    />
                    <Input
                      value={opt}
                      maxLength={500}
                      placeholder={`Alternativa ${index + 1}`}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover alternativa"
                      disabled={options.length <= MIN_OPTIONS}
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={options.length >= MAX_OPTIONS}
                onClick={addOption}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Adicionar alternativa
              </Button>
              <p className="text-xs text-muted-foreground">
                Selecione o marcador da alternativa correta.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="question-expected-answer">Resposta esperada</Label>
              <Textarea
                id="question-expected-answer"
                value={expectedAnswer}
                maxLength={5000}
                rows={3}
                placeholder="O que conta como acerto para esta questão"
                onChange={(e) => setExpectedAnswer(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sem correção automática: ao praticar, você mesmo diz se acertou.
              </p>
            </div>
          )}

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {isCourseAnchored ? null : (
            <div className="space-y-2">
              <Label htmlFor="question-lesson">Aula (opcional)</Label>
              <Select
                value={lessonId ?? AVULSO_VALUE}
                onValueChange={(v) => setLessonId(v === AVULSO_VALUE ? null : v)}
              >
                <SelectTrigger id="question-lesson">
                  <SelectValue placeholder="Avulsa (sem aula)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AVULSO_VALUE}>Avulsa (sem aula)</SelectItem>
                  {activeLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar questão"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
