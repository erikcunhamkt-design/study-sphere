import { DeckRow } from "./types";
import { DeckItem } from "./deck-item";

interface DeckListProps {
  decks: DeckRow[];
  onEdit: (deck: DeckRow) => void;
}

export function DeckList({ decks, onEdit }: DeckListProps) {
  return (
    <div className="grid gap-3">
      {decks.map((deck) => (
        <DeckItem 
          key={deck.id} 
          deck={deck} 
          onEdit={onEdit} 
        />
      ))}
    </div>
  );
}
