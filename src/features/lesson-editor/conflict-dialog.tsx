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
import type { LessonDocumentRow } from "./types";

interface ConflictDialogProps {
  open: boolean;
  remoteDocument: LessonDocumentRow | null | undefined;
  onKeepMine: (remoteVersion: number) => void;
  onLoadRemote: () => void;
}

/**
 * Aparece quando save_lesson_document retorna ERRCODE 40001 — a versão no
 * servidor avançou (outra aba, outro dispositivo) desde o último carregamento
 * aqui. Nunca decide sozinho: o usuário escolhe explicitamente entre manter
 * o que estava escrevendo ou carregar a versão mais recente. AlertDialog não
 * fecha com Escape/clique fora, então essa decisão não é perdida por acidente.
 */
export function ConflictDialog({
  open,
  remoteDocument,
  onKeepMine,
  onLoadRemote,
}: ConflictDialogProps) {
  const remoteUpdatedAt = remoteDocument
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(remoteDocument.updated_at),
      )
    : null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Esta aula foi editada em outro lugar</AlertDialogTitle>
          <AlertDialogDescription>
            {remoteUpdatedAt
              ? `A versão salva mais recentemente é de ${remoteUpdatedAt} (outra aba ou dispositivo). `
              : ""}
            Suas alterações aqui ainda não foram salvas. Escolha o que fazer — nada será sobrescrito
            automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLoadRemote}>Carregar versão mais recente</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => remoteDocument && onKeepMine(remoteDocument.version)}
            disabled={!remoteDocument}
          >
            Manter minhas alterações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
