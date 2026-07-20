import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STUDY_AREA_COLORS,
  STUDY_AREA_ICONS,
  type StudyAreaColor,
  type StudyAreaIconName,
} from "../types";
import { resolveAreaColorTokens, resolveAreaIcon } from "../utils";

interface ColorFieldProps {
  value: StudyAreaColor;
  onChange: (color: StudyAreaColor) => void;
}

export function ColorField({ value, onChange }: ColorFieldProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da área">
      {STUDY_AREA_COLORS.map((color) => {
        const tokens = resolveAreaColorTokens(color);
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full transition-transform",
              tokens.dot,
              selected && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105",
            )}
          >
            {selected ? <Check className="h-4 w-4 text-white" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

interface IconFieldProps {
  value: StudyAreaIconName;
  onChange: (icon: StudyAreaIconName) => void;
}

export function IconField({ value, onChange }: IconFieldProps) {
  return (
    <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Ícone da área">
      {STUDY_AREA_ICONS.map((icon) => {
        const Icon = resolveAreaIcon(icon);
        const selected = value === icon;
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={icon}
            onClick={() => onChange(icon)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
