import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Layers, 
  Search,
  CheckCircle2,
  X
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

import { useFlashcards, useSetFlashcardsDeck } from "@/features/flashcards/hooks";
import { FlashcardList } from "@/features/flashcards/flashcard-list";
import { textFromInlineContent } from "@/features/flashcards/schema";
import { useDecks } from "@/features/decks/hooks";

export const Route = createFileRoute("/app/biblioteca/baralho/$deckId")({
  component: DeckDetailPage,
});

function DeckDetailPage() {
  const { deckId } = Route.useParams();
  const navigate = useNavigate();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data: decks = [] } = useDecks();
  const { data: flashcards = [] } = useFlashcards();
  const setFlashcardsDeck = useSetFlashcardsDeck();
  
  const deck = decks.find((d) => d.id === deckId);
  
  const deckCards = flashcards.filter(
    (c) => c.deck_id === deckId && !c.is_archived
  );
  
  const availableCards = flashcards.filter(
    (c) => c.deck_id !== deckId && !c.is_archived
  );
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const filteredAvailable = availableCards.filter((c) => 
    textFromInlineContent(c.front).toLowerCase().includes(search.toLowerCase())
  );
  
  const handleAddCards = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await setFlashcardsDeck.mutateAsync({ 
        flashcardIds: selectedIds, 
        deckId 
      });
      toast.success(`${selectedIds.length} cartões adicionados ao baralho`);
      setAddDialogOpen(false);
      setSelectedIds([]);
    } catch (e) {
      toast.error("Erro ao adicionar cartões");
    }
  };
  
  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground mb-4">Baralho não encontrado.</p>
        <Button onClick={() => navigate({ to: "/app/biblioteca", search: { tab: "decks" } })}>
          Voltar para Biblioteca
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          asChild
        >
          <Link to="/app/biblioteca" search={{ tab: "decks" as any }}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div 
            className="w-5 h-5 rounded-full" 
            style={{ backgroundColor: deck.color ?? "#3b82f6" }} 
          />
          <PageHeader 
            title={deck.name} 
            description={`${deckCards.length} cartões neste baralho`} 
          />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar cartões
          </Button>
        </div>
      </div>
      
      {deckCards.length > 0 ? (
        <FlashcardList cards={deckCards} />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
          <Layers className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Este baralho está vazio.</p>
          <Button variant="link" onClick={() => setAddDialogOpen(true)}>
            Adicionar seus primeiros cartões
          </Button>
        </div>
      )}
      
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar cartões ao baralho</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartões..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredAvailable.map((card) => {
                const isSelected = selectedIds.includes(card.id);
                return (
                  <div 
                    key={card.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedIds(prev => 
                        isSelected 
                          ? prev.filter(id => id !== card.id)
                          : [...prev, card.id]
                      )
                    }}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {textFromInlineContent(card.front)}
                      </p>
                      {card.deck_id && (
                        <p className="text-[10px] text-muted-foreground">
                          Atualmente em: {decks.find(d => d.id === card.deck_id)?.name || "Outro baralho"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {filteredAvailable.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cartão disponível para adicionar.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} selecionado(s)
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddCards} 
                disabled={selectedIds.length === 0 || setFlashcardsDeck.isPending}
              >
                Adicionar selecionados
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
