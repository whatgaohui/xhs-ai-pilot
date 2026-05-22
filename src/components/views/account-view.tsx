"use client";

/**
 * AccountView — 账号概览 (v4.1)
 *
 * When used inside AccountHubView (sharedAccountData provided):
 *   - Uses shared account data (no duplicate fetches)
 *   - Hides own header/profile/stats (provided by AccountHubHeader)
 *   - Cross-tab navigation via onNavigateToNotes / onOpenCreator
 *
 * When used standalone (no sharedAccountData):
 *   - Falls back to fetching its own data
 *   - Shows full header with account selector, profile card, stats
 */

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { CookieInputDialog } from "@/components/cookie-input-dialog";
import { ManualDataDialog } from "@/components/manual-data-dialog";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo, AccountAnalysis, EngagementTrend } from "@/types";
import type { AccountDataState } from "@/hooks/use-account-data";
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
import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import {
  Users,
  Heart,
  MessageCircle,
  Bookmark,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  FileText,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  XCircle,
  Trash2,
  Eye,
  Share2,
  Clock,
  BarChart3,
  Target,
  Zap,
  Activity,
  PieChart,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  Flame,
  Hash,
  Award,
  PenLine,
  Theater,
  Link2,
  Database,
  Search,
  CheckCircle2,
  CircleDot,
  Minus,
  ChevronRight,
} from "lucide-react";

// ─── Props Interface ───────────────────────────────────────────────────

interface AccountViewProps {
  /** Shared account data from AccountHubView (when inside hub) */
  sharedAccountData?: AccountDataState;
  /** Navigate to notes tab (cross-tab) */
  onNavigateToNotes?: () => void;
  /** Open creator sheet */
  onOpenCreator?: () => void;
}

// ─── Placeholder Chart Component ────────────────────────────────────────

function PlaceholderTrendChart({ label, color = "#FF2442" }: { label: string; color?: string }) {
  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const previewPoints = [
    { x: padding.left, y: padding.top + chartH * 0.6 },
    { x: padding.left + chartW * 0.25, y: padding.top + chartH * 0.5 },
    { x: padding.left + chartW * 0.5, y: padding.top + chartH * 0.35 },
    { x: padding.left + chartW * 0.75, y: padding.top + chartH * 0.25 },
    { x: padding.left + chartW, y: padding.top + chartH * 0.2 },
  ];

  const linePath = `M ${previewPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">—</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible opacity-40">
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + chartH * pct}
            x2={padding.left + chartW}
            y2={padding.top + chartH * pct}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
        />
        {previewPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
          开始采集数据后这里会显示趋势图
        </p>
      </div>
    </div>
  );
}

// SVG Line Chart Component
function TrendLineChart({ data, label, color = "#FF2442" }: { data: { date: string; value: number }[]; label: string; color?: string }) {
  if (data.length < 2) return <PlaceholderTrendChart label={label} color={color} />;

  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + (1 - (d.value - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

  const firstVal = data[0]?.value || 0;
  const lastVal = data[data.length - 1]?.value || 0;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = trendPct >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-medium flex items-center gap-0.5", isUp ? "text-emerald-600" : "text-red-500")}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? "+" : ""}{trendPct}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path d={areaPath} fill={color} fillOpacity={0.08} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" className="opacity-0 hover:opacity-100 transition-opacity" />
        ))}
        {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 2} textAnchor="middle" className="text-[9px] fill-muted-foreground">
            {p.date.slice(5)}
          </text>
        ))}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" className="text-[9px] fill-muted-foreground">
          {formatNumber(maxVal)}
        </text>
        <text x={padding.left - 4} y={padding.top + chartH + 4} textAnchor="end" className="text-[9px] fill-muted-foreground">
          {formatNumber(minVal)}
        </text>
      </svg>
    </div>
  );
}

// Heatmap for best posting times
function PostingTimeHeatmap({ data }: { data: { hour: number; avgEngagement: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="space-y-2">
        {["凌晨 🌙", "早间 🌅", "午间 ☀️", "下午 🌤️", "晚间 🌆", "深夜 🌃"].map((slot) => (
          <div key={slot} className="flex items-center gap-2">
            <span className="text-xs w-16 shrink-0 text-muted-foreground">{slot}</span>
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 h-8 rounded-md border border-dashed border-border/50" />
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground text-center mt-2">采集数据后将显示发布时间分析</p>
      </div>
    );
  }

  const maxEng = Math.max(...data.map((d) => d.avgEngagement), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find((d) => d.hour === i);
    return { hour: i, value: found?.avgEngagement || 0 };
  });

  const timeSlots = [
    { label: "凌晨", hours: [0, 1, 2, 3, 4, 5], icon: "🌙" },
    { label: "早间", hours: [6, 7, 8, 9], icon: "🌅" },
    { label: "午间", hours: [10, 11, 12, 13], icon: "☀️" },
    { label: "下午", hours: [14, 15, 16, 17], icon: "🌤️" },
    { label: "晚间", hours: [18, 19, 20, 21], icon: "🌆" },
    { label: "深夜", hours: [22, 23], icon: "🌃" },
  ];

  return (
    <div className="space-y-2">
      {timeSlots.map((slot) => {
        const slotHours = slot.hours.map((h) => hours.find((hr) => hr.hour === h)!);
        const avgEng = slotHours.reduce((s, h) => s + h.value, 0) / slotHours.length;
        const intensity = maxEng > 0 ? avgEng / maxEng : 0;

        return (
          <div key={slot.label} className="flex items-center gap-2">
            <span className="text-xs w-16 shrink-0 text-muted-foreground">
              {slot.icon} {slot.label}
            </span>
            <div className="flex-1 flex gap-1">
              {slotHours.map((h) => {
                const hIntensity = maxEng > 0 ? h.value / maxEng : 0;
                return (
                  <div key={h.hour} className="flex-1 group relative">
                    <div
                      className={cn(
                        "h-8 rounded-md transition-all duration-200",
                        hIntensity > 0.7 ? "bg-xhs" :
                        hIntensity > 0.4 ? "bg-xhs/60" :
                        hIntensity > 0.1 ? "bg-xhs/25" : "bg-xhs/8"
                      )}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {h.hour}:00 · {formatNumber(h.value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step Guide Card for Empty/Partial State ────────────────────────────

function StepGuideCard({ currentStep, onAction, actionLabel }: { currentStep: number; onAction: () => void; actionLabel: string }) {
  const steps = [
    { num: 1, icon: <Link2 className="w-4 h-4" />, title: "输入账号链接", desc: "粘贴你的小红书主页链接" },
    { num: 2, icon: <Database className="w-4 h-4" />, title: "等待数据采集", desc: "系统自动获取账号数据" },
    { num: 3, icon: <Search className="w-4 h-4" />, title: "查看深度分析", desc: "获得AI驱动的运营洞察" },
  ];

  return (
    <Card className="border-dashed border-2 border-xhs/20 bg-gradient-to-br from-xhs-light/20 via-transparent to-amber-50/20 dark:from-xhs/5 dark:to-amber-950/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-xhs-light to-xhs-light/30 dark:from-xhs/10 dark:to-xhs/5 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" stroke="#FF2442" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="14" cy="20" r="4" stroke="#FF2442" strokeWidth="1.5" />
              <path d="M22 16 L30 16 M22 20 L28 20 M22 24 L30 24" stroke="#FF2442" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">开始你的数据分析之旅</p>
            <p className="text-xs text-muted-foreground mt-0.5">按照以下步骤完成账号数据采集</p>
          </div>
        </div>
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            const isFuture = currentStep < step.num;
            return (
              <div key={step.num} className={cn(
                "flex items-start gap-3 p-3 rounded-xl transition-all duration-300",
                isActive && "bg-xhs-light/50 dark:bg-xhs/10 ring-1 ring-xhs/20",
                isCompleted && "bg-emerald-50/50 dark:bg-emerald-950/10",
                isFuture && "opacity-40",
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                  isCompleted && "bg-emerald-500 text-white",
                  isActive && "bg-xhs text-white",
                  isFuture && "bg-muted text-muted-foreground",
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-muted-foreground", isActive && "text-xhs")}>{step.icon}</span>
                    <p className={cn("text-sm font-medium", isActive && "text-xhs")}>{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{step.desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
        {currentStep <= 1 && (
          <Button size="sm" className="w-full mt-4 bg-gradient-to-r from-xhs to-xhs-dark text-white" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function AccountView({ sharedAccountData, onNavigateToNotes, onOpenCreator }: AccountViewProps) {
  const store = useAppStore();
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen, setActiveTab } = store;

  // Whether we're inside the hub (shared data provided)
  const isInHub = !!sharedAccountData;

  // ─── Standalone State (used when NOT in hub) ─────────────────────────
  const [standaloneAccounts, setStandaloneAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [accountDetail, setAccountDetail] = useState<XhsAccountInfo | null>(null);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Standalone Data Loading (only when NOT in hub) ──────────────────

  useEffect(() => {
    if (!isInHub) loadAccounts();
  }, [isInHub]);

  useEffect(() => {
    if (!isInHub && selectedAccountId) {
      loadAnalysis(selectedAccountId);
    } else if (!isInHub) {
      setLoading(false);
    }
  }, [selectedAccountId, isInHub]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setStandaloneAccounts(data.data || []);
        if (!selectedAccountId && data.data?.length > 0) {
          setSelectedAccountId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  const loadAnalysis = async (accountId: string) => {
    setAnalysisLoading(true);
    setLoading(true);
    try {
      const [detailRes, analysisRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/accounts/${accountId}/analysis`),
      ]);
      const detailData = await detailRes.json();
      const analysisData = await analysisRes.json();
      if (detailData.success) setAccountDetail(detailData.data);
      if (analysisData.success) setAnalysis(analysisData.data);
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setLoading(false);
      setAnalysisLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!selectedAccountId) return;
    setScraping(true);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/scrape`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        loadAnalysis(selectedAccountId);
        loadAccounts();
        toast.success("数据采集成功");
      }
    } catch {
      toast.error("采集失败");
    } finally {
      setScraping(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("账号已删除");
        setSelectedAccountId(null);
        loadAccounts();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Resolve Data Sources ────────────────────────────────────────────

  // When in hub, use shared data; otherwise use standalone data
  const accounts = isInHub ? sharedAccountData!.accounts : standaloneAccounts;
  const currentAnalysis = isInHub ? sharedAccountData!.analysis : analysis;
  const isAnalysisLoading = isInHub ? sharedAccountData!.analysisLoading : analysisLoading;
  const isLoading = isInHub
    ? (sharedAccountData!.loading && accounts.length === 0)
    : (loading && !analysis);
  const selectedAccount = isInHub
    ? sharedAccountData!.selectedAccount
    : (accountDetail || standaloneAccounts.find((a) => a.id === selectedAccountId));

  // ─── Computed Values ─────────────────────────────────────────────────

  const likesTrend = useMemo(() =>
    (currentAnalysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.likes })),
    [currentAnalysis]
  );
  const commentsTrend = useMemo(() =>
    (currentAnalysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.comments })),
    [currentAnalysis]
  );
  const collectsTrend = useMemo(() =>
    (currentAnalysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.collects })),
    [currentAnalysis]
  );

  const engagementRate = useMemo(() => {
    if (!currentAnalysis || !selectedAccount) return "0";
    const totalEng = currentAnalysis.avgLikes + currentAnalysis.avgComments + currentAnalysis.avgCollects;
    const rate = selectedAccount.followers > 0 ? (totalEng / selectedAccount.followers * 100).toFixed(1) : "0";
    return rate;
  }, [currentAnalysis, selectedAccount]);

  const currentStep = useMemo(() => {
    if (!selectedAccount) return 1;
    if (selectedAccount.status === "scraping") return 2;
    if (selectedAccount.status === "partial") return 2;
    if (selectedAccount.status === "error") return 1;
    if (selectedAccount.status === "success" && currentAnalysis) return 3;
    if (selectedAccount.status === "success") return 2;
    return 1;
  }, [selectedAccount, currentAnalysis]);

  const hasZeroData = useMemo(() => {
    if (!currentAnalysis) return true;
    return currentAnalysis.totalPosts === 0 && currentAnalysis.avgLikes === 0 && currentAnalysis.avgComments === 0;
  }, [currentAnalysis]);

  // ─── Status helpers ──────────────────────────────────────────────────

  const getStatusDot = (status?: string) => {
    switch (status) {
      case "success": return "bg-emerald-500";
      case "partial": return "bg-amber-500";
      case "scraping": return "bg-xhs animate-pulse";
      case "error": return "bg-red-500";
      default: return "bg-muted-foreground/30";
    }
  };

  // ─── Navigation handler ─────────────────────────────────────────────

  const handleNavigateToNotes = () => {
    if (onNavigateToNotes) {
      onNavigateToNotes();
    } else {
      // Legacy: map old tab id to new architecture
      setActiveTab("account-hub" as typeof store.activeTab);
    }
  };

  // ─── Loading & Empty States ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={Users}
          title="还没有添加账号"
          description="添加你的第一个小红书账号，开始数据分析"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
          demoLabel="加载演示数据"
          onDemoAction={async () => {
            try {
              const res = await fetch("/api/demo/seed", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                toast.success("演示数据加载成功！");
                if (isInHub) {
                  await sharedAccountData!.refreshAccounts();
                } else {
                  loadAccounts();
                }
              } else {
                toast.error(data.error || "加载演示数据失败");
              }
            } catch {
              toast.error("网络错误，请重试");
            }
          }}
        />
      </div>
    );
  }

  if (!selectedAccountId && !isInHub) {
    return (
      <div className="p-4 md:p-6 space-y-4 view-animate">
        <h2 className="text-lg font-bold">选择账号</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => setSelectedAccountId(account.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  const account = selectedAccount;

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
        {/* ─── Standalone Header (hidden when in hub) ──────────────── */}
        {!isInHub && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="md:hidden -ml-2" onClick={() => setSelectedAccountId(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">账号分析</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">深度数据洞察</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccountId || ""}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950 hidden sm:block"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.nickname || "未命名用户"}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" className="border-border" onClick={() => setEditDialogOpen(true)} disabled={!account}>
                  <Pencil className="w-4 h-4 mr-1" />编辑
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-xhs to-xhs-dark text-white border-0" onClick={() => setScrapeDialogOpen(true)} disabled={scraping || !account}>
                  {scraping ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />采集中...</> : <><RefreshCw className="w-4 h-4 mr-1" />采集</>}
                </Button>
                <Button size="sm" variant="outline" className="border-border" onClick={() => setManualDialogOpen(true)} disabled={!account}>
                  <PenLine className="w-4 h-4 mr-1" />手动补充
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={deleting || !account}>
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确定删除该账号？</AlertDialogTitle>
                      <AlertDialogDescription>所有相关数据（笔记、人设、草稿）将被永久删除。此操作无法撤销。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-white hover:bg-destructive/90">确定删除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Step Guide (standalone only) */}
            {(account?.status === "partial" || account?.status === "error" || account?.status === "idle") && (
              <StepGuideCard
                currentStep={currentStep}
                onAction={() => {
                  if (currentStep <= 1) setEditDialogOpen(true);
                  else setScrapeDialogOpen(true);
                }}
                actionLabel={currentStep <= 1 ? "补充账号信息" : "开始采集"}
              />
            )}

            {/* Account Profile Card (standalone only - hub has AccountHubHeader) */}
            {account && (
              <Card className="overflow-hidden">
                <div className="relative h-2 bg-gradient-to-r from-xhs via-xhs/70 to-amber-400" />
                <div className="relative">
                  <div className="absolute -top-10 left-6 w-24 h-24 rounded-full bg-gradient-to-br from-xhs/10 to-amber-200/10 dark:from-xhs/5 dark:to-amber-400/5 blur-lg" />
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="w-16 h-16 shrink-0 ring-2 ring-xhs/10">
                          <AvatarImage src={proxyXhsImage(account.avatarUrl)} alt={account.nickname} />
                          <AvatarFallback className="bg-xhs-light text-xhs text-xl font-medium">
                            {(account.nickname || "用户").slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background", getStatusDot(account.status))} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {account.status === "success" ? "已同步" : account.status === "partial" ? "部分采集" : account.status === "scraping" ? "采集中" : account.status === "error" ? "采集异常" : "待采集"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{account.nickname || "未命名用户"}</h3>
                          <Badge variant="secondary" className={cn(
                            "text-[10px] border-0",
                            account.status === "success" ? "bg-emerald-50 text-emerald-600" :
                            account.status === "partial" ? "bg-amber-50 text-amber-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {account.status === "success" ? "已同步" : account.status === "partial" ? "部分采集" : account.status === "scraping" ? "采集中" : "待采集"}
                          </Badge>
                        </div>
                        {account.bio && <p className="text-sm text-muted-foreground line-clamp-2">{account.bio}</p>}
                        {account.location && <p className="text-xs text-muted-foreground mt-1">📍 {account.location}</p>}
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {[
                            { label: "粉丝", value: formatNumber(account.followers) },
                            { label: "关注", value: formatNumber(account.following) },
                            { label: "获赞与收藏", value: formatNumber(account.likedCollected) },
                            { label: "互动率", value: engagementRate === "0" ? "—" : engagementRate + "%" },
                          ].map((stat) => (
                            <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30 dark:bg-muted/20 border border-border/30">
                              <p className="text-base font-bold tracking-tight">{stat.value}</p>
                              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ─── Shared Analysis Content (always shown) ──────────────── */}
        {currentAnalysis && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: "总笔记数", value: currentAnalysis.totalPosts, bg: "stat-icon-gradient-rose" },
                { icon: Heart, label: "平均点赞", value: formatNumber(currentAnalysis.avgLikes), bg: "stat-icon-gradient-xhs" },
                { icon: MessageCircle, label: "平均评论", value: formatNumber(currentAnalysis.avgComments), bg: "stat-icon-gradient-emerald" },
                { icon: Bookmark, label: "平均收藏", value: formatNumber(currentAnalysis.avgCollects), bg: "stat-icon-gradient-amber" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm", stat.bg)}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold tracking-tight stat-count-animate">{stat.value}</p>
                          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Engagement Breakdown + Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* Engagement Composition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-xhs" />
                    互动构成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const total = currentAnalysis.avgLikes + currentAnalysis.avgComments + currentAnalysis.avgCollects + currentAnalysis.avgShares;
                    if (total === 0) return (
                      <div className="py-4">
                        <div className="h-3 rounded-full overflow-hidden flex border border-dashed border-border/50">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex-1 border-r border-dashed border-border/30 last:border-r-0" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-3">采集数据后将显示互动构成</p>
                      </div>
                    );
                    const items = [
                      { label: "点赞", value: currentAnalysis.avgLikes, color: "bg-red-400", pct: ((currentAnalysis.avgLikes / total) * 100).toFixed(1) },
                      { label: "评论", value: currentAnalysis.avgComments, color: "bg-emerald-400", pct: ((currentAnalysis.avgComments / total) * 100).toFixed(1) },
                      { label: "收藏", value: currentAnalysis.avgCollects, color: "bg-amber-400", pct: ((currentAnalysis.avgCollects / total) * 100).toFixed(1) },
                      { label: "分享", value: currentAnalysis.avgShares, color: "bg-rose-400", pct: ((currentAnalysis.avgShares / total) * 100).toFixed(1) },
                    ];
                    return (
                      <>
                        <div className="h-3 rounded-full overflow-hidden flex">
                          {items.map((item) => (
                            <div key={item.label} className={cn("h-full transition-all duration-500", item.color)} style={{ width: `${item.pct}%` }} />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                                <span className="text-xs text-muted-foreground">{item.label}</span>
                              </div>
                              <span className="text-xs font-medium">{item.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Top Posts - with cross-tab navigation */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      热门笔记
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-xhs hover:text-xhs-dark" onClick={handleNavigateToNotes}>
                      查看全部 <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentAnalysis.topPosts.length > 0 ? (
                    <div className="space-y-2">
                      {currentAnalysis.topPosts.slice(0, 5).map((post, i) => (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/30 transition-all duration-200 group cursor-pointer"
                          onClick={handleNavigateToNotes}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                            i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1 group-hover:text-xhs transition-colors">{post.title || "无标题"}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-0.5 text-red-500"><Heart className="w-3 h-3" />{formatNumber(post.likes)}</span>
                              <span className="flex items-center gap-0.5 text-emerald-500"><MessageCircle className="w-3 h-3" />{formatNumber(post.comments)}</span>
                              <span className="flex items-center gap-0.5 text-amber-500"><Bookmark className="w-3 h-3" />{formatNumber(post.collects)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2 mb-2 rounded-lg border border-dashed border-border/50">
                          <div className="w-7 h-7 rounded-lg bg-muted/30" />
                          <div className="flex-1">
                            <div className="h-3 w-3/4 rounded bg-muted/30 mb-1" />
                            <div className="h-2 w-1/2 rounded bg-muted/20" />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground text-center mt-2">暂无热门笔记数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── No Analysis Yet (show step guide in hub mode) ────────── */}
        {!currentAnalysis && isInHub && account && (account.status === "partial" || account.status === "error" || account.status === "idle") && (
          <StepGuideCard
            currentStep={currentStep}
            onAction={() => {
              // In hub mode, the header already has edit/scrape buttons
              // Just show a hint
              toast.info("请使用顶部的「编辑」或「刷新」按钮操作");
            }}
            actionLabel={currentStep <= 1 ? "补充账号信息" : "开始采集"}
          />
        )}

        {/* ─── Analysis Loading (in hub mode) ────────────────────────── */}
        {!currentAnalysis && isInHub && account && account.status === "success" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-5 w-12 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-16 rounded bg-muted/50 animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">正在加载分析数据...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Standalone Dialogs ────────────────────────────────────── */}
        {!isInHub && (
          <>
            <EditAccountDialog
              account={account || null}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onSuccess={() => {
                if (selectedAccountId) {
                  loadAnalysis(selectedAccountId);
                  loadAccounts();
                }
              }}
            />
            {account && (
              <CookieInputDialog
                open={scrapeDialogOpen}
                onOpenChange={setScrapeDialogOpen}
                accountUrl={account.xhsUrl}
                accountId={account.id}
                onSuccess={() => {
                  if (selectedAccountId) {
                    loadAnalysis(selectedAccountId);
                    loadAccounts();
                  }
                }}
              />
            )}
            {account && (
              <ManualDataDialog
                open={manualDialogOpen}
                onOpenChange={setManualDialogOpen}
                accountId={account.id}
                existingData={account as unknown as Record<string, unknown>}
                onSuccess={() => {
                  if (selectedAccountId) {
                    loadAnalysis(selectedAccountId);
                    loadAccounts();
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
