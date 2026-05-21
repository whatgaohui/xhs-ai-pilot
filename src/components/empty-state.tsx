"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  demoLabel?: string;
  onDemoAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  demoLabel,
  onDemoAction,
  className,
}: EmptyStateProps) {
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoAction = async () => {
    if (!onDemoAction) return;
    setDemoLoading(true);
    try {
      await onDemoAction();
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 px-4 text-center relative bg-dots rounded-xl",
        className
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-xhs-light to-xhs-light/40 flex items-center justify-center mb-5 animate-float">
        <Icon className="w-9 h-9 text-xhs/70" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gradient-xhs">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-gradient-to-r from-xhs to-xhs-dark text-white shadow-sm shadow-xhs/20 hover:shadow-md hover:shadow-xhs/30">
            {actionLabel}
          </Button>
        )}
        {demoLabel && onDemoAction && (
          <Button
            variant="outline"
            onClick={handleDemoAction}
            disabled={demoLoading}
            className="border-border"
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                加载中...
              </>
            ) : (
              demoLabel
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
