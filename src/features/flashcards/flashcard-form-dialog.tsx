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
import {
  flashcardFormSchema,
  resolveFrontContentForSubmit,
  textFromInlineContent,
  plainTextToInlineContent,
  type FlashcardContent,
  type OriginalFrontContent,
} from "./schema";
import { useCreateFlashcard, useUpdateFlashcardContent } from "./hooks";
import { useDecks } from "@/features/decks/hooks";
import type { FlashcardRow } from "./types";
import type { CreationAnchor } from "@/features/lesson-editor/document-anchor";
import { createCourseConcept } from "@/features/lesson-editor/course-concept";

const AVULSO_VALUE = "__avulso__";

interface FlashcardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preenche a criação a partir de uma conversão bloco→cartão (Pergunta de revisão) ou de um "Novo Cartão" em aula/curso. */
  prefill?: {
    anchor: CreationAnchor;
    sourceBlockId: string | null;
    front: string;
    /** Conteúdo inline rico do bloco original, quando validável — usado se o usuário não editar a frente. */
    frontContent: FlashcardContent | null;
  };
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
  const [deckId, setDeckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Conteúdo rico original (do cartão em edição ou do bloco convertido) e
  // o texto achatado correspondente — se o usuário não tocar no campo
  // Frente, o submit persiste este conteúdo intacto em vez de reduzir
  // tudo a texto simples (achado do Gate 3).
  const [originalFront, setOriginalFront] = useState<OriginalFrontContent | null>(null);
  const submittingRef = useRef(false);

  // Curso: âncora fixa vinda da Escrita Livre, nunca um seletor — o
  // cartão nasce vinculado ao curso (e a um Concept criado em silêncio no
  // submit) e a aba "Aula" some, porque um cartão de curso nunca tem aula.
  const courseId = flashcard ? flashcard.course_id : (prefill?.anchor.courseId ?? null);
  const isCourseAnchored = courseId !== null;

  const { data: lessons } = useAllLessons();
  const { data: decks } = useDecks();
  const activeLessons = (lessons ?? []).filter((l) => !l.is_archived);
  const activeDecks = (decks ?? []).filter((d) => !d.is_archived);

  const createFlashcard = useCreateFlashcard();
  const updateFlashcard = useUpdateFlashcardContent();

  const isPending = createFlashcard.isPending || updateFlashcard.isPending;

  useEffect(() => {
    if (!open) return;
    if (flashcard) {
      const flatFront = textFromInlineContent(flashcard.front);
      setFront(flatFront);
      setBack(textFromInlineContent(flashcard.back));
      setLessonId(flashcard.lesson_id);
      setDeckId(flashcard.deck_id);
      setOriginalFront({ text: flatFront, content: flashcard.front });
    } else {
      const flatFront = prefill?.front ?? "";
      setFront(flatFront);
      setBack("");
      setLessonId(prefill?.anchor.lessonId ?? null);
      setDeckId(null);
      setOriginalFront(
        prefill?.frontContent ? { text: flatFront, content: prefill.frontContent } : null,
      );
    }
    setError(null);
    const id = window.setTimeout(() => frontRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, flashcard, prefill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = flashcardFormSchema.safeParse({
      lessonId: isCourseAnchored ? null : lessonId,
      deckId,
      sourceBlockId: prefill?.sourceBlockId ?? null,
      front: resolveFrontContentForSubmit(front, originalFront),
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
          id: flashcard.id,
          data: {
            lessonId: parsed.data.lessonId,
            deckId: (parsed.data as any).deckId,
            front: parsed.data.front,
            back: parsed.data.back,
          },
        });

        toast.success("Cartão atualizado");
      } else {
        // Curso: cria o Concept em silêncio antes do cartão — nunca pedido
        // ao usuário, nunca exposto como "conceito" na UI.
        const conceptId =
          isCourseAnchored && courseId
            ? await createCourseConcept(courseId, textFromInlineContent(parsed.data.front))
            : null;

        await createFlashcard.mutateAsync({
          lessonId: parsed.data.lessonId,
          courseId,
          conceptId,
          deckId: (parsed.data as any).deckId,
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

          {isCourseAnchored ? null : (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="flashcard-deck">Baralho (opcional)</Label>
            <Select
              value={deckId ?? AVULSO_VALUE}
              onValueChange={(v) => setDeckId(v === AVULSO_VALUE ? null : v)}
            >
              <SelectTrigger id="flashcard-deck">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AVULSO_VALUE}>Nenhum</SelectItem>
                {activeDecks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.color ?? "#3b82f6" }}
                      />
                      {d.name}
                    </div>
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
