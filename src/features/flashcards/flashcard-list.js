import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { textFromInlineContent } from "./schema";
import { FlashcardFormDialog } from "./flashcard-form-dialog";
import { useDeleteFlashcard, useSetFlashcardArchived } from "./hooks";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
const STATE_LABELS = {
    novo: "Novo",
    aprendendo: "Aprendendo",
    revisao: "Em revisão",
};
export function FlashcardList({ cards }) {
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const sorted = [...cards].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (<div className="space-y-2">
      {sorted.map((card) => (<FlashcardRowItem key={card.id} card={card} onEdit={() => setEditing(card)} onDelete={() => setPendingDelete(card)}/>))}

      <FlashcardFormDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} flashcard={editing ?? undefined}/>

      <DeleteFlashcardDialog card={pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}/>
    </div>);
}
function FlashcardRowItem({ card, onEdit, onDelete, }) {
    const setArchived = useSetFlashcardArchived();
    const { data: lessons } = useAllLessons();
    const lesson = card.lesson_id ? lessons?.find((l) => l.id === card.lesson_id) : null;
    async function handleToggleArchive() {
        try {
            await setArchived.mutateAsync({ id: card.id, isArchived: !card.is_archived });
            toast.success(card.is_archived ? "Cartão reativado" : "Cartão arquivado");
        }
        catch (err) {
            console.error("[flashcards] falha ao arquivar/reativar", err);
            toast.error("Não foi possível atualizar o cartão");
        }
    }
    return (<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {lesson ? (<Badge variant="outline" className="gap-1 border-primary/20 text-primary/80 text-[10px] py-0">
              <GraduationCap className="h-3 w-3"/>
              {lesson.title}
            </Badge>) : (<Badge variant="outline" className="gap-1 text-muted-foreground text-[10px] py-0">
              <BookOpen className="h-3 w-3"/>
              Avulso
            </Badge>)}
          <Badge variant="secondary" className="shrink-0 text-[10px] py-0">
            {STATE_LABELS[card.state]}
          </Badge>
          {card.is_archived ? (<Badge variant="secondary" className="shrink-0 text-[10px] py-0">
              Arquivado
            </Badge>) : null}
        </div>
        <p className="truncate text-sm font-medium text-foreground">
          {textFromInlineContent(card.front)}
        </p>
        <p className="truncate text-xs text-muted-foreground">{textFromInlineContent(card.back)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Editar cartão" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden/>
        </Button>
        <Button variant="ghost" size="icon" aria-label={card.is_archived ? "Reativar cartão" : "Arquivar cartão"} onClick={() => void handleToggleArchive()} disabled={setArchived.isPending}>
          {card.is_archived ? (<ArchiveRestore className="h-4 w-4" aria-hidden/>) : (<Archive className="h-4 w-4" aria-hidden/>)}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Excluir cartão" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden/>
        </Button>
      </div>
    </div>);
}
function DeleteFlashcardDialog({ card, onOpenChange, }) {
    const deleteFlashcard = useDeleteFlashcard();
    async function handleConfirm() {
        if (!card)
            return;
        try {
            await deleteFlashcard.mutateAsync(card.id);
            toast.success("Cartão excluído");
            onOpenChange(false);
        }
        catch (err) {
            console.error("[flashcards] falha ao excluir", err);
            toast.error("Não foi possível excluir o cartão");
        }
    }
    return (<AlertDialog open={!!card} onOpenChange={(next) => !deleteFlashcard.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este cartão permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            O histórico de revisões deste cartão também será removido das suas métricas. Essa ação
            não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} disabled={deleteFlashcard.isPending} onClick={() => void handleConfirm()}>
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>);
}
