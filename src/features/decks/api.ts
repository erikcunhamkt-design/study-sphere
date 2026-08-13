import { supabase } from "@/integrations/supabase/client";
import type { DeckRow, DeckInsert, DeckUpdate } from "./types";

const DECK_COLUMNS = "id, user_id, name, color, is_archived, position, created_at, updated_at";

export async function fetchDecks(userId: string): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from("decks")
    .select(DECK_COLUMNS)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("position", { ascending: true })
    .order("name", { ascending: true });
  
  if (error) throw error;
  return (data ?? []) as unknown as DeckRow[];
}

export async function createDeck(userId: string, input: Omit<DeckInsert, "user_id">): Promise<DeckRow> {
  const { data, error } = await supabase
    .from("decks")
    .insert({
      ...input,
      user_id: userId,
    })
    .select(DECK_COLUMNS)
    .single();
  
  if (error) throw error;
  return data as unknown as DeckRow;
}

export async function updateDeck(id: string, input: DeckUpdate): Promise<DeckRow> {
  const { data, error } = await supabase
    .from("decks")
    .update(input)
    .eq("id", id)
    .select(DECK_COLUMNS)
    .single();
  
  if (error) throw error;
  return data as unknown as DeckRow;
}

export async function archiveDeck(id: string): Promise<void> {
  const { error } = await supabase
    .from("decks")
    .update({ is_archived: true })
    .eq("id", id);
  
  if (error) throw error;
}

export async function deleteDeck(id: string): Promise<void> {
  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}
