import { History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCheckpointLessonDocument,
  useLessonDocumentVersions,
  useRestoreLessonDocumentVersion,
} from "./hooks";
import type { LessonDocumentVersionRow, VersionReason } from "./types";

const REASON_LABELS: Record<VersionReason, string> = {
  automatic: "Automático",
  manual: "Checkpoint manual",
  before_restore: "Antes de restaurar",
};

interface HistoryPanelProps {
  lessonId: string;
  documentId: string | undefined;
}

/**
 * Histórico básico — só existe se já houver um documento (documentId).
 * Painel lateral, não uma barra fixa: só aparece quando aberto, não cobre
 * o texto do caderno.
 */
export function HistoryPanel({ lessonId, documentId }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<LessonDocumentVersionRow | null>(null);
  const { data: versions, isLoading } = useLessonDocumentVersions(documentId);
  const checkpoint = useCheckpointLessonDocument(lessonId);
  const restore = useRestoreLessonDocumentVersion(lessonId);

  async function handleCheckpoint() {
    try {
      const result = await checkpoint.mutateAsync();
      if (result.snapshot_created) {
        toast.success("Checkpoint criado");
      } else {
        toast.info("Nada de novo desde o último snapshot");
      }
    } catch (err) {
      console.error("[checkpointLessonDocument]", err);
      toast.error("Não foi possível criar o checkpoint");
    }
  }

  async function handleConfirmRestore() {
    if (!pendingRestore) return;
    try {
      await restore.mutateAsync(pendingRestore.version);
      toast.success(`Restaurado para a versão ${pendingRestore.version}`);
      setPendingRestore(null);
      setOpen(false);
    } catch (err) {
      console.error("[restoreLessonDocumentVersion]", err);
      toast.error("Não foi possível restaurar essa versão");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" disabled={!documentId}>
            <History className="mr-2 h-4 w-4" aria-hidden />
            Histórico
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Histórico de versões</SheetTitle>
            <SheetDescription>
              Snapshots automáticos (a cada 5 minutos com alteração real) e checkpoints manuais.
              Máximo de 30 versões guardadas.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCheckpoint}
              disabled={checkpoint.isPending || !documentId}
            >
              Criar checkpoint agora
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : !versions || versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma versão salva ainda.</p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Versão {v.version}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {REASON_LABELS[v.reason]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(v.created_at))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRestore(v)}
                    aria-label={`Restaurar versão ${v.version}`}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Restaurar
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingRestore} onOpenChange={(next) => !next && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar a versão {pendingRestore?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual será salvo como um snapshot antes de restaurar, então nada se perde
              — mas o caderno vai voltar a ficar como estava nessa versão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} disabled={restore.isPending}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
