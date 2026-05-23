import { create } from "zustand";
import type { SecurityEvent, Incident, Alert, Endpoint, Vulnerability, ThreatActor } from "./mock/types";

type InspectorTarget =
  | { kind: "event"; event: SecurityEvent }
  | { kind: "incident"; incident: Incident }
  | { kind: "alert"; alert: Alert }
  | { kind: "endpoint"; endpoint: Endpoint }
  | { kind: "vulnerability"; vulnerability: Vulnerability }
  | { kind: "actor"; actor: ThreatActor }
  | null;

interface InspectorState {
  target: InspectorTarget;
  open: (t: NonNullable<InspectorTarget>) => void;
  close: () => void;
}

export const useInspector = create<InspectorState>((set) => ({
  target: null,
  open: (t) => set({ target: t }),
  close: () => set({ target: null }),
}));
