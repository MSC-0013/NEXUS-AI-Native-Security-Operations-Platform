import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { InspectorPanel } from "@/components/inspector-panel";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const user = useAuth((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid SSR/hydration redirect — only gate on client after mount.
  if (mounted && !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <InspectorPanel />
    </div>
  );
}
