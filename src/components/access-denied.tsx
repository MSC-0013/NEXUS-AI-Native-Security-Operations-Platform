import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { ROLE_LABEL, type Role, type Permission } from "@/lib/rbac";

export function AccessDenied({ role, permission, path }: { role: Role; permission: Permission; path: string }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center p-8">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface/60 p-6 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/10 text-red-400 mb-4">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role <span className="font-mono text-foreground">{ROLE_LABEL[role]}</span> is missing the{" "}
          <span className="font-mono text-foreground">{permission}</span> permission required to view{" "}
          <span className="font-mono text-foreground">{path}</span>.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-surface"
          >
            <ArrowLeft className="size-3.5" /> Back to dashboard
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/15 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
          >
            Review permissions
          </Link>
        </div>
      </div>
    </div>
  );
}
