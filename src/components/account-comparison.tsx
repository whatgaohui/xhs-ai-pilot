"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Users,
  UserPlus,
  Heart,
  FileText,
  TrendingUp,
  GitCompareArrows,
  Crown,
  CheckCircle2,
  X as XIcon,
  Loader2,
} from "lucide-react";
import type { XhsAccountInfo } from "@/types";

// ─── Color palette for accounts (XHS-themed) ──────────────────────────

const ACCOUNT_COLORS = [
  { name: "rose", bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-600", border: "border-rose-300", bar: "bg-rose-400", barLight: "bg-rose-100", ring: "ring-rose-400" },
  { name: "amber", bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-300", bar: "bg-amber-400", barLight: "bg-amber-100", ring: "ring-amber-400" },
  { name: "emerald", bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-300", bar: "bg-emerald-400", barLight: "bg-emerald-100", ring: "ring-emerald-400" },
  { name: "xhs", bg: "bg-xhs", light: "bg-xhs-light", text: "text-xhs", border: "border-xhs-300", bar: "bg-xhs-400", barLight: "bg-xhs-100", ring: "ring-xhs-400" },
] as const;

// ─── Metric definitions ───────────────────────────────────────────────

interface MetricDef {
  key: string;
  label: string;
  icon: React.ElementType;
  getValue: (account: XhsAccountInfo, postsCount?: number) => number;
  formatValue: (value: number) => string;
}

const METRICS: MetricDef[] = [
  {
    key: "followers",
    label: "粉丝数",
    icon: Users,
    getValue: (a) => a.followers || 0,
    formatValue: formatNumber,
  },
  {
    key: "following",
    label: "关注数",
    icon: UserPlus,
    getValue: (a) => a.following || 0,
    formatValue: formatNumber,
  },
  {
    key: "likedCollected",
    label: "获赞与收藏",
    icon: Heart,
    getValue: (a) => a.likedCollected || 0,
    formatValue: formatNumber,
  },
  {
    key: "notesCount",
    label: "笔记数",
    icon: FileText,
    getValue: (a) => a.notesCount || 0,
    formatValue: formatNumber,
  },
  {
    key: "avgEngagement",
    label: "篇均互动",
    icon: TrendingUp,
    getValue: (a) => {
      const notes = a.notesCount || 0;
      const likes = a.likedCollected || 0;
      return notes > 0 ? Math.round(likes / notes) : 0;
    },
    formatValue: formatNumber,
  },
];

// ─── Utility ──────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toLocaleString("zh-CN");
}

// ─── Types ────────────────────────────────────────────────────────────

interface AccountComparisonProps {
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Main Component ───────────────────────────────────────────────────

export function AccountComparison({
  accounts,
  open,
  onOpenChange,
}: AccountComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selectedIds.has(a.id)),
    [accounts, selectedIds]
  );

  // Compute metric values for selected accounts
  const metricData = useMemo(() => {
    if (selectedAccounts.length < 2) return [];
    return METRICS.map((metric) => {
      const values = selectedAccounts.map((a) => ({
        accountId: a.id,
        value: metric.getValue(a),
      }));
      const maxVal = Math.max(...values.map((v) => v.value), 1);
      const winnerValue = Math.max(...values.map((v) => v.value));
      const winnerIds = values
        .filter((v) => v.value === winnerValue && v.value > 0)
        .map((v) => v.accountId);
      return { metric, values, maxVal, winnerIds };
    });
  }, [selectedAccounts]);

  // Overall score (sum of rank positions across all metrics)
  const overallScores = useMemo(() => {
    if (selectedAccounts.length < 2) return [];
    const scores: { accountId: string; nickname: string; score: number; wins: number }[] = [];
    for (const acc of selectedAccounts) {
      let score = 0;
      let wins = 0;
      for (const md of metricData) {
        const val = md.values.find((v) => v.accountId === acc.id)?.value || 0;
        // Rank: lower is better (1st place = 1)
        const rank =
          md.values
            .sort((a, b) => b.value - a.value)
            .findIndex((v) => v.accountId === acc.id) + 1;
        score += rank;
        if (md.winnerIds.includes(acc.id)) wins++;
      }
      scores.push({ accountId: acc.id, nickname: acc.nickname, score, wins });
    }
    scores.sort((a, b) => a.score - b.score);
    return scores;
  }, [selectedAccounts, metricData]);

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    if (selectedIds.size >= 2) {
      setShowComparison(true);
    }
  };

  const handleBack = () => {
    setShowComparison(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowComparison(false);
      setSelectedIds(new Set());
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[672px] md:w-[800px] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <SheetHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-xhs" />
              {showComparison ? "账号对比" : "选择对比账号"}
            </SheetTitle>
            <SheetDescription className="text-xs mt-1">
              {showComparison
                ? `正在对比 ${selectedAccounts.length} 个账号的数据`
                : "选择 2-4 个账号进行数据对比"}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            {showComparison && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                返回选择
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleClose(false)}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4">
            {!showComparison ? (
              <AccountSelection
                accounts={accounts}
                selectedIds={selectedIds}
                onToggle={toggleAccount}
                onCompare={handleCompare}
              />
            ) : (
              <ComparisonResults
                accounts={selectedAccounts}
                metricData={metricData}
                overallScores={overallScores}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Account Selection Phase ──────────────────────────────────────────

function AccountSelection({
  accounts,
  selectedIds,
  onToggle,
  onCompare,
}: {
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onCompare: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Selection count badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs border-0",
              selectedIds.size >= 2
                ? "bg-emerald-50 text-emerald-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            已选 {selectedIds.size}/4
          </Badge>
          {selectedIds.size < 2 && (
            <span className="text-xs text-muted-foreground">
              至少选择 2 个账号
            </span>
          )}
        </div>
        <Button
          size="sm"
          disabled={selectedIds.size < 2}
          className={cn(
            "text-white shadow-sm",
            selectedIds.size >= 2
              ? "bg-xhs hover:bg-xhs-dark shadow-xhs/20"
              : "bg-muted cursor-not-allowed"
          )}
          onClick={onCompare}
        >
          <GitCompareArrows className="w-4 h-4 mr-1" />
          开始对比
        </Button>
      </div>

      {/* Account list with checkboxes */}
      <div className="space-y-2">
        {accounts.map((account, index) => {
          const isSelected = selectedIds.has(account.id);
          const colorIndex = [...selectedIds].indexOf(account.id);
          const color =
            isSelected && colorIndex >= 0
              ? ACCOUNT_COLORS[colorIndex]
              : null;

          return (
            <Card
              key={account.id}
              className={cn(
                "transition-all duration-200 cursor-pointer border",
                isSelected
                  ? `${color?.border || "border-xhs/30"} ${color?.light || "bg-xhs-light/30"} shadow-sm`
                  : "border-border hover:border-muted-foreground/30 hover:shadow-sm"
              )}
              onClick={() => onToggle(account.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    className={cn(
                      isSelected && colorIndex >= 0 && ACCOUNT_COLORS[colorIndex]
                        ? `border-[${ACCOUNT_COLORS[colorIndex]?.name}]`
                        : ""
                    )}
                    onCheckedChange={() => onToggle(account.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={proxyXhsImage(account.avatarUrl)} alt={account.nickname} />
                    <AvatarFallback className="bg-xhs-light text-xhs text-xs font-medium">
                      {(account.nickname || "用户").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {account.nickname || "未命名用户"}
                      </span>
                      {isSelected && color && (
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            color.bg
                          )}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatNumber(account.followers)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {account.notesCount}笔记
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatNumber(account.likedCollected)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {accounts.length < 2 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            需要至少 2 个账号才能进行对比
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Comparison Results Phase ─────────────────────────────────────────

function ComparisonResults({
  accounts,
  metricData,
  overallScores,
}: {
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  metricData: {
    metric: MetricDef;
    values: { accountId: string; value: number }[];
    maxVal: number;
    winnerIds: string[];
  }[];
  overallScores: { accountId: string; nickname: string; score: number; wins: number }[];
}) {
  // Assign color index based on the position in the accounts array
  const colorMap = new Map<string, number>();
  accounts.forEach((a, i) => colorMap.set(a.id, i));

  return (
    <div className="space-y-5">
      {/* Account headers with color indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {accounts.map((account, index) => {
          const color = ACCOUNT_COLORS[index];
          const overall = overallScores.find((o) => o.accountId === account.id);
          const isTop = overall && overallScores[0]?.accountId === account.id && overall.wins > 0;
          return (
            <Card
              key={account.id}
              className={cn(
                "border overflow-hidden relative",
                color.border
              )}
            >
              {isTop && (
                <div className="absolute top-0 right-0">
                  <div className={cn("text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg", color.bg)}>
                    <Crown className="w-2.5 h-2.5 inline mr-0.5" />
                    综合
                  </div>
                </div>
              )}
              <CardContent className="p-3 text-center">
                <Avatar className="w-10 h-10 mx-auto mb-1.5">
                  <AvatarImage src={proxyXhsImage(account.avatarUrl)} alt={account.nickname} />
                  <AvatarFallback className="bg-xhs-light text-xhs text-sm font-medium">
                    {(account.nickname || "用户").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium truncate">{account.nickname}</p>
                <div className={cn("inline-block w-3 h-1 rounded-full mt-1", color.bg)} />
                {overall && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {overall.wins} 项领先
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metric comparisons */}
      <div className="space-y-3">
        {metricData.map(({ metric, values, maxVal, winnerIds }) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="border border-border overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5" />
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {accounts.map((account) => {
                  const colorIndex = colorMap.get(account.id) ?? 0;
                  const color = ACCOUNT_COLORS[colorIndex];
                  const val = values.find((v) => v.accountId === account.id);
                  const numericVal = val?.value || 0;
                  const pct = maxVal > 0 ? (numericVal / maxVal) * 100 : 0;
                  const isWinner = winnerIds.includes(account.id) && numericVal > 0;

                  return (
                    <div key={account.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              color.bg
                            )}
                          />
                          <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                            {account.nickname}
                          </span>
                          {isWinner && (
                            <span className="flex items-center text-[10px] text-amber-600 font-medium">
                              <Crown className="w-2.5 h-2.5 mr-0.5" />
                              领先
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            isWinner ? color.text : "text-foreground"
                          )}
                        >
                          {metric.formatValue(numericVal)}
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            isWinner ? color.bar : color.barLight
                          )}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                        {isWinner && (
                          <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                            <CheckCircle2 className={cn("w-2.5 h-2.5", color.bg, "text-white rounded-full")} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall ranking */}
      <Card className="border border-border bg-gradient-to-br from-xhs-light/20 to-transparent">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-xhs">
            <Crown className="w-3.5 h-3.5" />
            综合排名
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-2">
            {overallScores.map((overall, rank) => {
              const colorIndex = colorMap.get(overall.accountId) ?? 0;
              const color = ACCOUNT_COLORS[colorIndex];
              const account = accounts.find((a) => a.id === overall.accountId);
              const isTop = rank === 0 && overall.wins > 0;
              return (
                <div
                  key={overall.accountId}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors",
                    isTop ? `${color.light} ${color.border} border` : "bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isTop ? `${color.bg} text-white` : "bg-muted text-muted-foreground"
                    )}
                  >
                    {rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {account?.nickname || "未知"}
                      </span>
                      <span className={cn("w-2 h-2 rounded-full", color.bg)} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {overall.wins} 项领先 · 综合评分 {overallScores.length > 1 ? ((overallScores[0].score / Math.max(overall.score, 1)) * 100).toFixed(0) : 100}%
                    </p>
                  </div>
                  {isTop && (
                    <Badge className="text-[10px] border-0 bg-xhs text-white">
                      最优
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
