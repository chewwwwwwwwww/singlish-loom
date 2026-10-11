"use client";
import { useEffect, useState } from "react";
import { isMuralResponse } from "../lib/mural-composition";
import type { MuralResponse } from "../lib/types";

/** Pause keeps the last complete mural visible, including during reconnects. */
export function useMuralFeed(paused = false) {
  const [data, setData] = useState<MuralResponse>({ records: [], total: 0 });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (paused) return;
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/mural", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Mural unavailable");
        const next: unknown = await response.json();
        if (!isMuralResponse(next)) throw new Error("Incomplete mural");
        if (!active) return;
        setData(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
        setLoaded(true); setError(false);
      } catch { if (active) setError(true); }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [paused]);
  return { data, loaded, error };
}
