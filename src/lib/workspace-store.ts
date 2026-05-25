import { create } from "zustand";
import { persist } from "zustand/middleware";



export type Environment = "production" | "staging" | "development";
export type Region = "us-east-1" | "eu-west-1" | "ap-southeast-1";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  orgId: string;
  orgName: string;
  role: "admin" | "analyst" | "viewer";
  environment: Environment;
  region: Region;
  initials: string;
  stats: {
    endpoints: number;
    activeAlerts: number;
    openIncidents: number;
    unresolvedVulns: number;
  };
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  environment: Environment;
  region: Region;

  setActiveWorkspace: (id: string) => void;
  setEnvironment: (env: Environment) => void;
  setRegion: (region: Region) => void;
  getActiveWorkspace: () => Workspace;
}

const WORKSPACES: Workspace[] = [
  {
    id: "ws-1",
    name: "Acme Production",
    slug: "acme-prod",
    orgId: "org-acme",
    orgName: "Acme Corp",
    role: "admin",
    environment: "production",
    region: "us-east-1",
    initials: "AP",
    stats: { endpoints: 2847, activeAlerts: 42, openIncidents: 7, unresolvedVulns: 156 },
  },
  {
    id: "ws-2",
    name: "Acme Staging",
    slug: "acme-staging",
    orgId: "org-acme",
    orgName: "Acme Corp",
    role: "analyst",
    environment: "staging",
    region: "us-east-1",
    initials: "AS",
    stats: { endpoints: 312, activeAlerts: 8, openIncidents: 1, unresolvedVulns: 23 },
  },
  {
    id: "ws-3",
    name: "Globex Production",
    slug: "globex-prod",
    orgId: "org-globex",
    orgName: "Globex Inc",
    role: "analyst",
    environment: "production",
    region: "eu-west-1",
    initials: "GP",
    stats: { endpoints: 1893, activeAlerts: 31, openIncidents: 4, unresolvedVulns: 89 },
  },
  {
    id: "ws-4",
    name: "Globex APAC",
    slug: "globex-apac",
    orgId: "org-globex",
    orgName: "Globex Inc",
    role: "viewer",
    environment: "production",
    region: "ap-southeast-1",
    initials: "GA",
    stats: { endpoints: 756, activeAlerts: 15, openIncidents: 2, unresolvedVulns: 41 },
  },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: WORKSPACES,
      activeWorkspaceId: "ws-1",
      environment: "production",
      region: "us-east-1",

      setActiveWorkspace: (id) => {
        const ws = WORKSPACES.find((w) => w.id === id);
        if (ws) {
          set({ activeWorkspaceId: id, environment: ws.environment, region: ws.region });
        }
      },
      setEnvironment: (env) => set({ environment: env }),
      setRegion: (region) => set({ region }),
      getActiveWorkspace: () => {
        const state = get();
        return WORKSPACES.find((w) => w.id === state.activeWorkspaceId) ?? WORKSPACES[0];
      },
    }),
    {
      name: "nexus.workspace",
      partialize: (s) => ({
        activeWorkspaceId: s.activeWorkspaceId,
        environment: s.environment,
        region: s.region,
      }),
    },
  ),
);
