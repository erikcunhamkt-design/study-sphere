import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useCreateDeck, useUpdateDeck } from "./hooks";
import type { DeckRow } from "./types";
import { toast } from "sonner";

const deckSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  color: z.string(),
});

interface DeckFormValues {
  name: string;
  color: string;
}

interface DeckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: DeckRow | null;
}

export function DeckFormDialog({ open, onOpenChange, deck }: DeckFormDialogProps) {
  const createDeck = useCreateDeck();
  const updateDeck = useUpdateDeck();

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(deckSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
    },
  });

  useEffect(() => {
    if (open) {
      if (deck) {
        form.reset({
          name: deck.name,
          color: deck.color ?? "#3b82f6",
        });
      } else {
        form.reset({
          name: "",
          color: "#3b82f6",
        });
      }
    }
  }, [open, deck, form]);

  const onSubmit = async (values: DeckFormValues) => {
    try {
      if (deck) {
        await updateDeck.mutateAsync({
          id: deck.id,
          input: {
            name: values.name,
            color: values.color,
          },
        });
        toast.success("Baralho atualizado");
      } else {
        await createDeck.mutateAsync({
          name: values.name,
          color: values.color,
          is_archived: false,
        });
        toast.success("Baralho criado");
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar baralho");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{deck ? "Editar Baralho" : "Novo Baralho"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Inglês Básico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <Input type="color" className="h-10 w-full" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {deck ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
