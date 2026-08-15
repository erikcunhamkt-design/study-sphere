import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Loader2, FileText, AlertCircle, Edit, ArrowLeft } from "lucide-react";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import { lessonEditorSchema } from "@/features/lesson-editor/schema";
import { resolveMediaUrl } from "@/features/lesson-editor/media-upload";
import { pt } from "@blocknote/core/locales";
import { useTheme } from "@/hooks/use-theme";
import { useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { LessonDocument } from "@/features/lesson-editor/document-schema";

interface LessonContentViewerProps {
  lessonId: string;
  onMaterialLoad?: (hasRealMaterial: boolean, blocksCount: number) => void;
  onProgress?: (blocksViewed: number) => void;
  canEdit?: boolean;
}

/**
 * Filtra placeholders e blocos vazios do conteúdo real.
 */
function getRealContent(content: LessonDocument | undefined) {
  if (!content || !Array.isArray(content)) return [];

  return content.filter((block: any) => {
    // 1. Remover parágrafos vazios
    if (block.type === "paragraph" && (!block.content || block.content.length === 0)) {
      return false;
    }
    
    // 2. Garantir que imagens tenham URL
    if (block.type === "image" && !block.props?.url) return false;

    return true;
  });
}

/** Renderiza o documento. */
function ViewerInner({ 
  blocks, 
  lessonId, 
  onProgress 
}: { 
  blocks: any[]; 
  lessonId: string; 
  onProgress?: (count: number) => void 
}) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedIds = useRef<Set<string>>(new Set());

  const editor = useCreateBlockNote(
    {
      schema: lessonEditorSchema,
      dictionary: pt,
      resolveFileUrl: resolveMediaUrl,
      initialContent: blocks,
    },
    [lessonId, blocks],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onProgress) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const blockId = entry.target.getAttribute("data-id");
            if (blockId && !viewedIds.current.has(blockId)) {
              viewedIds.current.add(blockId);
              onProgress(viewedIds.current.size);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    const updateObservers = () => {
      // O BlockNote renderiza blocos com [data-id]
      const blockElements = container.querySelectorAll("[data-id]");
      blockElements.forEach((el) => observer.observe(el));
    };

    const timer = setTimeout(updateObservers, 500);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [blocks, onProgress]);

  return (
    <div ref={containerRef} className="lab-editor-bn-theme lesson-viewer-mode select-text cursor-auto">
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

export function LessonContentViewer({ 
  lessonId, 
  onMaterialLoad, 
  onProgress,
  canEdit 
}: LessonContentViewerProps) {
  const { data: doc, isLoading, isError } = useLessonDocument(lessonId);

  // O estudante consome published_content
  const realContent = useMemo(() => getRealContent(doc?.published_content as LessonDocument), [doc?.published_content]);
  const hasContent = realContent.length > 0;

  const onMaterialLoadRef = useRef(onMaterialLoad);
  onMaterialLoadRef.current = onMaterialLoad;

  useEffect(() => {
    if (!isLoading && !isError) {
      onMaterialLoadRef.current?.(hasContent, realContent.length);
    }
  }, [isLoading, isError, hasContent, realContent.length]);

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
            Esta aula ainda não possui material publicado
          </h3>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto font-medium leading-relaxed">
            O material precisa ser publicado pelo autor antes que você possa iniciar o primeiro contato.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          {canEdit ? (
            <Button asChild className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px]">
              <Link to="/app/biblioteca" search={{ tab: "materials" }}>
                <Edit className="h-3 w-3 mr-2" />
                Editar e Publicar →
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

  return <ViewerInner key={lessonId} blocks={realContent} lessonId={lessonId} onProgress={onProgress} />;
}
