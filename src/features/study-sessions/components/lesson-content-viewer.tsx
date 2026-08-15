import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Loader2, FileText, AlertCircle, Edit, ArrowLeft } from "lucide-react";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import { lessonEditorSchema } from "@/features/lesson-editor/schema";
import { resolveMediaUrl } from "@/features/lesson-editor/media-upload";
import { pt } from "@blocknote/core/locales";
import { useTheme } from "@/hooks/use-theme";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { LessonDocument } from "@/features/lesson-editor/document-schema";

interface LessonContentViewerProps {
  lessonId: string;
  onMaterialLoad?: (hasRealMaterial: boolean, blocksCount: number) => void;
  canEdit?: boolean;
}

/**
 * Filtra placeholders de QA e blocos vazios do conteúdo real.
 */
function getRealContent(doc: LessonDocument | undefined) {
  if (!doc?.content || !Array.isArray(doc.content)) return [];

  return doc.content.filter((block: any) => {
    // 1. Remover parágrafos vazios ou apenas com espaços
    if (block.type === "paragraph" && (!block.content || block.content.length === 0)) {
      return false;
    }
    if (block.type === "paragraph" && block.content?.length === 1 && block.content[0].text?.trim() === "") {
      return false;
    }

    // 2. Remover placeholders de QA clássicos ("Conteúdo de [tipo]")
    // Estes IDs "qa33-*" são gerados pelo seed de QA.
    if (block.id?.startsWith("qa33-")) {
      const text = block.content?.[0]?.text || "";
      if (text.toLowerCase().includes("conteúdo de")) return false;
      if (text.toLowerCase().includes("qa fase")) return false;
      if (block.type === "image" && !block.props?.url) return false;
    }

    return true;
  });
}

export function LessonContentViewer({ lessonId, onMaterialLoad, canEdit }: LessonContentViewerProps) {
  const { resolvedTheme } = useTheme();
  const { data: doc, isLoading, isError } = useLessonDocument(lessonId);

  const realContent = useMemo(() => getRealContent(doc), [doc]);
  const hasContent = realContent.length > 0;

  useEffect(() => {
    if (!isLoading && !isError) {
      onMaterialLoad?.(hasContent, realContent.length);
    }
  }, [isLoading, isError, hasContent, realContent.length, onMaterialLoad]);

  const editor = useCreateBlockNote({
    schema: lessonEditorSchema,
    dictionary: pt,
    resolveFileUrl: resolveMediaUrl,
    initialContent: realContent as any,
  }, [lessonId, hasContent]);

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

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-10 text-center space-y-8 rounded-[2.5rem] border border-dashed border-border/40 bg-surface/10 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center text-muted-foreground/20 shadow-inner">
          <FileText className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-black tracking-tight text-foreground/80 uppercase">
            Esta aula ainda não possui material
          </h3>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto font-medium leading-relaxed">
            O conteúdo precisa ser adicionado antes que você possa iniciar esta etapa.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          {canEdit ? (
            <Button asChild className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px]">
              <Link to="/app/biblioteca">
                <Edit className="h-3 w-3 mr-2" />
                Editar conteúdo →
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.history.back()} className="h-12 rounded-2xl border-border/40 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
              <ArrowLeft className="h-3 w-3 mr-2" />
              Voltar →
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lab-editor-bn-theme lesson-viewer-mode select-text cursor-auto">
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

