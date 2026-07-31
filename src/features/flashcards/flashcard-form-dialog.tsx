import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { flashcardFormSchema, plainTextToInlineContent, textFromInlineContent } from "./schema";
import { useCreateFlashcard, useUpdateFlashcardContent } from "./hooks";
import type { FlashcardRow } from "./types";

const AVULSO_VALUE = "__avulso__";

interface FlashcardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preenche a criação a partir de uma conversão bloco→cartão (Pergunta de revisão). */
  prefill?: { lessonId: string | null; sourceBlockId: string | null; front: string };
  flashcard?: FlashcardRow;
}

export function FlashcardFormDialog({
  open,
  onOpenChange,
  prefill,
  flashcard,
}: FlashcardFormDialogProps) {
  const isEditing = !!flashcard;
  const frontId = useId();
  const backId = useId();
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const { data: lessons } = useAllLessons();
  const activeLessons = (lessons ?? []).filter((l) => !l.is_archived);

  const createFlashcard = useCreateFlashcard();
  const updateFlashcard = useUpdateFlashcardContent(flashcard?.id ?? "");
  const isPending = createFlashcard.isPending || updateFlashcard.isPending;

  useEffect(() => {
    if (!open) return;
    if (flashcard) {
      setFront(textFromInlineContent(flashcard.front));
      setBack(textFromInlineContent(flashcard.back));
      setLessonId(flashcard.lesson_id);
    } else {
      setFront(prefill?.front ?? "");
      setBack("");
      setLessonId(prefill?.lessonId ?? null);
    }
    setError(null);
    const id = window.setTimeout(() => frontRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, flashcard, prefill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = flashcardFormSchema.safeParse({
      lessonId,
      sourceBlockId: prefill?.sourceBlockId ?? null,
      front: plainTextToInlineContent(front.trim()),
      back: plainTextToInlineContent(back.trim()),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Preencha a frente e o verso do cartão.");
      return;
    }
    setError(null);

    submittingRef.current = true;
    try {
      if (isEditing && flashcard) {
        await updateFlashcard.mutateAsync({
          lessonId: parsed.data.lessonId,
          front: parsed.data.front,
          back: parsed.data.back,
        });
        toast.success("Cartão atualizado");
      } else {
        await createFlashcard.mutateAsync({
          lessonId: parsed.data.lessonId,
          sourceBlockId: parsed.data.sourceBlockId,
          front: parsed.data.front,
          back: parsed.data.back,
        });
        toast.success("Cartão criado");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[flashcardForm]", err);
      toast.error(
        isEditing ? "Não foi possível atualizar o cartão" : "Não foi possível criar o cartão",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Alterar o conteúdo não reinicia o agendamento de revisão."
              : "Escreva a pergunta na frente e a resposta no verso."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={frontId}>Frente</Label>
            <Textarea
              id={frontId}
              ref={frontRef}
              value={front}
              maxLength={2000}
              rows={3}
              placeholder="Ex.: O que é RLS?"
              aria-invalid={!!error}
              onChange={(e) => setFront(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={backId}>Verso</Label>
            <Textarea
              id={backId}
              value={back}
              maxLength={2000}
              rows={3}
              placeholder="Ex.: Row Level Security — regra de acesso avaliada pelo banco em cada linha."
              aria-invalid={!!error}
              onChange={(e) => setBack(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="flashcard-lesson">Aula (opcional)</Label>
            <Select
              value={lessonId ?? AVULSO_VALUE}
              onValueChange={(v) => setLessonId(v === AVULSO_VALUE ? null : v)}
            >
              <SelectTrigger id="flashcard-lesson">
                <SelectValue placeholder="Avulso (sem aula)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AVULSO_VALUE}>Avulso (sem aula)</SelectItem>
                {activeLessons.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar cartão"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
