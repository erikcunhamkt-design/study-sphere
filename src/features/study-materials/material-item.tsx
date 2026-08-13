import { 
  FileText, 
  Video, 
  BookOpen, 
  Link as LinkIcon, 
  ExternalLink, 
  MoreVertical, 
  Pencil, 
  Archive, 
  Trash2,
  Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { StudyMaterialRow } from "./types";
import { useUpdateStudyMaterial, useDeleteStudyMaterial } from "./hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAllCourses } from "@/features/studies/hooks/use-courses";

interface MaterialItemProps {
  material: StudyMaterialRow;
  onEdit: (material: StudyMaterialRow) => void;
}

const typeIcons: Record<string, any> = {
  pdf: FileText,
  video: Video,
  artigo: Bookmark,
  link: LinkIcon,
  livro: BookOpen,
  outro: ExternalLink,
};

export function MaterialItem({ material, onEdit }: MaterialItemProps) {
  const updateMaterial = useUpdateStudyMaterial();
  const deleteMaterial = useDeleteStudyMaterial();
  const { data: courses = [] } = useAllCourses();
  
  const course = courses.find(c => c.id === material.course_id);
  const Icon = typeIcons[material.type] || ExternalLink;

  const handleToggleArchive = async () => {
    try {
      await updateMaterial.mutateAsync({
        id: material.id,
        input: { is_archived: !material.is_archived }
      });
      toast.success(material.is_archived ? "Material restaurado" : "Material arquivado");
    } catch (error) {
      toast.error("Erro ao atualizar material");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;
    try {
      await deleteMaterial.mutateAsync(material.id);
      toast.success("Material excluído");
    } catch (error) {
      toast.error("Erro ao excluir material");
    }
  };

  return (
    <div className={cn(
      "group relative flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md",
      material.is_archived && "opacity-60 grayscale"
    )}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-medium text-foreground leading-none mb-1.5">
            {material.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <a 
              href={material.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <LinkIcon className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{new URL(material.url).hostname}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {course && (
              <span className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                {course.name}
              </span>
            )}
            <span className="capitalize">{material.type}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => window.open(material.url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(material)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleArchive}>
              <Archive className="mr-2 h-4 w-4" /> 
              {material.is_archived ? "Restaurar" : "Arquivar"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
