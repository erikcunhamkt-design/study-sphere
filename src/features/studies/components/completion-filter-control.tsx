import { cn } from "@/lib/utils";
import type { LessonCompletionFilter } from "../utils";

const OPTIONS: { value: LessonCompletionFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "completed", label: "Concluídas" },
  { value: "pending", label: "Pendentes" },
];

interface CompletionFilterControlProps {
  value: LessonCompletionFilter;
  onChange: (value: LessonCompletionFilter) => void;
}

export function CompletionFilterControl({ value, onChange }: CompletionFilterControlProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por conclusão"
      className="inline-flex rounded-md border border-border p-0.5"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
