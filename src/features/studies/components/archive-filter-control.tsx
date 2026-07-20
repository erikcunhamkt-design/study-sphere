import { cn } from "@/lib/utils";
import type { ArchiveFilter } from "../types";

const OPTIONS: { value: ArchiveFilter; label: string }[] = [
  { value: "active", label: "Ativas" },
  { value: "archived", label: "Arquivadas" },
  { value: "all", label: "Todas" },
];

interface ArchiveFilterControlProps {
  value: ArchiveFilter;
  onChange: (value: ArchiveFilter) => void;
}

export function ArchiveFilterControl({ value, onChange }: ArchiveFilterControlProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por arquivamento"
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
