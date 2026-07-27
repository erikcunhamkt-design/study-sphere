import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { deleteDraft, getDraft, saveDraft, type LessonDraft } from "./drafts-db";

const sampleDraft: LessonDraft = {
  content: [{ id: "a", type: "paragraph", props: {}, content: [], children: [] }],
  schemaVersion: 1,
  baseVersion: 3,
  savedAt: "2026-07-27T00:00:00.000Z",
};

describe("drafts-db (IndexedDB)", () => {
  beforeEach(async () => {
    await deleteDraft("user-1", "lesson-1");
    await deleteDraft("user-2", "lesson-1");
  });

  it("retorna null quando não há rascunho salvo", async () => {
    expect(await getDraft("user-1", "lesson-1")).toBeNull();
  });

  it("salva e recupera um rascunho", async () => {
    await saveDraft("user-1", "lesson-1", sampleDraft);
    const loaded = await getDraft("user-1", "lesson-1");
    expect(loaded).toEqual(sampleDraft);
  });

  it("sobrescreve o rascunho anterior da mesma aula", async () => {
    await saveDraft("user-1", "lesson-1", sampleDraft);
    const updated: LessonDraft = { ...sampleDraft, baseVersion: 4 };
    await saveDraft("user-1", "lesson-1", updated);
    const loaded = await getDraft("user-1", "lesson-1");
    expect(loaded?.baseVersion).toBe(4);
  });

  it("isola rascunhos entre usuários diferentes na mesma aula", async () => {
    await saveDraft("user-1", "lesson-1", sampleDraft);
    expect(await getDraft("user-2", "lesson-1")).toBeNull();
  });

  it("exclui o rascunho", async () => {
    await saveDraft("user-1", "lesson-1", sampleDraft);
    await deleteDraft("user-1", "lesson-1");
    expect(await getDraft("user-1", "lesson-1")).toBeNull();
  });
});
