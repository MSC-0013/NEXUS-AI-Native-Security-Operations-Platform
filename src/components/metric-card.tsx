import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export type MetricPoint = {
  h: string;
  v: number;
};

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: { v: string; up: boolean };
  icon: LucideIcon;
  tone?: "default" | "critical" | "high" | "healthy" | "info";
  series?: MetricPoint[];
}

const TONES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-primary",
  critical: "text-critical",
  high: "text-high",
  healthy: "text-healthy",
  info: "text-info",
};

export function MetricCard({ label, value, delta, icon: Icon, tone = "default", series }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          <Icon className={cn("size-3.5", TONES[tone])} />
          {label}
        </div>
        {delta && (
          <span className={cn(
            "text-[10px] font-mono",
            delta.up ? "text-critical" : "text-healthy",
          )}>
            {delta.up ? "▲" : "▼"} {delta.v}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {series && (
          <div className="h-10 w-24">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="currentColor" fill={`url(#g-${label})`} strokeWidth={1.5} className={TONES[tone]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
