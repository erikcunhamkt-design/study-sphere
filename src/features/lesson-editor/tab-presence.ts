export interface TabPresenceHandle {
  close: () => void;
}

type PresenceMessage =
  | { type: "announce"; tabId: string }
  | { type: "ack"; tabId: string }
  | { type: "bye"; tabId: string };

function randomTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

/**
 * Detecção best-effort de outra aba com a mesma aula aberta, via
 * BroadcastChannel (um canal por aula — plano §10.10). É só um aviso: a
 * proteção real contra sobrescrita continua sendo o expected_version no
 * save (ver use-autosave.ts); este canal nunca decide nada sozinho, só
 * informa a UI. Ambientes sem BroadcastChannel (ex.: alguns testes) só
 * deixam de detectar — não quebram.
 */
export function watchLessonTabPresence(
  lessonId: string,
  onChange: (otherTabOpen: boolean) => void,
): TabPresenceHandle {
  if (typeof BroadcastChannel === "undefined") {
    return { close: () => {} };
  }

  const tabId = randomTabId();
  const channel = new BroadcastChannel(`studyos-lesson:${lessonId}`);
  const knownTabs = new Set<string>();

  function notify() {
    onChange(knownTabs.size > 0);
  }

  channel.onmessage = (event: MessageEvent<PresenceMessage>) => {
    const msg = event.data;
    if (!msg || msg.tabId === tabId) return;
    if (msg.type === "announce") {
      knownTabs.add(msg.tabId);
      channel.postMessage({ type: "ack", tabId } satisfies PresenceMessage);
      notify();
    } else if (msg.type === "ack") {
      knownTabs.add(msg.tabId);
      notify();
    } else if (msg.type === "bye") {
      knownTabs.delete(msg.tabId);
      notify();
    }
  };

  channel.postMessage({ type: "announce", tabId } satisfies PresenceMessage);

  function sendBye() {
    channel.postMessage({ type: "bye", tabId } satisfies PresenceMessage);
  }

  // "pagehide" é o sinal mais confiável de fechamento/navegação de aba em
  // navegadores reais — dispara mesmo em fechamentos abruptos, quando o
  // cleanup do efeito React que chama close() pode não ter chance de rodar.
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", sendBye);
  }

  return {
    close: () => {
      sendBye();
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", sendBye);
      }
      channel.close();
    },
  };
}
