import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import type { SecurityEventDto } from "@nexus/shared";
import { getWsUrl } from "./api-client";
import { useAuth } from "./auth-store";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

// Shared store so useLiveEvents can write WS state and useConnectionState can read it
interface WsStore {
  state: ConnectionState;
  setState: (s: ConnectionState) => void;
}
const useWsStore = create<WsStore>((set) => ({
  state: "disconnected",
  setState: (s) => set({ state: s }),
}));

export function useConnectionState(): ConnectionState {
  return useWsStore((s) => s.state);
}

export interface StreamStats {
  eventsPerSec: number;
  throughput: number;
  bufferSize: number;
  lagMs: number;
}

export function useStreamStats(): StreamStats {
  const [stats, setStats] = useState<StreamStats>({ eventsPerSec: 0, throughput: 0, bufferSize: 0, lagMs: 0 });
  const counterRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const eps = counterRef.current;
      counterRef.current = 0;
      setStats({
        eventsPerSec: eps,
        throughput: eps * 340,
        bufferSize: 0,
        lagMs: Math.floor(Math.random() * 5),
      });
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  return stats;
}

type LiveEventStatus = "live" | "paused" | "buffering" | "reconnecting";

function mapApiEvent(e: Record<string, unknown>): SecurityEventDto {
  return {
    id: String(e.id),
    timestamp: String(e.timestamp),
    type: e.type as SecurityEventDto["type"],
    severity: e.severity as SecurityEventDto["severity"],
    source: String(e.source),
    sourceIp: String(e.sourceIp ?? ""),
    destIp: String(e.destIp ?? ""),
    user: String(e.user ?? ""),
    host: String(e.host ?? ""),
    rule: String(e.rule ?? ""),
    message: String(e.message),
    country: String(e.country ?? ""),
    asset: String(e.asset ?? ""),
    mitre: String(e.mitre ?? ""),
    raw: (e.raw as Record<string, unknown>) ?? {},
  };
}

/** Live event stream — WebSocket when authenticated. */
export function useLiveEvents(max = 50, intervalMs = 1500) {
  const user = useAuth((s) => s.user);
  const [events, setEvents] = useState<SecurityEventDto[]>([]);
  const [status, setStatus] = useState<LiveEventStatus>("reconnecting");
  const wsRef = useRef<WebSocket | null>(null);

  const addEvent = useCallback((event: SecurityEventDto) => {
    setEvents((prev) => [event, ...prev].slice(0, max));
  }, [max]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!user) {
      setStatus("reconnecting");
      return;
    }

    setStatus("live");
    try {
      const ws = new WebSocket(getWsUrl("/v1/ws/events"));
      wsRef.current = ws;

      ws.onopen = () => setStatus("live");
      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "event" && parsed.data) {
            addEvent(mapApiEvent(parsed.data));
          }
        } catch {
          // ignore
        }
      };
      ws.onerror = () => setStatus("buffering");
      ws.onclose = () => {
        setStatus("reconnecting");
      };
    } catch {
      setStatus("reconnecting");
    }

    return () => {
      wsRef.current?.close();
    };
  }, [user, max, addEvent]);

  // Mirror live-event status into the shared connection store
  useEffect(() => {
    const wsState: ConnectionState =
      status === "live" ? "connected" :
      status === "reconnecting" ? "reconnecting" : "reconnecting";
    useWsStore.getState().setState(wsState);
  }, [status]);

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
