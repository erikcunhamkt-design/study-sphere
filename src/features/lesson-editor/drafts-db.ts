import type { LessonDocument } from "./document-schema";

/**
 * Recuperação local de rascunhos — IndexedDB, não localStorage. Documentos
 * podem chegar perto de 5 MB; localStorage é síncrono (bloqueia a thread
 * principal) e tem limite de ~5MB por origem somando tudo, então não serve
 * para isto. Chave é escopada por usuário+contexto (aula ou curso, ver
 * document-anchor.ts) para nunca vazar rascunho entre contas no mesmo
 * navegador.
 */

const DB_NAME = "studyos-lesson-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

export interface LessonDraft {
  content: LessonDocument;
  schemaVersion: number;
  /** Versão do documento no servidor no momento em que este rascunho foi criado. */
  baseVersion: number;
  savedAt: string;
}

function draftKey(userId: string, contextKey: string): string {
  return `${userId}:${contextKey}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível neste ambiente"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDraft(
  userId: string,
  contextKey: string,
  draft: LessonDraft,
): Promise<void> {
  await withStore("readwrite", (store) => store.put(draft, draftKey(userId, contextKey)));
}

export async function getDraft(userId: string, contextKey: string): Promise<LessonDraft | null> {
  const result = await withStore<LessonDraft | undefined>("readonly", (store) =>
    store.get(draftKey(userId, contextKey)),
  );
  return result ?? null;
}

export async function deleteDraft(userId: string, contextKey: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(draftKey(userId, contextKey)));
}
