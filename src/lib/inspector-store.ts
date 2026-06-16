import { create } from "zustand";
import type { SecurityEventDto, IncidentDto, AlertDto } from "@nexus/shared";
import type { Endpoint, Vulnerability, ThreatActor } from "./ui-types";

type InspectorTarget =
  | { kind: "event"; event: SecurityEventDto }
  | { kind: "incident"; incident: IncidentDto }
  | { kind: "alert"; alert: AlertDto }
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
