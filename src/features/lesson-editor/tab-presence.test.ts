import { afterEach, describe, expect, it, vi } from "vitest";

import { watchLessonTabPresence } from "./tab-presence";

function waitFor(fn: () => boolean, timeoutMs = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fn()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("timeout esperando condição"));
      setTimeout(check, 10);
    };
    check();
  });
}

describe("watchLessonTabPresence (BroadcastChannel por aula)", () => {
  const handles: { close: () => void }[] = [];

  afterEach(() => {
    while (handles.length) handles.pop()?.close();
  });

  it("detecta outra aba aberta na mesma aula", async () => {
    const lessonId = `lesson-presence-${Math.random()}`;
    const tabAChanges = vi.fn();
    const tabBChanges = vi.fn();

    const tabA = watchLessonTabPresence(lessonId, tabAChanges);
    handles.push(tabA);
    const tabB = watchLessonTabPresence(lessonId, tabBChanges);
    handles.push(tabB);

    await waitFor(() => tabAChanges.mock.calls.some((call) => call[0] === true));
    await waitFor(() => tabBChanges.mock.calls.some((call) => call[0] === true));
  });

  it("não detecta abas de aulas diferentes", async () => {
    const changesA = vi.fn();
    const changesB = vi.fn();

    const tabA = watchLessonTabPresence(`lesson-presence-a-${Math.random()}`, changesA);
    handles.push(tabA);
    const tabB = watchLessonTabPresence(`lesson-presence-b-${Math.random()}`, changesB);
    handles.push(tabB);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(changesA).not.toHaveBeenCalledWith(true);
    expect(changesB).not.toHaveBeenCalledWith(true);
  });

  it("volta a otherTabOpen=false quando a outra aba fecha", async () => {
    const lessonId = `lesson-presence-close-${Math.random()}`;
    const changesA = vi.fn();
    const changesB = vi.fn();

    const tabA = watchLessonTabPresence(lessonId, changesA);
    handles.push(tabA);
    const tabB = watchLessonTabPresence(lessonId, changesB);

    await waitFor(() => changesA.mock.calls.some((call) => call[0] === true));

    tabB.close();

    await waitFor(() => changesA.mock.calls.at(-1)?.[0] === false);
  });
});
