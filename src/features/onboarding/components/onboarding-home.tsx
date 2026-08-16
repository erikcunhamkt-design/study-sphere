import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Brain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { isProductionEligible } from "@/lib/eligibility";
import { useOnboarding } from "../hooks";

interface OnboardingHomeProps {
  /** Abre o diálogo de adicionar conteúdo já existente na Home. */
  onAddContent: () => void;
}

/**
 * Bloco de boas-vindas integrado à Home (não é tela cheia, não é slide).
 * Responde apenas: "o que faço agora?".
 */
export function OnboardingHome({ onAddContent }: OnboardingHomeProps) {
  const { state, isActive, reach, track } = useOnboarding();
  const navigate = useNavigate();
  const { data: courses } = useAllCourses();
  const [busy, setBusy] = useState(false);

  if (!isActive) return null;
  // Depois do primeiro contato o próprio fluxo da sessão conduz o usuário.
  if (state !== "new_user" && state !== "onboarding_started" && state !== "has_content") return null;

  const activeCourses = (courses ?? []).filter((c) => !c.is_archived && isProductionEligible(c));
  const firstCourse = activeCourses[0];

  async function handleStart() {
    setBusy(true);
    await reach("onboarding_started", "onboarding_started");
    if (firstCourse) {
      // Regra 22: já tem conteúdo → vai direto para o primeiro estudo.
      await reach("has_content");
      await track("first_study_started", { courseId: firstCourse.id });
      await reach("first_study_started");
      navigate({ to: "/app/estudar", search: { method: "aprender", courseId: firstCourse.id } as any });
    } else {
      onAddContent();
    }
    setBusy(false);
  }

  async function handleSkip() {
    await reach("skipped", "onboarding_skipped");
  }

  if (state === "new_user") {
    return (
      <section aria-labelledby="boas-vindas-titulo" className="rounded-[2rem] border border-primary/20 bg-surface/30 p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0" aria-hidden="true">
            <Brain className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
              Bem-vindo ao Dominus
            </p>
            <h2 id="boas-vindas-titulo" className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              Um sistema de aprendizagem e memória.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed max-w-xl">
              Você estuda, testa o que ficou e o Dominus decide quando revisar. Comece pelo seu
              primeiro estudo.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => void handleStart()}
            disabled={busy}
            className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black"
          >
            Começar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => void handleSkip()}
            className="h-12 px-6 rounded-full text-muted-foreground font-black uppercase tracking-widest text-[10px]"
          >
            Pular
          </Button>
        </div>
      </section>
    );
  }

  // onboarding_started / has_content sem conteúdo → primeiro conteúdo.
  if (!firstCourse) {
    return (
      <section className="rounded-[2rem] border border-border/40 bg-surface/30 p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
            Seu primeiro estudo
          </p>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Adicione algo que você realmente quer aprender.
          </h2>
        </div>
        <Button
          onClick={onAddContent}
          className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black"
        >
          Adicionar conteúdo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    );
  }

  // Já existe conteúdo: pronto para começar.
  return (
    <section className="rounded-[2rem] border border-primary/20 bg-surface/30 p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
            Pronto para começar
          </p>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            {firstCourse.name}
          </h2>
          <p className="text-sm text-muted-foreground font-medium">Seu primeiro estudo começa agora.</p>
        </div>
      </div>
      <Button
        onClick={() => void handleStart()}
        disabled={busy}
        className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black"
      >
        Começar estudo <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}
