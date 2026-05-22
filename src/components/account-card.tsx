"use client";

import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, FileText, RefreshCw, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, XCircle } from "lucide-react";
import type { XhsAccountInfo } from "@/types";

interface AccountCardProps {
  account: XhsAccountInfo & { postsCount?: number; draftsCount?: number; engagementData?: number[] };
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
  onRetry?: () => void;
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "scraping":
      return (
        <Badge variant="secondary" className="gap-1 text-xs border-xhs/30 bg-xhs-light/30 text-xhs">
          <Loader2 className="w-3 h-3 animate-spin" />
          采集中<span className="animate-pulse">...</span>
        </Badge>
      );
    case "success":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-emerald-600 bg-emerald-50 border-0">
          <CheckCircle2 className="w-3 h-3" />
          已同步
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-amber-600 bg-amber-50 border-0">
          <AlertCircle className="w-3 h-3" />
          部分数据
        </Badge>
      );
    case "error":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-red-600 bg-red-50 border-0">
          <XCircle className="w-3 h-3" />
          采集失败
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <RefreshCw className="w-3 h-3" />
          待采集
        </Badge>
      );
  }
}

function MiniSparkline({ data, color = "#FF2442" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Calculate trend percentage
  const firstVal = data[0] || 0;
  const lastVal = data[data.length - 1] || 0;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = trendPct >= 0;

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {firstVal > 0 && (
        <span className={cn("text-[10px] font-medium flex items-center", isUp ? "text-emerald-600" : "text-red-500")}>
          {isUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
          {isUp ? "+" : ""}{trendPct}%
        </span>
      )}
    </div>
  );
}

export function AccountCard({ account, onClick, selected, compact, className, onRetry }: AccountCardProps) {
  const isScraping = account.status === "scraping";
  const isPartial = account.status === "partial";
  const isError = account.status === "error";

  const handleClick = () => {
    if (isError && onRetry) {
      onRetry();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        selected && "ring-2 ring-xhs/60 border-xhs/40 bg-xhs-light/20",
        // Scraping state: pulsing border
        isScraping && "border-xhs/40 ring-2 ring-xhs/20 animate-pulse",
        // Error state: subtle red border
        isError && "border-red-200 dark:border-red-900/50",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className={cn(compact ? "w-9 h-9" : "w-11 h-11", "shrink-0")}>
              <AvatarImage src={proxyXhsImage(account.avatarUrl)} alt={account.nickname} />
              <AvatarFallback className="bg-xhs-light text-xhs text-sm font-medium">
                {(account.nickname || "用户").slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            {/* Scraping overlay: spinner on avatar */}
            {isScraping && (
              <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-xhs animate-spin" />
              </div>
            )}
            {/* Error: red dot */}
            {isError && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-background" />
            )}
            {/* Partial: amber dot */}
            {isPartial && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>部分数据缺失</p>
                  <p className="text-muted-foreground">点击补充完整数据</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {account.nickname || "未命名用户"}
              </span>
              <StatusIndicator status={account.status} />
            </div>
            {account.bio && !compact && (
              <p className="text-xs text-muted-foreground truncate mb-2">{account.bio}</p>
            )}
            {/* Partial data info */}
            {isPartial && !compact && account.errorMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {account.errorMessage.replace("[部分采集] ", "")}
              </p>
            )}
            {/* Error info */}
            {isError && !compact && (
              <p className="text-xs text-red-500 truncate mb-1.5 flex items-center gap-1">
                <XCircle className="w-3 h-3 shrink-0" />
                {account.errorMessage || "采集失败，点击重试"}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {formatNumber(account.followers)}粉丝
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {account.postsCount ?? account.notesCount}笔记
              </span>
            </div>
            {/* Mini sparkline for engagement trend */}
            {account.engagementData && account.engagementData.length >= 2 && !compact && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <MiniSparkline data={account.engagementData} />
              </div>
            )}
            {account.lastScrapedAt && !compact && (
              <p className="text-xs text-muted-foreground mt-1.5">
                最后同步: {new Date(account.lastScrapedAt).toLocaleDateString("zh-CN")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { formatNumber, MiniSparkline };
