import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlashcardReviews, useFlashcards } from "./hooks";
const RETENTION_WINDOW_DAYS = 30;
const CHART_WINDOW_DAYS = 14;
function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}
const chartConfig = {
    revisoes: { label: "Revisões", color: "hsl(var(--primary))" },
};
/**
 * Toda métrica aqui vem de agregação real de flashcards/flashcard_reviews
 * — nenhum número projetado ou fictício. Sem dado suficiente, mostra "—"
 * em vez de fabricar um valor (ex.: 0% de retenção sem nenhuma revisão
 * ainda seria enganoso).
 */
export function FlashcardMetrics() {
    const sinceIso = useMemo(() => isoDaysAgo(RETENTION_WINDOW_DAYS), []);
    const { data: cards } = useFlashcards();
    const { data: reviews, isLoading } = useFlashcardReviews(sinceIso);
    const stateCounts = useMemo(() => {
        const counts = { novo: 0, aprendendo: 0, revisao: 0 };
        for (const c of cards ?? []) {
            if (c.is_archived)
                continue;
            counts[c.state] += 1;
        }
        return counts;
    }, [cards]);
    const retentionRate = useMemo(() => {
        if (!reviews || reviews.length === 0)
            return null;
        const successCount = reviews.filter((r) => r.rating !== "errei").length;
        return Math.round((successCount / reviews.length) * 100);
    }, [reviews]);
    const chartData = useMemo(() => {
        const days = [];
        for (let i = CHART_WINDOW_DAYS - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            days.push({
                date: key,
                label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                revisoes: 0,
            });
        }
        const byDay = new Map(days.map((d) => [d.date, d]));
        for (const r of reviews ?? []) {
            const entry = byDay.get(r.reviewed_at.slice(0, 10));
            if (entry)
                entry.revisoes += 1;
        }
        return days;
    }, [reviews]);
    if (isLoading) {
        return <Skeleton className="h-48 w-full"/>;
    }
    return (<div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface p-4 md:col-span-1">
        <p className="text-sm text-muted-foreground">Cartões por estado</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Novos</dt>
            <dd className="font-medium text-foreground">{stateCounts.novo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Aprendendo</dt>
            <dd className="font-medium text-foreground">{stateCounts.aprendendo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Em revisão</dt>
            <dd className="font-medium text-foreground">{stateCounts.revisao}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          Retenção ({RETENTION_WINDOW_DAYS} dias)
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {retentionRate === null ? "—" : `${retentionRate}%`}
        </p>
        {retentionRate === null ? (<p className="text-xs text-muted-foreground">Sem revisões registradas ainda.</p>) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface p-4 md:col-span-2">
        <p className="mb-3 text-sm text-muted-foreground">
          Revisões nos últimos {CHART_WINDOW_DAYS} dias
        </p>
        <ChartContainer config={chartConfig} className="h-40 w-full overflow-hidden">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false}/>
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24}/>
            <ChartTooltip content={<ChartTooltipContent />}/>
            <Bar dataKey="revisoes" fill="var(--color-revisoes)" radius={4}/>
          </BarChart>
        </ChartContainer>
      </div>
    </div>);
}
