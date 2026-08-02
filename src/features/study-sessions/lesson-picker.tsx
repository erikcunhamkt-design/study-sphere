import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";

const AVULSO_VALUE = "__avulso__";

interface LessonPickerProps {
  value: string | null;
  onChange: (lessonId: string | null) => void;
}

export function LessonPicker({ value, onChange }: LessonPickerProps) {
  const { data: lessons } = useAllLessons();
  const activeLessons = (lessons ?? []).filter((l) => !l.is_archived);

  return (
    <div className="space-y-2">
      <Label htmlFor="session-lesson">Aula (opcional)</Label>
      <Select
        value={value ?? AVULSO_VALUE}
        onValueChange={(v) => onChange(v === AVULSO_VALUE ? null : v)}
      >
        <SelectTrigger id="session-lesson">
          <SelectValue placeholder="Avulsa (sem aula)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AVULSO_VALUE}>Avulsa (sem aula)</SelectItem>
          {activeLessons.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
