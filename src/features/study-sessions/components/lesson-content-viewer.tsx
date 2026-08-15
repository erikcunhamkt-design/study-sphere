import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import { lessonEditorSchema } from "@/features/lesson-editor/schema";
import { resolveMediaUrl } from "@/features/lesson-editor/media-upload";
import { pt } from "@blocknote/core/locales";
import { useTheme } from "@/hooks/use-theme";

interface LessonContentViewerProps {
  lessonId: string;
}

export function LessonContentViewer({ lessonId }: LessonContentViewerProps) {
  const { resolvedTheme } = useTheme();
  const { data: doc, isLoading, isError } = useLessonDocument(lessonId);

  const editor = useCreateBlockNote({
    schema: lessonEditorSchema,
    dictionary: pt,
    resolveFileUrl: resolveMediaUrl,
    initialContent: doc?.content as any,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20">
          Carregando material...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4 rounded-[2rem] bg-red-500/5 border border-red-500/10">
        <AlertCircle className="h-10 w-10 text-red-500/40" />
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-widest text-red-500/60">Falha no carregamento</h4>
          <p className="text-xs text-muted-foreground/40 font-medium">Não foi possível recuperar o conteúdo desta aula.</p>
        </div>
      </div>
    );
  }

  const hasContent = doc?.content && Array.isArray(doc.content) && doc.content.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-10 text-center space-y-6 rounded-[2.5rem] border border-dashed border-border/40 bg-surface/10 animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-3xl bg-surface flex items-center justify-center text-muted-foreground/20 shadow-inner">
          <FileText className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black tracking-tight text-foreground/60 uppercase">
            Esta aula ainda não possui material
          </h3>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto font-medium">
            Adicione o conteúdo da aula para começar o primeiro contato.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-editor-bn-theme lesson-viewer-mode">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        editable={false}
        formattingToolbar={false}
        slashMenu={false}
        sideMenu={false}
      />
    </div>
  );
}
