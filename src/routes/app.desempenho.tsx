import { createFileRoute } from "@tanstack/react-router";
import { LineChart as LineChartIcon } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { EmptyState, PageHeader, Section } from "@/components/layout/page-shell";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STUDY_METHOD_LABELS } from "@/features/study-sessions/labels";
import { MIN_SAMPLE_SIZE, type computeDomainByArea } from "@/features/performance/compute";
import { usePerformanceMetrics } from "@/features/performance/hooks";
import type { WindowDays } from "@/features/performance/types";

export const Route = createFileRoute("/app/desempenho")({
  component: DesempenhoPage,
});

const WINDOW_OPTIONS: { value: WindowDays; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

const timeChartConfig = {
  minutes: { label: "Minutos", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const accuracyChartConfig = {
  accuracyPct: { label: "Acerto (%)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function DesempenhoPage() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const metrics = usePerformanceMetrics(windowDays);

  if (!metrics.isLoadingWindowed && !metrics.hasAnyStructure) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Desempenho"
          description="Acompanhe tempo estudado, acertos, retenção e evolução."
        />
        <EmptyState
          icon={<LineChartIcon className="h-5 w-5" aria-hidden />}
          title="Sem dados suficientes"
          description="As métricas serão calculadas a partir das suas sessões, revisões e respostas — comece criando uma área de estudos."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Desempenho"
        description="Acompanhe tempo estudado, acertos, retenção e evolução."
        actions={
          <Select
            value={String(windowDays)}
            onValueChange={(v) => setWindowDays(Number(v) as WindowDays)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Tempo estudado">
          <StudyTimeCard isLoading={metrics.isLoadingWindowed} data={metrics.studyMinutesByDay} />
        </Section>

        <Section title="Acertos">
          <AccuracyCard
            isLoading={metrics.isLoadingWindowed}
            accuracy={metrics.accuracy}
            evolution={metrics.accuracyEvolution}
          />
        </Section>

        <Section title="Tempo por método">
          <TimeByMethodCard isLoading={metrics.isLoadingWindowed} data={metrics.timeByMethod} />
        </Section>

        <Section
          title="Domínio estimado por área"
          description="Sempre sobre todo o histórico — não muda com o período selecionado acima."
        >
          <DomainByAreaCard
            isLoading={metrics.isLoadingDomain}
            domain={metrics.domainByArea}
            areaNameById={metrics.areaNameById}
          />
        </Section>
      </div>
    </div>
  );
}

function StudyTimeCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: { label: string; minutes: number }[];
}) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const total = data.reduce((sum, d) => sum + d.minutes, 0);
  if (total === 0) {
    return (
      <EmptyState
        title="Nenhuma sessão registrada nesse período"
        description="Inicie uma sessão em Estudar para ver o tempo aparecer aqui."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm text-muted-foreground">Total no período: {total} min</p>
      <ChartContainer config={timeChartConfig} className="h-40 w-full overflow-hidden">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="minutes" fill="var(--color-minutes)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function AccuracyCard({
  isLoading,
  accuracy,
  evolution,
}: {
  isLoading: boolean;
  accuracy: { accuracyPct: number | null; total: number; correct: number };
  evolution: { label: string; accuracyPct: number | null; total: number }[];
}) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (accuracy.total === 0) {
    return (
      <EmptyState
        title="Nenhuma resposta registrada nesse período"
        description="Pratique questões avulsas ou em simulados para ver o acerto aparecer aqui."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
      <p className="mb-1 text-2xl font-semibold text-foreground">{accuracy.accuracyPct}%</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {accuracy.correct}/{accuracy.total} respostas no período
      </p>
      <ChartContainer config={accuracyChartConfig} className="h-32 w-full overflow-hidden">
        <LineChart data={evolution}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="accuracyPct"
            stroke="var(--color-accuracyPct)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function TimeByMethodCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: { method: string; minutes: number }[];
}) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="Nenhuma sessão registrada nesse período"
        description="O tempo por método aparece aqui assim que você concluir uma sessão."
      />
    );
  }
  const chartData = data.map((d) => ({
    label: STUDY_METHOD_LABELS[d.method as keyof typeof STUDY_METHOD_LABELS] ?? d.method,
    minutes: d.minutes,
  }));
  const height = Math.max(120, chartData.length * 40);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
      <ChartContainer
        config={timeChartConfig}
        className="w-full overflow-hidden"
        style={{ height }}
      >
        <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={90} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="minutes" fill="var(--color-minutes)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function DomainByAreaCard({
  isLoading,
  domain,
  areaNameById,
}: {
  isLoading: boolean;
  domain: ReturnType<typeof computeDomainByArea>;
  areaNameById: Map<string, string>;
}) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (domain.byArea.length === 0 && domain.insufficientAreaIds.length === 0) {
    return (
      <EmptyState
        title="Sem respostas suficientes ainda para estimar domínio"
        description={`Responda pelo menos ${MIN_SAMPLE_SIZE} questões (ou revise ${MIN_SAMPLE_SIZE} flashcards) de uma mesma área.`}
      />
    );
  }
  const chartData = domain.byArea.map((d) => ({
    label: areaNameById.get(d.areaId) ?? "Área",
    pct: d.questionAccuracy?.pct ?? d.flashcardRetention?.pct ?? 0,
    isRetention: !d.questionAccuracy,
  }));
  const height = Math.max(120, chartData.length * 40);
  return (
    <div className="space-y-3">
      {chartData.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
          <ChartContainer
            config={timeChartConfig}
            className="w-full overflow-hidden"
            style={{ height }}
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
              <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={90} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pct" fill="var(--color-minutes)" radius={4} />
            </BarChart>
          </ChartContainer>
          {chartData.some((d) => d.isRetention) ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Áreas sem questões suficientes mostram retenção de flashcards no lugar do acerto.
            </p>
          ) : null}
        </div>
      ) : null}

      {domain.insufficientAreaIds.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-3">
          <p className="text-xs text-muted-foreground">
            Dados insuficientes ainda (menos de {MIN_SAMPLE_SIZE} respostas/revisões):{" "}
            {domain.insufficientAreaIds.map((id) => areaNameById.get(id) ?? "Área").join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
