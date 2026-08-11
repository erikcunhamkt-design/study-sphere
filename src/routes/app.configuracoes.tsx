import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, Section } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useProfile,
  useUpdateProfile,
  usePreferences,
  useUpdatePreferences,
  type ThemeChoice,
} from "@/hooks/use-preferences";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/app/configuracoes")({
  component: SettingsPage,
});

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Recife",
  "America/Belem",
  "America/Fortaleza",
  "America/Rio_Branco",
  "America/Noronha",
  "UTC",
  "Europe/Lisbon",
  "Europe/London",
  "America/New_York",
];

const WEEK_DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Personalize sua conta, aparência e preferências de estudo."
      />
      <ProfileSection />
      <Separator />
      <AppearanceSection />
      <Separator />
      <StudyPreferencesSection />
    </div>
  );
}

function ProfileSection() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setTimezone(profile.timezone || "America/Sao_Paulo");
    }
  }, [profile]);

  async function save() {
    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim(), timezone });
      toast.success("Perfil atualizado");
    } catch (err) {
      console.error("[updateProfile]", err);
      toast.error("Não foi possível salvar o perfil");
    }
  }

  return (
    <Section title="Perfil" description={`Como você aparece no ${APP_CONFIG.name}.`}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-full max-w-sm" />
        </div>
      ) : (
        <div className="grid gap-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={save} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar perfil"
              )}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const collapsed = prefs?.sidebar_collapsed ?? false;

  return (
    <Section title="Aparência" description="Tema e disposição da interface.">
      <div className="grid gap-4 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="theme">Tema</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Do sistema</SelectItem>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sidebar">Sidebar</Label>
          <Select
            value={collapsed ? "collapsed" : "expanded"}
            onValueChange={(v) => updatePrefs.mutate({ sidebar_collapsed: v === "collapsed" })}
          >
            <SelectTrigger id="sidebar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expanded">Expandida</SelectItem>
              <SelectItem value="collapsed">Recolhida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Section>
  );
}

// Mesmos limites impostos pelos CHECKs de user_preferences no banco
// (ver supabase/migrations/20260719000000_fase01_1_hardening_constraints.sql)
// — validados aqui também para dar feedback imediato, sem depender só do
// atributo HTML min/max nem de o Postgres rejeitar no fim da viagem.
export const prefsSchema = z.object({
  daily_study_goal_minutes: z
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 minuto")
    .max(1440, "Máximo de 1440 minutos (24h)"),
  week_starts_on: z.number().int().min(0).max(6),
  pomodoro_focus_minutes: z
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 minuto")
    .max(240, "Máximo de 240 minutos"),
  pomodoro_short_break_minutes: z
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 minuto")
    .max(120, "Máximo de 120 minutos"),
  pomodoro_long_break_minutes: z
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 minuto")
    .max(240, "Máximo de 240 minutos"),
  pomodoro_cycles: z
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 ciclo")
    .max(20, "Máximo de 20 ciclos"),
});

function StudyPreferencesSection() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const [form, setForm] = useState({
    daily_study_goal_minutes: 60,
    week_starts_on: 1,
    pomodoro_focus_minutes: 25,
    pomodoro_short_break_minutes: 5,
    pomodoro_long_break_minutes: 15,
    pomodoro_cycles: 4,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (prefs) {
      setForm({
        daily_study_goal_minutes: prefs.daily_study_goal_minutes,
        week_starts_on: prefs.week_starts_on,
        pomodoro_focus_minutes: prefs.pomodoro_focus_minutes,
        pomodoro_short_break_minutes: prefs.pomodoro_short_break_minutes,
        pomodoro_long_break_minutes: prefs.pomodoro_long_break_minutes,
        pomodoro_cycles: prefs.pomodoro_cycles,
      });
    }
  }, [prefs]);

  async function save() {
    const parsed = prefsSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await updatePrefs.mutateAsync(parsed.data);
      toast.success("Preferências salvas");
    } catch (err) {
      console.error("[updatePreferences]", err);
      toast.error("Não foi possível salvar as preferências", {
        description: "Verifique se os valores estão dentro dos limites permitidos.",
      });
    }
  }

  const set = <K extends keyof typeof form>(k: K, v: number) =>
    setForm((f) => ({ ...f, [k]: Number.isFinite(v) ? v : f[k] }));

  return (
    <Section title="Preferências de estudo" description="Meta diária, semana e Pomodoro.">
      {isLoading ? (
        <Skeleton className="h-40 w-full max-w-2xl" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <NumField
            id="goal"
            label="Meta diária (min)"
            value={form.daily_study_goal_minutes}
            min={1}
            max={1440}
            error={errors.daily_study_goal_minutes}
            onChange={(v) => set("daily_study_goal_minutes", v)}
          />
          <div className="space-y-2">
            <Label htmlFor="wk">Semana começa em</Label>
            <Select
              value={String(form.week_starts_on)}
              onValueChange={(v) => set("week_starts_on", Number(v))}
            >
              <SelectTrigger id="wk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_DAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumField
            id="focus"
            label="Foco (min)"
            value={form.pomodoro_focus_minutes}
            min={1}
            max={240}
            error={errors.pomodoro_focus_minutes}
            onChange={(v) => set("pomodoro_focus_minutes", v)}
          />
          <NumField
            id="short"
            label="Pausa curta (min)"
            value={form.pomodoro_short_break_minutes}
            min={1}
            max={120}
            error={errors.pomodoro_short_break_minutes}
            onChange={(v) => set("pomodoro_short_break_minutes", v)}
          />
          <NumField
            id="long"
            label="Pausa longa (min)"
            value={form.pomodoro_long_break_minutes}
            min={1}
            max={240}
            error={errors.pomodoro_long_break_minutes}
            onChange={(v) => set("pomodoro_long_break_minutes", v)}
          />
          <NumField
            id="cycles"
            label="Ciclos"
            value={form.pomodoro_cycles}
            min={1}
            max={20}
            error={errors.pomodoro_cycles}
            onChange={(v) => set("pomodoro_cycles", v)}
          />
          <div className="sm:col-span-2">
            <Button onClick={save} disabled={updatePrefs.isPending}>
              {updatePrefs.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar preferências"
              )}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function NumField({
  id,
  label,
  value,
  min,
  max,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  error?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
