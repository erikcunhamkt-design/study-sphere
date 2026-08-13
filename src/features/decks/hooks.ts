import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import type { DeckInsert, DeckUpdate } from "./types";

export function decksKey(userId: string | undefined) {
  return ["decks", userId] as const;
}

export function useDecks() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: decksKey(user?.id),
    queryFn: () => api.fetchDecks(user!.id),
  });
}

export function useCreateDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<DeckInsert, "user_id">) => api.createDeck(user!.id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: decksKey(user?.id) });
    },
  });
}

export function useUpdateDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeckUpdate }) => api.updateDeck(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: decksKey(user?.id) });
    },
  });
}

export function useArchiveDeck() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveDeck(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: decksKey(user?.id) });
    },
  });
}
