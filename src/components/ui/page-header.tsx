"use client";

import { cn } from "@/lib/utils";

/**
 * PageHeader — Consistent page header component
 *
 * Usage:
 *   <PageHeader icon={<Users />} title="账号中心" subtitle="管理你的账号">
 *     <Button>操作</Button>
 *   </PageHeader>
 */

interface PageHeaderProps {
  /** Icon element (typically a Lucide icon) */
  icon: React.ReactNode;
  /** Page title */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Action buttons on the right */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("page-header", className)}>
      <div className="page-header-left">
        <h1 className="page-header-title">
          <span className="text-xhs shrink-0">{icon}</span>
          {title}
        </h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
