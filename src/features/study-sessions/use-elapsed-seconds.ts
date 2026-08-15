import { useEffect, useState } from "react";

/**
 * Segundos decorridos desde started_at, recalculados a cada tick a partir
 * do relógio do cliente — sem estado incremental, então funciona igual
 * para uma sessão nova ou retomada (basta o started_at persistido). Piso
 * em zero: mesmo achado do timer do simulado (Fase 05.1 Gate 4) — o
 * relógio do servidor pode estar um pouco à frente do cliente.
 */
export function useElapsedSeconds(startedAtIso: string, paused: boolean = false): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (paused) return;

    const startedAt = new Date(startedAtIso).getTime();
    // Subtrai o tempo já acumulado para que o tick continue de onde parou 
    // (Aproximação simples: para pausas reais precisaremos de total_seconds no banco)
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAtIso, paused]);

  return elapsed;
}
