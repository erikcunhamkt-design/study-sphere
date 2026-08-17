/**
 * NOVO ESTUDO — CRIAÇÃO UNIFICADA EM UMA ÚNICA TELA
 * "Comece em segundos. Organize quando precisar."
 *
 * Não é wizard: nome, conteúdo e (opcionalmente) módulos/aulas vivem na
 * mesma tela e só são persistidos ao clicar em "Criar e começar".
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  createQuickStudy,
  draftHasContent,
  type QuickStudyDraft,
  type QuickStudyModuleDraft,
} from "@/features/quick-study/api";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/novo-estudo")({
  head: () => ({
    meta: [
      { title: "Novo estudo — DominusApp" },
      {
        name: "description",
        content:
          "Crie um estudo em segundos: dê um nome, escreva o conteúdo e comece a estudar imediatamente.",
      },
      { property: "og:title", content: "Novo estudo — DominusApp" },
      {
        property: "og:description",
        content: "Comece em segundos. Organize quando precisar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovoEstudoPage,
});

function newModule(index: number): QuickStudyModuleDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    lessons: [{ id: crypto.randomUUID(), title: "", content: "" }],
  };
}

function NovoEstudoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [hasModules, setHasModules] = useState(false);
  const [modules, setModules] = useState<QuickStudyModuleDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const draft: QuickStudyDraft = useMemo(
    () => ({ name, content, hasModules, modules }),
    [name, content, hasModules, modules],
  );
  const dirty = draftHasContent(draft);

  // Saída sem salvar (fechar aba / recarregar) — apenas se houver alterações.
  useEffect(() => {
    if (!dirty || saving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  function enableModules() {
    setHasModules(true);
    setModules((prev) => (prev.length > 0 ? prev : [newModule(0)]));
  }

  function updateModule(id: string, patch: Partial<QuickStudyModuleDraft>) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addLesson(moduleId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: [...m.lessons, { id: crypto.randomUUID(), title: "", content: "" }] }
          : m,
      ),
    );
  }

  function removeLesson(moduleId: string, lessonId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m,
      ),
    );
  }

  function updateLesson(
    moduleId: string,
    lessonId: string,
    patch: Partial<{ title: string; content: string }>,
  ) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
            }
          : m,
      ),
    );
  }

  async function handleCreate() {
    if (!user?.id) return;
    if (name.trim() === "") {
      toast.error("Dê um nome ao estudo para continuar.");
      return;
    }
    setSaving(true);
    try {
      const result = await createQuickStudy(user.id, draft);
      await qc.invalidateQueries();
      toast.success("Estudo criado. Bom estudo!");
      navigate({
        to: "/app/estudar",
        search: { method: "aprender", courseId: result.courseId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar o estudo.";
      toast.error(message, { description: "Nada foi salvo pela metade — tente novamente." });
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    navigate({ to: "/app/estudar", search: {} });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-12 space-y-8">
      <header className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Comece em segundos
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
          Novo estudo
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Dê um nome, escreva o que quer estudar e comece. Você organiza depois, se precisar.
        </p>
      </header>

      {/* NOME */}
      <section className="space-y-2">
        <Label htmlFor="study-name" className="text-xs font-black uppercase tracking-widest">
          Nome do estudo
        </Label>
        <Input
          id="study-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como você vai chamar este estudo? Ex.: Copywriting"
          className="h-12 text-base rounded-xl"
        />
      </section>

      {/* ESTRUTURA OPCIONAL */}
      <section className="space-y-2">
        <span id="modules-label" className="block text-xs font-black uppercase tracking-widest">
          Este estudo tem módulos?
        </span>
        <div
          role="radiogroup"
          aria-labelledby="modules-label"
          className="inline-flex rounded-xl border border-border/50 p-1 bg-surface/40"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!hasModules}
            onClick={() => setHasModules(false)}
            className={cn(
              "px-5 py-2 text-sm font-bold rounded-lg transition-colors",
              !hasModules
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Não
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={hasModules}
            onClick={enableModules}
            className={cn(
              "px-5 py-2 text-sm font-bold rounded-lg transition-colors",
              hasModules
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sim
          </button>
        </div>
      </section>

      {/* CONTEÚDO SIMPLES */}
      {!hasModules && (
        <section className="space-y-2">
          <Label htmlFor="study-content" className="text-xs font-black uppercase tracking-widest">
            Conteúdo
          </Label>
          <Textarea
            id="study-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva aqui o material deste estudo. Use # para títulos."
            className="min-h-[320px] text-base leading-relaxed rounded-2xl"
          />
          <p className="text-xs text-muted-foreground">
            Você poderá formatar, adicionar flashcards e questões depois, no editor.
          </p>
        </section>
      )}

      {/* MÓDULOS E AULAS — NA MESMA TELA */}
      {hasModules && (
        <section className="space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest">Módulos</h2>

          {modules.map((mod, mi) => (
            <div
              key={mod.id}
              className="rounded-2xl border border-border/40 bg-surface/40 p-5 space-y-4"
            >
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor={`module-${mod.id}`}
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Módulo {mi + 1}
                  </Label>
                  <Input
                    id={`module-${mod.id}`}
                    value={mod.name}
                    onChange={(e) => updateModule(mod.id, { name: e.target.value })}
                    placeholder="Nome do módulo"
                    className="rounded-xl"
                  />
                </div>
                {modules.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover módulo ${mi + 1}`}
                    onClick={() => setModules((prev) => prev.filter((m) => m.id !== mod.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-4 pl-0 md:pl-4 md:border-l md:border-border/40">
                {mod.lessons.map((lesson, li) => (
                  <div key={lesson.id} className="space-y-2">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label
                          htmlFor={`lesson-${lesson.id}`}
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                        >
                          Aula {li + 1}
                        </Label>
                        <Input
                          id={`lesson-${lesson.id}`}
                          value={lesson.title}
                          onChange={(e) =>
                            updateLesson(mod.id, lesson.id, { title: e.target.value })
                          }
                          placeholder="Título da aula"
                          className="rounded-xl"
                        />
                      </div>
                      {mod.lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover aula ${li + 1}`}
                          onClick={() => removeLesson(mod.id, lesson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      aria-label={`Conteúdo da aula ${li + 1}`}
                      value={lesson.content}
                      onChange={(e) =>
                        updateLesson(mod.id, lesson.id, { content: e.target.value })
                      }
                      placeholder="Conteúdo desta aula"
                      className="min-h-[140px] rounded-xl leading-relaxed"
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addLesson(mod.id)}
                  className="font-bold"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Adicionar aula
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => setModules((prev) => [...prev, newModule(prev.length)])}
            className="font-bold rounded-xl"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar módulo
          </Button>
        </section>
      )}

      {/* CTA */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 pb-4">
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleCreate}
          disabled={saving || name.trim() === ""}
          className="font-black rounded-xl"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando…
            </>
          ) : (
            <>
              Criar e começar <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              O que você escreveu ainda não foi salvo e será descartado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate({ to: "/app/estudar", search: {} })}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
