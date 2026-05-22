import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { InspectorPanel } from "@/components/inspector-panel";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  // Client-side mock auth gate. Falls through to login if no session.
  // SSR-safe: read inside the component, not in beforeLoad.
  if (typeof window !== "undefined") {
    const user = useAuth.getState().user;
    if (!user) {
      throw redirect({ to: "/login" });
    }
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
