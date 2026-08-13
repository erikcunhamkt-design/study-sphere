import { StudyMaterialRow } from "./types";
import { MaterialItem } from "./material-item";

interface MaterialListProps {
  materials: StudyMaterialRow[];
  onEdit: (material: StudyMaterialRow) => void;
}

export function MaterialList({ materials, onEdit }: MaterialListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {materials.map((material) => (
        <MaterialItem 
          key={material.id} 
          material={material} 
          onEdit={onEdit} 
        />
      ))}
    </div>
  );
}
