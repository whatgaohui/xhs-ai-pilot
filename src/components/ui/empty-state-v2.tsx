"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * EmptyStateV2 — Enhanced empty state component
 *
 * Consistent empty state with floating icon animation, title, description,
 * and optional CTA buttons. Follows the "还没有X" + "开始Y来Z" wording pattern.
 *
 * Usage:
 *   <EmptyStateV2
 *     icon={FolderOpen}
 *     title="素材库还空着"
 *     description="上传你的第一份素材，开始构建创作弹药库"
 *     actions={<Button onClick={...}>上传文件</Button>}
 *   />
 */

interface EmptyStateV2Props {
  /** Icon component class (Lucide icon) */
  icon: LucideIcon;
  /** Title text — use "还没有X" pattern */
  title: string;
  /** Description text — use "开始Y来Z" pattern */
  description: string;
  /** Optional action buttons */
  actions?: React.ReactNode;
  /** Optional secondary action (e.g., "加载演示数据") */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class names */
  className?: string;
}

export function EmptyStateV2({
  icon: Icon,
  title,
  description,
  actions,
  secondaryAction,
  className,
}: EmptyStateV2Props) {
  const [secondaryLoading, setSecondaryLoading] = useState(false);

  const handleSecondaryAction = async () => {
    if (!secondaryAction) return;
    setSecondaryLoading(true);
    try {
      await secondaryAction.onClick();
    } finally {
      setSecondaryLoading(false);
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
      <h3 className="text-lg font-semibold mb-2 gradient-text-brand">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actions}
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={handleSecondaryAction}
            disabled={secondaryLoading}
            className="border-border"
          >
            {secondaryLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                加载中...
              </>
            ) : (
              secondaryAction.label
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
