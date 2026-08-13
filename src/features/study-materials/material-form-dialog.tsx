import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useEffect } from "react";
import { useCreateStudyMaterial, useUpdateStudyMaterial } from "./hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import type { StudyMaterialRow } from "./types";
import { toast } from "sonner";

const materialSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(255),
  url: z.string().url("URL inválida").max(2048),
  type: z.enum(["pdf", "video", "artigo", "link", "livro", "outro"]),
  note: z.string().max(2000).nullable().optional(),
  courseId: z.string().nullable().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: StudyMaterialRow;
  prefill?: {
    courseId?: string | null;
  };
}

export function MaterialFormDialog({ 
  open, 
  onOpenChange, 
  material,
  prefill 
}: MaterialFormDialogProps) {
  const createMaterial = useCreateStudyMaterial();
  const updateMaterial = useUpdateStudyMaterial();
  const { data: courses = [] } = useAllCourses();

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: "",
      url: "",
      type: "link",
      note: "",
      courseId: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (material) {
        form.reset({
          title: material.title,
          url: material.url,
          type: material.type as any,
          note: material.note ?? "",
          courseId: material.course_id,
        });
      } else {
        form.reset({
          title: "",
          url: "",
          type: "link",
          note: "",
          courseId: prefill?.courseId ?? null,
        });
      }
    }
  }, [open, material, prefill, form]);

  const onSubmit = async (values: MaterialFormValues) => {
    try {
      if (material) {
        await updateMaterial.mutateAsync({
          id: material.id,
          input: {
            title: values.title,
            url: values.url,
            type: values.type,
            note: values.note || null,
            course_id: values.courseId || null,
          },
        });
        toast.success("Material atualizado com sucesso");
      } else {
        await createMaterial.mutateAsync({
          title: values.title,
          url: values.url,
          type: values.type,
          note: values.note || null,
          course_id: values.courseId || null,
          is_archived: false,
        });
        toast.success("Material criado com sucesso");
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar material");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{material ? "Editar Material" : "Novo Material"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Livro de Cálculo I" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="artigo">Artigo</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="livro">Livro</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem vínculo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o material..." 
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {material ? "Salvar Alterações" : "Criar Material"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
