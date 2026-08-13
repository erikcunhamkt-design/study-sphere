import { DeckRow } from "./types";
import { Button } from "@/components/ui/button";
import { MoreVertical, Layers } from "lucide-react";
import { useArchiveDeck } from "./hooks";
import { toast } from "sonner";

interface DeckItemProps {
  deck: DeckRow;
  onEdit: (deck: DeckRow) => void;
}

export function DeckItem({ deck, onEdit }: DeckItemProps) {
  const archiveDeck = useArchiveDeck();

  const handleArchive = async () => {
    try {
      await archiveDeck.mutateAsync(deck.id);
      toast.success("Baralho arquivado");
    } catch (e) {
      toast.error("Erro ao arquivar baralho");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: deck.color ?? "#3b82f6" }} 
        />
        <span className="font-medium">{deck.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(deck)}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={handleArchive}>
          Arquivar
        </Button>
      </div>
    </div>
  );
}
