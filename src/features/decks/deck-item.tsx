import { DeckRow } from "./types";
import { Button } from "@/components/ui/button";
import { MoreVertical, Layers, ChevronRight } from "lucide-react";
import { useArchiveDeck } from "./hooks";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

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
    <div className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors">
      <Link 
        to="/app/biblioteca/baralho/$deckId" 
        params={{ deckId: deck.id }}
        search={{}}
        className="flex items-center gap-3 flex-1"
      >
        <div 
          className="w-4 h-4 rounded-full shrink-0" 
          style={{ backgroundColor: deck.color ?? "#3b82f6" }} 
        />
        <div className="flex flex-col">
          <span className="font-medium group-hover:text-primary transition-colors">{deck.name}</span>
          {(deck as any).cardCount !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {(deck as any).cardCount} cartões
            </span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
      </Link>
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
