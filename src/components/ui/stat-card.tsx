"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * StatCard — Consistent stat card component
 *
 * Renders a stat card with icon, label, value, and optional change indicator.
 * Uses the existing .stat-card CSS class and .stat-icon-gradient-* utilities.
 *
 * Usage:
 *   <StatCard icon={<Users />} iconVariant="rose" label="管理账号" value={42} change={{ value: 12.5 }} />
 */

type IconVariant = "rose" | "amber" | "emerald" | "blue" | "xhs" | "purple";

interface StatCardProps {
  /** Icon element (typically a Lucide icon) */
  icon: React.ReactNode;
  /** Icon color variant — maps to .stat-icon-gradient-* */
  iconVariant?: IconVariant;
  /** Stat label text */
  label: string;
  /** Stat value — string or number */
  value: string | number;
  /** Optional change indicator */
  change?: {
    /** Percentage change value (positive = up, negative = down) */
    value: number;
    /** Optional label for the change (e.g., "vs上周") */
    label?: string;
  };
  /** Additional class names */
  className?: string;
  /** Optional children for extra content (e.g., sparkline) */
  children?: React.ReactNode;
}

const iconVariantMap: Record<IconVariant, string> = {
  rose: "stat-icon-gradient-rose",
  amber: "stat-icon-gradient-amber",
  emerald: "stat-icon-gradient-emerald",
  blue: "stat-icon-gradient-blue",
  xhs: "stat-icon-gradient-xhs",
  purple: "stat-icon-gradient-purple",
};

export function StatCard({
  icon,
  iconVariant = "rose",
  label,
  value,
  change,
  className,
  children,
}: StatCardProps) {
  const isPositive = change ? change.value >= 0 : true;

  return (
    <div className={cn("stat-card group", className)}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white transition-transform duration-300 group-hover:scale-110",
            iconVariantMap[iconVariant]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-2">
            <p className="stat-value stat-count-animate">{value}</p>
            {change && (
              <span
                className={cn(
                  "text-[11px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
                  isPositive
                    ? "bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100/60 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? "+" : ""}
                {change.value}%
              </span>
            )}
          </div>
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
