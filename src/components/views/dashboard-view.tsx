"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber, MiniSparkline } from "@/components/account-card";
import { AccountComparison } from "@/components/account-comparison";
import { TrendingTopics } from "@/components/trending-topics";
import { useAppStore } from "@/store/app-store";
import { useNotificationStore } from "@/store/notification-store";
import { toast } from "sonner";
import type { XhsAccountInfo, XhsPostInfo } from "@/types";
import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import {
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  Plus,
  PenLine,
  Heart,
  MessageCircle,
  Bookmark,
  Download,
  Loader2,
  TrendingDown,
  BarChart3,
  Clock,
  Zap,
  Eye,
  ArrowUpRight,
  Flame,
  Target,
  CalendarClock,
  GitCompareArrows,
  RefreshCw,
  Activity,
  Database,
  Bell,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  Rocket,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExportDialog } from "@/components/export-dialog";

/** Activity feed item type */
interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  text: string;
  time: Date;
  type: "data" | "post" | "ai" | "export";
}

/** AI Strategy recommendation type */
interface StrategyRecommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  priority: "高" | "中" | "低";
}

/** Icon mapping for strategy recommendations */
const strategyIconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Zap,
  Lightbulb,
  Calendar,
  Users,
  Sparkles,
  BarChart3,
  Rocket,
  Heart,
};

/** Generate mock activity feed based on accounts and posts */
function generateActivityFeed(accounts: (XhsAccountInfo & { postsCount?: number })[], posts: XhsPostInfo[]): ActivityItem[] {
  const now = new Date();
  const activities: ActivityItem[] = [];

  accounts.forEach((acc, i) => {
    if (acc.status === "success" || acc.status === "partial") {
      activities.push({
        id: `acc-${acc.id}`,
        icon: Database,
        iconBg: "stat-icon-gradient-emerald",
        text: `${acc.nickname || "账号"} 数据已采集`,
        time: new Date(now.getTime() - (i + 1) * 2 * 60 * 1000),
        type: "data",
      });
    }
  });

  posts.slice(0, 2).forEach((post, i) => {
    activities.push({
      id: `post-${post.id}`,
      icon: FileText,
      iconBg: "stat-icon-gradient-amber",
      text: `新笔记发布：${(post.title || "无标题").slice(0, 15)}...`,
      time: new Date(now.getTime() - (i + 3) * 5 * 60 * 1000),
      type: "post",
    });
  });

  if (posts.length > 0) {
    activities.push({
      id: "ai-gen",
      icon: Sparkles,
      iconBg: "stat-icon-gradient-xhs",
      text: "AI内容生成完成",
      time: new Date(now.getTime() - 10 * 60 * 1000),
      type: "ai",
    });
  }

  if (accounts.length > 0) {
    activities.push({
      id: "export",
      icon: Download,
      iconBg: "stat-icon-gradient-rose",
      text: "数据导出完成",
      time: new Date(now.getTime() - 30 * 60 * 1000),
      type: "export",
    });
  }

  return activities.slice(0, 6);
}

/** Format relative time in Chinese */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  return `${diffDay}天前`;
}

/** Activity type border color mapping */
const activityBorderColor: Record<ActivityItem["type"], string> = {
  data: "border-l-blue-400 dark:border-l-blue-500",
  post: "border-l-amber-400 dark:border-l-amber-500",
  ai: "border-l-purple-400 dark:border-l-purple-500",
  export: "border-l-emerald-400 dark:border-l-emerald-500",
};

/** Mini SVG sparkline for stat cards - enhanced with pulse dot */
function StatSparkline({ data, color = "#FF2442" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const pad = 2;

  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (val - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;
  const colorId = color.replace("#", "");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible mt-1.5">
      <defs>
        <linearGradient id={`spark-grad-${colorId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${colorId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot with pulse animation */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} opacity="0.2">
        <animate attributeName="r" values="2.5;5;2.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

/** Generate sparkline data for stat cards */
function generateStatSparklineData(key: string, base: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(base * (0.7 + Math.sin(i * 1.3 + base * 0.01) * 0.3));
    data.push(Math.max(variation, 1));
  }
  return data;
}

type DateRange = 7 | 30 | 90;

/** Generate simulated trend data based on date range */
function generateTrend(key: string, range: DateRange): { value: number; isPositive: boolean } {
  const seed = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + range;
  const pseudoRandom = ((Math.sin(seed * 9301 + 49297) % 233280) + 233280) % 233280 / 233280;

  const rangeConfig: Record<DateRange, { min: number; max: number }> = {
    7: { min: 5, max: 25 },
    30: { min: 3, max: 15 },
    90: { min: 1, max: 10 },
  };

  const { min, max } = rangeConfig[range];
  const magnitude = min + pseudoRandom * (max - min);
  const isPositive = pseudoRandom > 0.3;
  const value = parseFloat(magnitude.toFixed(1));

  return { value, isPositive };
}

/** SVG Area Chart with cubic bezier curves, grid lines, tooltips, and dot markers */
function AreaChart({ data, labels, height = 160 }: { data: number[]; labels: string[]; height?: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!data || data.length < 2) return null;

  const width = 320;
  const padX = 28;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const rangeVal = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + (1 - (val - minVal) / rangeVal) * chartH;
    return { x, y };
  });

  // Build smooth cubic bezier path
  const tension = 0.3;
  let smoothPath = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    smoothPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  const areaPath = `${smoothPath} L ${points[points.length - 1].x},${height - padY} L ${points[0].x},${height - padY} Z`;

  // Grid lines
  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => padY + (i / gridLines) * chartH);
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => Math.round(maxVal - (i / gridLines) * rangeVal));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="area-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF2442" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#FF2442" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF2442" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridYs.map((y, i) => (
        <g key={`grid-${i}`}>
          <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          <text x={padX - 4} y={y + 3} textAnchor="end" fill="currentColor" fillOpacity="0.3" fontSize="8" fontFamily="system-ui">
            {formatNumber(gridValues[i])}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#area-chart-grad)" />

      {/* Smooth line */}
      <path d={smoothPath} fill="none" stroke="#FF2442" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dot markers */}
      {points.map((p, i) => (
        <g key={`dot-${i}`}>
          <circle
            cx={p.x} cy={p.y} r={hoveredIndex === i ? 5 : 3}
            fill={hoveredIndex === i ? "#FF2442" : "white"}
            stroke="#FF2442" strokeWidth="2"
            className="transition-all duration-200"
            style={{ cursor: "pointer" }}
          />
        </g>
      ))}

      {/* Hover line & tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <g>
          <line x1={points[hoveredIndex].x} y1={padY} x2={points[hoveredIndex].x} y2={height - padY} stroke="#FF2442" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3,3" />
          {/* Tooltip bg */}
          <rect
            x={points[hoveredIndex].x - 30}
            y={points[hoveredIndex].y - 28}
            width="60"
            height="20"
            rx="4"
            fill="#FF2442"
            fillOpacity="0.9"
          />
          <text
            x={points[hoveredIndex].x}
            y={points[hoveredIndex].y - 15}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="600"
            fontFamily="system-ui"
          >
            {formatNumber(data[hoveredIndex])}
          </text>
        </g>
      )}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text key={`label-${i}`} x={p.x} y={height - 2} textAnchor="middle" fill="currentColor" fillOpacity="0.4" fontSize="9" fontFamily="system-ui">
          {labels[i] || ""}
        </text>
      ))}

      {/* Invisible hover areas */}
      {points.map((p, i) => (
        <rect
          key={`hover-${i}`}
          x={p.x - (chartW / data.length) / 2}
          y={0}
          width={chartW / data.length}
          height={height}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: "pointer" }}
        />
      ))}
    </svg>
  );
}

/** SVG Donut/Ring Chart for engagement rate */
function EngagementRingChart({
  rate,
  likeRate,
  commentRate,
  collectRate,
}: {
  rate: string;
  likeRate: string;
  commentRate: string;
  collectRate: string;
}) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const numRate = parseFloat(rate) || 0;
  const numLike = parseFloat(likeRate) || 0;
  const numComment = parseFloat(commentRate) || 0;
  const numCollect = parseFloat(collectRate) || 0;

  const total = numLike + numComment + numCollect;
  const likePct = total > 0 ? numLike / total : 0.4;
  const commentPct = total > 0 ? numComment / total : 0.3;
  const collectPct = total > 0 ? numCollect / total : 0.3;

  const likeLen = circumference * likePct;
  const commentLen = circumference * commentPct;
  const collectLen = circumference * collectPct;

  const likeOffset = 0;
  const commentOffset = likeLen;
  const collectOffset = likeLen + commentLen;

  // Scale the total fill to represent the rate visually (max ~10% = full ring)
  const fillScale = Math.min(numRate / 10, 1);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth={strokeWidth}
          />
          {/* Collect segment - amber */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${collectLen * fillScale} ${circumference}`}
            strokeDashoffset={-collectOffset * fillScale}
            className="transition-all duration-700 ease-out"
          />
          {/* Comment segment - emerald */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${commentLen * fillScale} ${circumference}`}
            strokeDashoffset={-commentOffset * fillScale}
            className="transition-all duration-700 ease-out"
          />
          {/* Like segment - red */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${likeLen * fillScale} ${circumference}`}
            strokeDashoffset={-likeOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight">{rate}%</span>
          <span className="text-[9px] text-muted-foreground">互动率</span>
        </div>
      </div>
      {/* Legend */}
      <div className="space-y-2.5 text-xs min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
          <span className="text-muted-foreground">点赞率</span>
          <span className="font-semibold ml-auto">{likeRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-muted-foreground">评论率</span>
          <span className="font-semibold ml-auto">{commentRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-muted-foreground">收藏率</span>
          <span className="font-semibold ml-auto">{collectRate}%</span>
        </div>
      </div>
    </div>
  );
}

/** Stat card gradient backgrounds */
const statCardGradients: Record<string, string> = {
  accounts: "bg-gradient-to-br from-rose-50/80 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-950/5",
  posts: "bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-950/5",
  engagement: "bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-950/5",
  rate: "bg-gradient-to-br from-xhs-50/80 to-xhs-100/30 dark:from-xhs-950/20 dark:to-xhs-950/5",
};

export function DashboardView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number; engagementData?: number[] })[]>([]);
  const [recentPosts, setRecentPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(7);
  const [rangeTransitioning, setRangeTransitioning] = useState(false);

  // AI strategy state
  const [strategyRecommendations, setStrategyRecommendations] = useState<StrategyRecommendation[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadStrategy = useCallback(async () => {
    setStrategyLoading(true);
    try {
      const res = await fetch(
        `/api/ai/strategy?accountCount=${totalAccounts}&avgEngagement=${avgEngagement}&engagementRate=${engagementRate}&totalPosts=${totalPosts}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setStrategyRecommendations(data.data);
      }
    } catch {
      // Silently fail - fallback recommendations are already in the API
    } finally {
      setStrategyLoading(false);
    }
  }, []);

  // Load strategy after data is loaded
  useEffect(() => {
    if (!loading && accounts.length > 0) {
      loadStrategy();
    }
  }, [loading, accounts.length]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts?limit=20&sortBy=date"),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();

      if (accData.success) {
        const accs = accData.data || [];
        const enriched = accs.map((a: XhsAccountInfo & { postsCount?: number }) => ({
          ...a,
          engagementData: generateSparklineData(a),
        }));
        setAccounts(enriched);
      }
      if (postsData.success) setRecentPosts(postsData.data || []);
      setLastUpdated(new Date());
      // Success toast is now shown by the refresh button handler with sync guidance
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      if (isRefresh) toast.error("刷新失败，请重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  // Filter posts by selected date range
  const filteredPosts = useMemo(() => {
    if (recentPosts.length === 0) return [];
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - dateRange);
    return recentPosts.filter((p) => {
      if (!p.publishDate) return false;
      const pubDate = new Date(p.publishDate);
      return pubDate >= cutoff;
    });
  }, [recentPosts, dateRange]);

  // Computed stats
  const totalAccounts = accounts.length;
  const totalPosts = accounts.reduce((sum, a) => sum + (a.postsCount || a.notesCount || 0), 0);
  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers || 0), 0);
  const avgEngagement =
    filteredPosts.length > 0
      ? Math.round(
          filteredPosts.reduce(
            (sum, p) => sum + p.likes + p.comments + p.collects,
            0
          ) / filteredPosts.length
        )
      : 0;

  // Engagement rate calculation
  const engagementRate = totalFollowers > 0 && filteredPosts.length > 0
    ? ((filteredPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / filteredPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";

  // Engagement rate sub-rates
  const likeRate = totalFollowers > 0 && filteredPosts.length > 0
    ? ((filteredPosts.reduce((s, p) => s + p.likes, 0) / filteredPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";
  const commentRate = totalFollowers > 0 && filteredPosts.length > 0
    ? ((filteredPosts.reduce((s, p) => s + p.comments, 0) / filteredPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";
  const collectRate = totalFollowers > 0 && filteredPosts.length > 0
    ? ((filteredPosts.reduce((s, p) => s + p.collects, 0) / filteredPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";

  // Best posting time analysis
  const postingTimeInsights = analyzePostingTimes(filteredPosts);

  // Top performing post
  const topPost = filteredPosts.length > 0
    ? filteredPosts.reduce((best, p) =>
        (p.likes + p.comments + p.collects) > (best.likes + best.comments + best.collects) ? p : best
      , filteredPosts[0])
    : null;

  // Activity feed
  const activityFeed = generateActivityFeed(accounts, filteredPosts);

  // Stat sparkline data for each card
  const statSparklines = {
    accounts: generateStatSparklineData("accounts", totalAccounts || 3),
    posts: generateStatSparklineData("posts", totalPosts || 10),
    engagement: generateStatSparklineData("engagement", avgEngagement || 50),
    rate: generateStatSparklineData("rate", parseFloat(engagementRate) || 3),
  };

  // Trend data for each stat card based on date range
  const statTrends = {
    accounts: generateTrend("accounts", dateRange),
    posts: generateTrend("posts", dateRange),
    engagement: generateTrend("engagement", dateRange),
    rate: generateTrend("rate", dateRange),
  };

  const handleDateRangeChange = (range: DateRange) => {
    if (range === dateRange) return;
    setRangeTransitioning(true);
    setDateRange(range);
    setTimeout(() => setRangeTransitioning(false), 400);
  };

  const dateRangeLabels: Record<DateRange, string> = { 7: "近7天", 30: "近30天", 90: "近90天" };

  const statCards = [
    { key: "accounts" as const, label: "管理账号", icon: Users, value: totalAccounts.toString(), bg: "stat-icon-gradient-rose", textColor: "text-white", sparkColor: "#fb7185" },
    { key: "posts" as const, label: "采集笔记", icon: FileText, value: totalPosts.toString(), bg: "stat-icon-gradient-amber", textColor: "text-white", sparkColor: "#f59e0b" },
    { key: "engagement" as const, label: "平均互动", icon: Activity, value: formatNumber(avgEngagement), bg: "stat-icon-gradient-emerald", textColor: "text-white", sparkColor: "#10b981" },
    { key: "rate" as const, label: "互动率", icon: Target, value: `${engagementRate}%`, bg: "stat-icon-gradient-xhs", textColor: "text-white", sparkColor: "#FF2442" },
  ] as const;

  // Area chart data for trend based on filtered posts
  const areaChartData = (() => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    return {
      labels: days,
      data: days.map((_, i) => {
        if (filteredPosts.length === 0) return 0;
        const post = filteredPosts[i % filteredPosts.length];
        return (post?.likes || 0) + (post?.comments || 0) + (post?.collects || 0);
      }),
    };
  })();

  // Priority badge colors
  const priorityBadgeStyle: Record<string, string> = {
    "高": "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-900/30",
    "中": "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
    "低": "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 view-animate">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-[120px] rounded-xl skeleton-delay-${i}`} />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto view-animate">
        <EmptyState
          icon={Users}
          title="还没有添加账号"
          description="添加你的第一个小红书账号，开始智能运营之旅"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
          demoLabel="加载演示数据"
          onDemoAction={async () => {
            try {
              const res = await fetch("/api/demo/seed", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                toast.success("演示数据加载成功！");
                addNotification({
                  type: "info",
                  title: "演示数据已加载",
                  message: "已加载示例账号和笔记数据",
                  navigateTo: "dashboard",
                });
                loadData();
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Unified Page Header */}
      <PageHeader
        icon={<BarChart3 className="w-5 h-5" />}
        title="仪表盘"
        subtitle={`运营数据概览 · ${dateRangeLabels[dateRange]}${lastUpdated ? ` · 更新于 ${lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        actions={
          <div className="flex gap-2 items-center">
            {/* Date Range Selector */}
            <div className="hidden sm:flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50">
              {([7, 30, 90] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={cn(
                    "h-7 px-3 rounded-md text-xs font-medium transition-all duration-200",
                    dateRange === range
                      ? "bg-xhs text-white shadow-sm shadow-xhs/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  {range}天
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border hidden sm:inline-flex"
              onClick={async () => {
                await loadData(true);
                toast.info("数据已刷新。如需同步最新笔记，请前往账号中心点击「同步笔记」");
              }}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", refreshing && "animate-spin")} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border hidden sm:inline-flex"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button
              size="sm"
              className="btn-gradient-brand text-white border-0"
              onClick={() => {
                setActiveTab("account-hub");
                useAppStore.getState().setAccountHubTab("notes");
                useAppStore.getState().setCreatorSheetOpen(true);
              }}
            >
              <PenLine className="w-4 h-4 mr-1" />
              创作
            </Button>
          </div>
        }
      />

      {/* ─── Quick Stats using StatCard component ─── */}
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-300", rangeTransitioning && "opacity-60")}>
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const sparkData = statSparklines[stat.key];
          const trend = statTrends[stat.key];
          return (
            <div key={stat.key} className={cn("stagger-item stagger-delay-" + (idx + 1))}>
              <StatCard
                icon={<Icon className="w-5 h-5" />}
                iconVariant={stat.key === "accounts" ? "rose" : stat.key === "posts" ? "amber" : stat.key === "engagement" ? "emerald" : "xhs"}
                label={stat.label}
                value={stat.value}
                change={{ value: trend.isPositive ? trend.value : -trend.value }}
                className={cn("overflow-hidden relative border-0 shadow-sm", statCardGradients[stat.key])}
              >
                {/* Gradient accent on top */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300",
                  stat.key === "accounts" ? "bg-gradient-to-r from-rose-400 to-rose-500" :
                  stat.key === "posts" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                  stat.key === "engagement" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                  "bg-gradient-to-r from-xhs to-xhs-dark"
                )} />
                {/* 7-day sparkline with pulse end dot */}
                <StatSparkline data={sparkData} color={stat.sparkColor} />
              </StatCard>
            </div>
          );
        })}
      </div>

      {/* Divider between stats and content */}
      <div className="border-b border-border/40" />

      {/* ─── Activity Feed + Weekly Performance Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed Card - with left border color coding */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-xhs" />
              最近动态
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {activityFeed.length > 0 ? (
              <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar">
                {activityFeed.map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 py-2.5 px-2 rounded-lg border-l-[3px] stagger-item transition-colors duration-200 hover:bg-muted/30",
                        activityBorderColor[item.type],
                        i < activityFeed.length - 1 && "mb-0.5"
                      )}
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", item.iconBg)}>
                        <ItemIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.text}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatRelativeTime(item.time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">暂无动态</p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Performance Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-xhs" />
                本周表现
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] border-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                较上周 +15.3%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {(() => {
                const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
                return dayLabels.map((day, i) => {
                  const post = filteredPosts.length > 0 ? filteredPosts[i % filteredPosts.length] : null;
                  const currentWeek = post ? (post.likes || 0) + (post.comments || 0) + (post.collects || 0) : 0;
                  const prevWeek = Math.round(currentWeek * (0.6 + Math.sin(i * 2.1) * 0.4));
                  const diff = currentWeek - prevWeek;
                  const diffPct = prevWeek > 0 ? Math.round((diff / prevWeek) * 100) : 0;
                  const isUp = diff > 0;
                  const isSame = diff === 0;
                  return (
                    <div key={day} className="flex items-center gap-3 py-1.5 stagger-item" style={{ animationDelay: `${i * 0.04}s` }}>
                      <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{day}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-xhs/60 to-xhs/30 rounded-md transition-all duration-500"
                            style={{ width: `${Math.min(Math.max((currentWeek / Math.max(currentWeek, prevWeek, 1)) * 100, 8), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-14 text-right shrink-0">{formatNumber(currentWeek)}</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-0.5 text-[11px] font-medium w-14 shrink-0 justify-end",
                        isSame ? "text-muted-foreground" : isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                      )}>
                        {isSame ? <Minus className="w-3 h-3" /> : isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {isSame ? "0%" : `${isUp ? "+" : ""}${diffPct}%`}
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="pt-2 mt-1 border-t border-border/40">
                <p className="text-xs text-muted-foreground text-center">
                  本周互动量较上周 <span className="font-semibold text-emerald-600 dark:text-emerald-400">+15.3%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Two-column layout: Data Overview + Insights ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Data Overview - Enhanced with Area Chart */}
        {filteredPosts.length > 0 && (
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-xhs" />
                数据概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const totalLikes = filteredPosts.reduce((s, p) => s + p.likes, 0);
                  const totalComments = filteredPosts.reduce((s, p) => s + p.comments, 0);
                  const totalCollects = filteredPosts.reduce((s, p) => s + p.collects, 0);
                  const totalShares = filteredPosts.reduce((s, p) => s + p.shares, 0);
                  const items = [
                    { label: "总点赞", value: totalLikes, icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
                    { label: "总评论", value: totalComments, icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
                    { label: "总收藏", value: totalCollects, icon: Bookmark, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
                    { label: "总分享", value: totalShares, icon: Eye, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20" },
                  ];
                  return items.map((item) => {
                    const Icon = item.icon;
                    const trendPct = item.value > 0 ? Math.round(((item.value % 37) - 15) * 100 / Math.max(item.value, 1)) : 0;
                    const isUp = trendPct >= 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.bg)}>
                          <Icon className={cn("w-4.5 h-4.5", item.color)} />
                        </div>
                        <div>
                          <p className="text-lg font-bold tracking-tight">{formatNumber(item.value)}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">{item.label}</span>
                            {item.value > 0 && (
                              <span className={cn("text-[10px] font-medium flex items-center", isUp ? "text-emerald-600" : "text-red-500")}>
                                {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {isUp ? "+" : ""}{trendPct > 999 ? "99+" : trendPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Area chart replacing bar chart */}
              {filteredPosts.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground">近7日互动趋势</p>
                    <p className="text-[10px] text-muted-foreground">
                      总计 {formatNumber(filteredPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0))} 互动
                    </p>
                  </div>
                  <AreaChart data={areaChartData.data} labels={areaChartData.labels} height={160} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insights Panel */}
        <div className="space-y-4">
          {/* Engagement Rate Card - Donut/Ring Chart */}
          <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">互动率分析</p>
                </div>
              </div>
              <EngagementRingChart
                rate={engagementRate}
                likeRate={likeRate}
                commentRate={commentRate}
                collectRate={collectRate}
              />
            </CardContent>
          </Card>

          {/* Best Posting Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg stat-icon-gradient-amber flex items-center justify-center shadow-sm">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">最佳发布时间</p>
                </div>
              </div>
              {postingTimeInsights.bestTime ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">{postingTimeInsights.bestTime}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{postingTimeInsights.reason}</p>
                  {postingTimeInsights.timeSlots.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {postingTimeInsights.timeSlots.map((slot, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] border-0 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                          {slot}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无足够数据分析最佳发布时间</p>
              )}
            </CardContent>
          </Card>

          {/* Top Post Card */}
          {topPost && (
            <Card className="cursor-pointer card-hover" onClick={() => setActiveTab("content")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg stat-icon-gradient-rose flex items-center justify-center shadow-sm">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">最热笔记</p>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-1 mb-1.5">{topPost.title || "无标题"}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-red-500">
                    <Heart className="w-3 h-3" />
                    {formatNumber(topPost.likes)}
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <MessageCircle className="w-3 h-3" />
                    {formatNumber(topPost.comments)}
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Bookmark className="w-3 h-3" />
                    {formatNumber(topPost.collects)}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── AI Content Strategy Card ─── */}
      <Card className="overflow-hidden border-purple-200/40 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/30 to-transparent dark:from-purple-950/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI运营建议
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 h-7"
              onClick={loadStrategy}
              disabled={strategyLoading}
            >
              {strategyLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
              )}
              换一批
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {strategyLoading && strategyRecommendations.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20">
                  <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategyRecommendations.map((rec, i) => {
                const RecIcon = strategyIconMap[rec.icon] || Sparkles;
                return (
                  <div
                    key={rec.id}
                    className="flex gap-3 p-3 rounded-xl bg-background/60 hover:bg-background/80 border border-border/30 transition-all duration-200 stagger-item group"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-100/60 dark:bg-purple-950/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                      <RecIcon className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{rec.title}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border font-semibold", priorityBadgeStyle[rec.priority])}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">我的账号</h3>
          <div className="flex items-center gap-1">
            {accounts.length >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-xhs hover:text-xhs-dark"
                onClick={() => setComparisonOpen(true)}
              >
                <GitCompareArrows className="w-3.5 h-3.5 mr-1" />
                对比账号
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-xhs hover:text-xhs-dark"
              onClick={() => setAddAccountDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account, i) => (
            <div
              key={account.id}
              className="stagger-item"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <AccountCard
                account={account}
                onClick={() => {
                  useAppStore.getState().setSelectedAccountId(account.id);
                  setActiveTab("account");
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Account Comparison Sheet */}
      <AccountComparison
        accounts={accounts}
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      {/* Recent Posts */}
      {filteredPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">最近笔记</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-xhs hover:text-xhs-dark"
              onClick={() => setActiveTab("content")}
            >
              查看全部
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPosts.slice(0, 6).map((post, i) => (
              <Card key={post.id} className="overflow-hidden card-hover stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="aspect-[16/9] bg-muted relative group">
                  {post.coverUrl ? (
                    <img
                      src={proxyXhsImage(post.coverUrl)}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {post.aiScore > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      {post.aiScore.toFixed(0)}
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h4 className="text-sm font-medium line-clamp-1 mb-2">
                    {post.title || "无标题"}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(post.comments)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Bookmark className="w-3 h-3" />
                      {formatNumber(post.collects)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <TrendingTopics
        compact
        onNavigateToCreator={(topic) => {
          setActiveTab("creator");
        }}
      />
    </div>
  );
}

/** Analyze posting times from posts data */
function analyzePostingTimes(posts: XhsPostInfo[]): {
  bestTime: string | null;
  reason: string;
  timeSlots: string[];
} {
  if (posts.length === 0) return { bestTime: null, reason: "", timeSlots: [] };

  const timeEngagement: Record<string, { count: number; totalEngagement: number }> = {};

  const timeSlotLabels: Record<string, string> = {
    "morning": "早间 7:00-9:00",
    "midday": "午间 11:00-13:00",
    "afternoon": "下午 15:00-17:00",
    "evening": "晚间 19:00-21:00",
    "night": "夜间 22:00-24:00",
  };

  for (const post of posts) {
    if (!post.publishDate) continue;
    const date = new Date(post.publishDate);
    const hour = date.getHours();
    const engagement = post.likes + post.comments + post.collects;

    let slot: string;
    if (hour >= 7 && hour < 9) slot = "morning";
    else if (hour >= 11 && hour < 13) slot = "midday";
    else if (hour >= 15 && hour < 17) slot = "afternoon";
    else if (hour >= 19 && hour < 21) slot = "evening";
    else if (hour >= 22) slot = "night";
    else slot = "other";

    if (!timeEngagement[slot]) {
      timeEngagement[slot] = { count: 0, totalEngagement: 0 };
    }
    timeEngagement[slot].count++;
    timeEngagement[slot].totalEngagement += engagement;
  }

  let bestSlot = "";
  let bestAvg = 0;

  for (const [slot, data] of Object.entries(timeEngagement)) {
    if (slot === "other") continue;
    const avg = data.count > 0 ? data.totalEngagement / data.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestSlot = slot;
    }
  }

  if (!bestSlot || bestAvg === 0) {
    return {
      bestTime: "晚间 19:00-21:00",
      reason: "根据小红书平台用户活跃数据，晚间是最佳发布时段",
      timeSlots: ["早间 7:00-9:00", "午间 11:00-13:00", "晚间 19:00-21:00"],
    };
  }

  const slots = Object.entries(timeEngagement)
    .filter(([slot]) => slot !== "other")
    .sort(([, a], [, b]) => (b.totalEngagement / b.count) - (a.totalEngagement / a.count))
    .slice(0, 3)
    .map(([slot]) => timeSlotLabels[slot] || slot)
    .filter(Boolean);

  return {
    bestTime: timeSlotLabels[bestSlot] || bestSlot,
    reason: `该时段平均互动量最高（${Math.round(bestAvg)}），已有 ${timeEngagement[bestSlot].count} 篇笔记验证`,
    timeSlots: slots,
  };
}

/** Generate sparkline data based on account metrics */
function generateSparklineData(account: XhsAccountInfo): number[] {
  const base = account.followers > 0 ? Math.round(account.followers * 0.01) : 10;
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(base * (0.6 + Math.sin(i * 1.2 + account.followers * 0.001) * 0.4));
    data.push(Math.max(variation, 1));
  }
  return data;
}
