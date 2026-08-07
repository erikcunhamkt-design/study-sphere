import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProfile, usePreferences } from "@/hooks/use-preferences";
import { civilDateInTimezone } from "@/lib/timezone";
import { buildMonthGrid, weekdayHeaders, ymd } from "@/features/planned-studies/calendar";
import { usePlannedStudiesInRange, useLinkedSessionDurations } from "@/features/planned-studies/hooks";
import { DaySheet } from "@/features/planned-studies/day-sheet";
import type { PlannedStudyRow } from "@/features/planned-studies/types";

export const Route = createFileRoute("/app/planejamento")({
  component: PlanejamentoPage,
});

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function PlanejamentoPage() {
  const { data: profile } = useProfile();
  const { data: prefs } = usePreferences();
  const weekStartsOn = prefs?.week_starts_on ?? 0;

  const today = civilDateInTimezone(profile?.timezone);
  const [todayYear, todayMonth] = today.split("-").map(Number) as [number, number, number];

  // Mês exibido (1..12). Começa no mês de "hoje" do fuso do perfil.
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, weekStartsOn),
    [viewYear, viewMonth, weekStartsOn],
  );
  const headers = useMemo(() => weekdayHeaders(weekStartsOn), [weekStartsOn]);

  const fromDate = grid[0]!.date;
  const toDate = grid[grid.length - 1]!.date;
  const { data: planned, isLoading } = usePlannedStudiesInRange(fromDate, toDate);

  // Agrupa por dia civil para pintar contadores na grade.
  const byDate = useMemo(() => {
    const map = new Map<string, PlannedStudyRow[]>();
    for (const row of planned ?? []) {
      const list = map.get(row.scheduled_date) ?? [];
      list.push(row);
      map.set(row.scheduled_date, list);
    }
    return map;
  }, [planned]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);

  function goPrev() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNext() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
  }

  function openDay(date: string) {
    setSelectedDate(date);
    setSheetOpen(true);
  }

  const selectedItems = byDate.get(selectedDate) ?? [];
  const selectedLabel = formatDayLabel(selectedDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento"
        description="Organize o que vai estudar em cada dia."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        }
      />

      <div>
        <h2 className="text-lg font-medium capitalize mb-3">
          {MONTH_NAMES[viewMonth - 1]} de {viewYear}
        </h2>

        <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-1">
          {headers.map((h) => (
            <div key={h} className="py-1">
              {h}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              const items = byDate.get(cell.date) ?? [];
              const isToday = cell.date === today;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => openDay(cell.date)}
                  className={cn(
                    "h-20 rounded-md border p-1.5 text-left align-top transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !cell.inMonth && "opacity-40",
                    isToday && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {cell.day}
                  </span>
                  {items.length > 0 ? (
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {items.length} estudo{items.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        dateLabel={selectedLabel}
        items={selectedItems}
      />
    </div>
  );
}

/** "2026-08-06" -> "6 de agosto de 2026" (sem depender de Date/fuso). */
function formatDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`;
}
