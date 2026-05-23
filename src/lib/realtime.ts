import { useCallback, useEffect, useRef, useState } from "react";
import { makeEvent } from "./mock/generators";
import type { SecurityEvent } from "./mock/types";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

/** Simulated connection state with occasional reconnects. */
export function useConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>("connected");
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleReconnect = () => {
      // Simulate a reconnect event every 25-60s
      const delay = 25_000 + Math.random() * 35_000;
      ref.current = setTimeout(() => {
        setState("reconnecting");
        // Reconnect after 2-5s
        ref.current = setTimeout(() => {
          setState("connected");
          scheduleReconnect();
        }, 2_000 + Math.random() * 3_000);
      }, delay);
    };
    scheduleReconnect();
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, []);

  // Simulate a rare disconnect
  useEffect(() => {
    const id = setTimeout(() => {
      setState("disconnected");
      setTimeout(() => setState("reconnecting"), 3_000);
      setTimeout(() => setState("connected"), 6_000);
    }, 90_000 + Math.random() * 60_000);
    return () => clearTimeout(id);
  }, []);

  return state;
}

export interface StreamStats {
  eventsPerSec: number;
  throughput: number;     // bytes/s (simulated)
  bufferSize: number;     // pending items
  lagMs: number;          // simulated lag
}

/** Simulated streaming stats derived from event volume. */
export function useStreamStats(): StreamStats {
  const [stats, setStats] = useState<StreamStats>({ eventsPerSec: 0, throughput: 0, bufferSize: 0, lagMs: 0 });
  const counterRef = useRef(0);
  const bufRef = useRef(0);

  useEffect(() => {
    // Count events arriving every second
    const id = window.setInterval(() => {
      const eps = counterRef.current;
      counterRef.current = 0;
      // Occasionally add buffer lag
      const newBuf = Math.max(0, bufRef.current + (Math.random() > 0.85 ? Math.floor(Math.random() * 8) : -1));
      bufRef.current = newBuf;
      setStats({
        eventsPerSec: eps,
        throughput: eps * 340 + Math.floor(Math.random() * 200),
        bufferSize: newBuf,
        lagMs: newBuf > 0 ? newBuf * 12 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 5),
      });
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const bump = useCallback(() => { counterRef.current += 1; }, []);
  // We return stats + a bump function the consumer can call per event
  return { ...stats, _bump: bump } as StreamStats & { _bump: () => void };
}

type LiveEventStatus = "live" | "paused" | "buffering";

/** Simulated websocket-like event stream. */
export function useLiveEvents(max = 50, intervalMs = 1500) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [status, setStatus] = useState<LiveEventStatus>("live");
  const ref = useRef<number | null>(null);
  const pauseRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (pauseRef.current) return;
      setEvents((prev) => [makeEvent(new Date()), ...prev].slice(0, max));
    };
    tick();
    ref.current = window.setInterval(tick, intervalMs + Math.random() * 800);

    // Simulate occasional buffering / paused state
    const simId = window.setInterval(() => {
      const r = Math.random();
      if (r < 0.05) {
        setStatus("buffering");
        pauseRef.current = true;
        setTimeout(() => { setStatus("live"); pauseRef.current = false; }, 2_000 + Math.random() * 2_000);
      } else if (r < 0.08) {
        setStatus("paused");
        pauseRef.current = true;
        setTimeout(() => { setStatus("live"); pauseRef.current = false; }, 1_500 + Math.random() * 1_500);
      }
    }, 12_000);

    return () => {
      if (ref.current) window.clearInterval(ref.current);
      window.clearInterval(simId);
    };
  }, [max, intervalMs]);

  return { events, status };
}

export function useHeartbeat(intervalMs = 1200) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBeat((b) => b + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return beat;
}
