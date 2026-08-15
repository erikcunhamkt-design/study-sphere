import { DeckItem } from "./deck-item";
import { useFlashcards } from "@/features/flashcards/hooks";
export function DeckList({ decks, onEdit }) {
    const { data: flashcards = [] } = useFlashcards();
    return (<div className="grid gap-3">
      {decks.map((deck) => {
            const count = flashcards.filter(c => c.deck_id === deck.id && !c.is_archived).length;
            return (<DeckItem key={deck.id} deck={{ ...deck, cardCount: count }} onEdit={onEdit}/>);
        })}
    </div>);
}
