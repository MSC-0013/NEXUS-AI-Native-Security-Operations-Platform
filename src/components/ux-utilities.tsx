import * as React from "react";
import { cn } from "@/lib/utils";
import { TriangleAlert as AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*  PageSkeleton                                                              */
/* -------------------------------------------------------------------------- */

interface PageSkeletonProps {
  sections?: Array<"header" | "cards" | "table">;
  cardCount?: number;
  tableRows?: number;
}

export function PageSkeleton({
  sections = ["header", "cards", "table"],
  cardCount = 4,
  tableRows = 5,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6 p-6">
      {sections.includes("header") && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}
      {sections.includes("cards") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      )}
      {sections.includes("table") && (
        <LoadingTable rows={tableRows} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptyState                                                                */
/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: ButtonProps["variant"] };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <Icon className="size-10 text-muted-foreground/60" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button variant={action.variant ?? "outline"} size="sm" onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ErrorBoundary                                                             */
/* -------------------------------------------------------------------------- */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <AlertTriangle className="size-10 text-critical" />
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/*  LoadingCard                                                               */
/* -------------------------------------------------------------------------- */

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface/60 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-3 h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-16" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LoadingTable                                                              */
/* -------------------------------------------------------------------------- */

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      {/* header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i === 0 ? "w-24" : i === columns - 1 ? "w-16" : "w-20")} />
          ))}
        </div>
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 border-b last:border-0 px-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "w-32" : c === columns - 1 ? "w-14" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StaleDataWarning                                                          */
/* -------------------------------------------------------------------------- */

interface StaleDataWarningProps {
  timestamp: Date | string;
  onRefresh?: () => void;
  className?: string;
}

export function StaleDataWarning({ timestamp, onRefresh, className }: StaleDataWarningProps) {
  const formatted =
    typeof timestamp === "string"
      ? timestamp
      : timestamp.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-surface/60 px-4 py-2.5 text-sm",
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-high" />
      <span className="text-muted-foreground">
        Data may be stale &mdash; last updated at <span className="font-mono text-foreground">{formatted}</span>
      </span>
      {onRefresh && (
        <Button variant="ghost" size="sm" onClick={onRefresh} className="ml-auto shrink-0">
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ConfirmDialog                                                             */
/* -------------------------------------------------------------------------- */

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  PageHeader                                                                */
/* -------------------------------------------------------------------------- */

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:mt-0 mt-3">{actions}</div>}
    </div>
  );
}
