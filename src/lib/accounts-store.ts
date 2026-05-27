import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "./rbac";

export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspace: string;
  status: "active" | "invited" | "suspended";
  createdBy: string; // account id of creator, or "system"
  createdAt: number;
  lastActive: number;
}

const seed: Account[] = [
  { id: "a-root", name: "Root Admin", email: "root@acme.io", role: "super_admin", workspace: "all", status: "active", createdBy: "system", createdAt: Date.now() - 86_400_000 * 120, lastActive: Date.now() - 3_600_000 },
  { id: "a-kira", name: "Kira Morgan", email: "k.morgan@acme.io", role: "security_admin", workspace: "Acme Production", status: "active", createdBy: "a-root", createdAt: Date.now() - 86_400_000 * 90, lastActive: Date.now() - 120_000 },
  { id: "a-aisha", name: "Aisha Chen", email: "a.chen@acme.io", role: "soc_analyst", workspace: "Acme Production", status: "active", createdBy: "a-kira", createdAt: Date.now() - 86_400_000 * 60, lastActive: Date.now() - 720_000 },
  { id: "a-marco", name: "Marco Patel", email: "m.patel@acme.io", role: "threat_hunter", workspace: "Acme Production", status: "active", createdBy: "a-kira", createdAt: Date.now() - 86_400_000 * 45, lastActive: Date.now() - 3_600_000 },
  { id: "a-jordan", name: "Jordan Lee", email: "j.lee@acme.io", role: "incident_responder", workspace: "Acme Production", status: "active", createdBy: "a-kira", createdAt: Date.now() - 86_400_000 * 30, lastActive: Date.now() - 14_400_000 },
  { id: "a-priya", name: "Priya Shah", email: "p.shah@acme.io", role: "compliance_officer", workspace: "Acme Production", status: "active", createdBy: "a-kira", createdAt: Date.now() - 86_400_000 * 20, lastActive: Date.now() - 86_400_000 },
  { id: "a-sam", name: "Sam Wu", email: "s.wu@acme.io", role: "viewer", workspace: "Acme Staging", status: "invited", createdBy: "a-kira", createdAt: Date.now() - 86_400_000 * 2, lastActive: 0 },
];

interface AccountsState {
  accounts: Account[];
  createAccount: (input: Omit<Account, "id" | "createdAt" | "lastActive" | "status"> & { status?: Account["status"] }) => Account;
  updateAccount: (id: string, patch: Partial<Omit<Account, "id">>) => void;
  deleteAccount: (id: string) => void;
  resetSeed: () => void;
}

export const useAccounts = create<AccountsState>()(
  persist(
    (set) => ({
      accounts: seed,
      createAccount: (input) => {
        const acc: Account = {
          id: `a-${crypto.randomUUID().slice(0, 8)}`,
          createdAt: Date.now(),
          lastActive: 0,
          status: input.status ?? "invited",
          ...input,
        };
        set((s) => ({ accounts: [acc, ...s.accounts] }));
        return acc;
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      resetSeed: () => set({ accounts: seed }),
    }),
    { name: "nexus.accounts", version: 1 },
  ),
);
