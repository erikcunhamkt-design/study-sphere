/**
 * Recuperação local de rascunhos — IndexedDB, não localStorage. Documentos
 * podem chegar perto de 5 MB; localStorage é síncrono (bloqueia a thread
 * principal) e tem limite de ~5MB por origem somando tudo, então não serve
 * para isto. Chave é escopada por usuário+aula para nunca vazar rascunho
 * entre contas no mesmo navegador.
 */
const DB_NAME = "studyos-lesson-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
function draftKey(userId, lessonId) {
    return `${userId}:${lessonId}`;
}
function openDb() {
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
async function withStore(mode, fn) {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);
            const request = fn(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    finally {
        db.close();
    }
}
export async function saveDraft(userId, lessonId, draft) {
    await withStore("readwrite", (store) => store.put(draft, draftKey(userId, lessonId)));
}
export async function getDraft(userId, lessonId) {
    const result = await withStore("readonly", (store) => store.get(draftKey(userId, lessonId)));
    return result ?? null;
}
export async function deleteDraft(userId, lessonId) {
    await withStore("readwrite", (store) => store.delete(draftKey(userId, lessonId)));
}
