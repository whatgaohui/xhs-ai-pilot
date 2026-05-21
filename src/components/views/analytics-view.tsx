"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/components/account-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { XhsPostInfo, XhsAccountInfo } from "@/types";
import {
  BarChart3,
  PieChart,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  RefreshCw,
  Lightbulb,
  Clock,
  Zap,
  TrendingUp,
  CalendarDays,
  Hash,
  ImageIcon,
  Video,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface TagStat {
  name: string;
  count: number;
  avgEngagement: number;
  percentage: number;
  color: string;
}

interface WeekdayStat {
  label: string;
  short: string;
  count: number;
  avgEngagement: number;
}

interface HourStat {
  hour: number;
  label: string;
  count: number;
  avgEngagement: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Consistent number formatting: 万 for >= 10000, k for >= 1000 */
function formatAnalyticsNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

const TAG_COLORS = [
  "#FF2442", "#f59e0b", "#10b981", "#ec4899",
  "#06b6d4", "#f97316", "#14b8a6", "#e11d48",
  "#84cc16", "#d946ef", "#0ea5e9", "#f43f5e",
];

const WEEKDAY_LABELS: WeekdayStat[] = [
  { label: "周一", short: "一", count: 0, avgEngagement: 0 },
  { label: "周二", short: "二", count: 0, avgEngagement: 0 },
  { label: "周三", short: "三", count: 0, avgEngagement: 0 },
  { label: "周四", short: "四", count: 0, avgEngagement: 0 },
  { label: "周五", short: "五", count: 0, avgEngagement: 0 },
  { label: "周六", short: "六", count: 0, avgEngagement: 0 },
  { label: "周日", short: "日", count: 0, avgEngagement: 0 },
];

// ─── Main Component ──────────────────────────────────────────────────────

export function AnalyticsView() {
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [accounts, setAccounts] = useState<XhsAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("engagement");
  const [tabAnimating, setTabAnimating] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts?limit=50&sortBy=engagement"),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();
      if (accData.success) setAccounts(accData.data || []);
      if (postsData.success) setPosts(postsData.data || []);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = useCallback((value: string) => {
    setTabAnimating(true);
    setActiveTab(value);
    setTimeout(() => setTabAnimating(false), 300);
  }, []);

  // ─── Computed Data ──────────────────────────────────────────────────

  const filteredPosts = useMemo(() => {
    if (selectedAccountId === "all") return posts;
    return posts.filter((p) => p.accountId === selectedAccountId);
  }, [posts, selectedAccountId]);

  // ─── Engagement Overview Data ───────────────────────────────────────

  const engagementTotals = useMemo(() => {
    const totalLikes = filteredPosts.reduce((s, p) => s + p.likes, 0);
    const totalComments = filteredPosts.reduce((s, p) => s + p.comments, 0);
    const totalCollects = filteredPosts.reduce((s, p) => s + p.collects, 0);
    const totalShares = filteredPosts.reduce((s, p) => s + p.shares, 0);
    const totalEngagement = totalLikes + totalComments + totalCollects + totalShares;
    const count = filteredPosts.length || 1;
    return {
      totalLikes,
      totalComments,
      totalCollects,
      totalShares,
      totalEngagement,
      avgLikes: Math.round(totalLikes / count),
      avgComments: Math.round(totalComments / count),
      avgCollects: Math.round(totalCollects / count),
      avgShares: Math.round(totalShares / count),
      avgEngagement: Math.round(totalEngagement / count),
    };
  }, [filteredPosts]);

  const topPosts = useMemo(() => {
    return [...filteredPosts]
      .sort((a, b) => {
        const engA = a.likes + a.comments + a.collects + a.shares;
        const engB = b.likes + b.comments + b.collects + b.shares;
        return engB - engA;
      })
      .slice(0, 5);
  }, [filteredPosts]);

  // ─── Content Distribution Data ─────────────────────────────────────

  const tagData = useMemo((): TagStat[] => {
    if (filteredPosts.length === 0) return [];

    const tagMap = new Map<string, { count: number; totalEng: number }>();
    for (const p of filteredPosts) {
      // Collect tags from the post's tags array
      const postTags = (p.tags && p.tags.length > 0) ? p.tags : [p.category || "未分类"];
      for (const tag of postTags) {
        const trimmed = tag.trim();
        if (!trimmed) continue;
        const existing = tagMap.get(trimmed) || { count: 0, totalEng: 0 };
        existing.count++;
        existing.totalEng += p.likes + p.comments + p.collects + p.shares;
        tagMap.set(trimmed, existing);
      }
    }

    // Calculate total tag occurrences for percentage
    const totalOccurrences = Array.from(tagMap.values()).reduce((s, v) => s + v.count, 0);

    return Array.from(tagMap.entries())
      .map(([name, data], i) => ({
        name,
        count: data.count,
        avgEngagement: data.count > 0 ? Math.round(data.totalEng / data.count) : 0,
        percentage: totalOccurrences > 0 ? Math.round((data.count / totalOccurrences) * 100) : 0,
        color: TAG_COLORS[i % TAG_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12); // Top 12 tags
  }, [filteredPosts]);

  const postTypeData = useMemo(() => {
    let normalCount = 0;
    let videoCount = 0;
    let normalEng = 0;
    let videoEng = 0;
    for (const p of filteredPosts) {
      if (p.postType === "video") {
        videoCount++;
        videoEng += p.likes + p.comments + p.collects + p.shares;
      } else {
        normalCount++;
        normalEng += p.likes + p.comments + p.collects + p.shares;
      }
    }
    return {
      normal: { count: normalCount, avgEng: normalCount > 0 ? Math.round(normalEng / normalCount) : 0 },
      video: { count: videoCount, avgEng: videoCount > 0 ? Math.round(videoEng / videoCount) : 0 },
    };
  }, [filteredPosts]);

  // ─── Posting Patterns Data ─────────────────────────────────────────

  const weekdayData = useMemo((): WeekdayStat[] => {
    const days = WEEKDAY_LABELS.map((d) => ({ ...d }));
    const engByDay: Record<number, { count: number; totalEng: number }> = {};

    for (const p of filteredPosts) {
      if (!p.publishDate) continue;
      try {
        const date = new Date(p.publishDate);
        if (isNaN(date.getTime())) continue;
        const dayIdx = (date.getDay() + 6) % 7; // Monday = 0
        if (!engByDay[dayIdx]) engByDay[dayIdx] = { count: 0, totalEng: 0 };
        engByDay[dayIdx].count++;
        engByDay[dayIdx].totalEng += p.likes + p.comments + p.collects + p.shares;
      } catch {
        // skip invalid dates
      }
    }

    for (let i = 0; i < 7; i++) {
      const d = engByDay[i];
      if (d) {
        days[i].count = d.count;
        days[i].avgEngagement = d.count > 0 ? Math.round(d.totalEng / d.count) : 0;
      }
    }

    return days;
  }, [filteredPosts]);

  const hourData = useMemo((): HourStat[] => {
    const hours: HourStat[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, "0")}:00`,
      count: 0,
      avgEngagement: 0,
    }));

    const engByHour: Record<number, { count: number; totalEng: number }> = {};

    for (const p of filteredPosts) {
      if (!p.publishDate) continue;
      try {
        const date = new Date(p.publishDate);
        if (isNaN(date.getTime())) continue;
        const h = date.getHours();
        if (!engByHour[h]) engByHour[h] = { count: 0, totalEng: 0 };
        engByHour[h].count++;
        engByHour[h].totalEng += p.likes + p.comments + p.collects + p.shares;
      } catch {
        // skip invalid dates
      }
    }

    for (let i = 0; i < 24; i++) {
      const d = engByHour[i];
      if (d) {
        hours[i].count = d.count;
        hours[i].avgEngagement = d.count > 0 ? Math.round(d.totalEng / d.count) : 0;
      }
    }

    return hours;
  }, [filteredPosts]);

  const postsWithDates = useMemo(() => {
    return filteredPosts.filter((p) => {
      if (!p.publishDate) return false;
      const d = new Date(p.publishDate);
      return !isNaN(d.getTime());
    });
  }, [filteredPosts]);

  const dateRangeText = useMemo(() => {
    if (postsWithDates.length === 0) return "暂无发布时间数据";
    const dates = postsWithDates.map((p) => new Date(p.publishDate!).getTime()).sort((a, b) => a - b);
    const earliest = new Date(dates[0]);
    const latest = new Date(dates[dates.length - 1]);
    const fmt = (d: Date) => `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
    return `${fmt(earliest)} — ${fmt(latest)}`;
  }, [postsWithDates]);

  // ─── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 view-animate">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={`h-9 w-24 skeleton-delay-${i}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-48 rounded-xl skeleton-delay-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────

  const isEmpty = filteredPosts.length === 0;

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
        {/* Unified Page Header */}
        <PageHeader
          icon={<BarChart3 className="w-5 h-5" />}
          title="数据洞察"
          subtitle={`深度分析运营数据${selectedAccountId !== "all" ? ` · ${accounts.find(a => a.id === selectedAccountId)?.nickname || ""}` : ""}，发现增长机会`}
          actions={
            <div className="flex items-center gap-2">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="选择账号" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部账号</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.nickname || "未命名"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={loadData}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="engagement" className="text-xs sm:text-sm gap-1">
              <Zap className="w-3.5 h-3.5 hidden sm:inline-block" />
              互动概览
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs sm:text-sm gap-1">
              <PieChart className="w-3.5 h-3.5 hidden sm:inline-block" />
              内容分布
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs sm:text-sm gap-1">
              <Clock className="w-3.5 h-3.5 hidden sm:inline-block" />
              发布规律
            </TabsTrigger>
          </TabsList>

          {/* Empty state for selected account with no posts */}
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">该账号暂无笔记数据</p>
              <p className="text-xs text-muted-foreground/60 mt-1">选择其他账号或查看全部账号数据</p>
            </div>
          ) : (
          <>
          {/* ─── Tab 1: 互动概览 ──────────────────────────────────────── */}
          <TabsContent value="engagement" className="space-y-5 mt-4">
            {/* Total Engagement Summary Banner */}
            <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">互动总览</p>
                    <p className="text-xs text-muted-foreground">
                      共 {filteredPosts.length} 篇笔记，总计 {formatAnalyticsNumber(engagementTotals.totalEngagement)} 次互动
                    </p>
                  </div>
                </div>
                {/* 4 metric cards in grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "点赞", value: engagementTotals.totalLikes, avg: engagementTotals.avgLikes, icon: Heart, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20", iconBg: "bg-rose-500" },
                    { label: "评论", value: engagementTotals.totalComments, avg: engagementTotals.avgComments, icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", iconBg: "bg-emerald-500" },
                    { label: "收藏", value: engagementTotals.totalCollects, avg: engagementTotals.avgCollects, icon: Bookmark, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", iconBg: "bg-amber-500" },
                    { label: "分享", value: engagementTotals.totalShares, avg: engagementTotals.avgShares, icon: Share2, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/20", iconBg: "bg-teal-500" },
                  ].map((metric) => (
                    <div key={metric.label} className={cn("rounded-xl p-3 border border-border/30", metric.bg)}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", metric.iconBg)}>
                          <metric.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                      </div>
                      <p className={cn("text-xl font-bold tracking-tight", metric.color)}>
                        {formatAnalyticsNumber(metric.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        篇均 {formatAnalyticsNumber(metric.avg)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Composition Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-xhs" />
                  互动构成
                </CardTitle>
                <CardDescription className="text-xs">
                  各类互动在总互动中的占比分布
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementCompositionChart totals={engagementTotals} />
              </CardContent>
            </Card>

            {/* Top Performing Posts */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  互动排行
                </CardTitle>
                <CardDescription className="text-xs">
                  互动量最高的 5 篇笔记
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {topPosts.map((post, i) => {
                    const totalEng = post.likes + post.comments + post.collects + post.shares;
                    return (
                      <div
                        key={post.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200"
                      >
                        <span className={cn(
                          "text-xs font-bold w-5 shrink-0 text-center",
                          i === 0 ? "text-xhs" : i === 1 ? "text-amber-500" : i === 2 ? "text-orange-500" : "text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{post.title || "无标题"}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-rose-500">
                              <Heart className="w-3 h-3" />{formatNumber(post.likes)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                              <MessageCircle className="w-3 h-3" />{formatNumber(post.comments)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-amber-500">
                              <Bookmark className="w-3 h-3" />{formatNumber(post.collects)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-teal-500">
                              <Share2 className="w-3 h-3" />{formatNumber(post.shares)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-xhs tabular-nums">{formatAnalyticsNumber(totalEng)}</p>
                          <p className="text-[10px] text-muted-foreground">总互动</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Insights */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  互动洞察
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const { totalLikes, totalComments, totalCollects, totalShares, totalEngagement, avgEngagement } = engagementTotals;
                    const likeRate = totalEngagement > 0 ? ((totalLikes / totalEngagement) * 100).toFixed(1) : "0";
                    const collectRate = totalEngagement > 0 ? ((totalCollects / totalEngagement) * 100).toFixed(1) : "0";
                    const commentRate = totalEngagement > 0 ? ((totalComments / totalEngagement) * 100).toFixed(1) : "0";
                    const shareRate = totalEngagement > 0 ? ((totalShares / totalEngagement) * 100).toFixed(1) : "0";

                    const insights: { text: string; type: "positive" | "negative" | "neutral" }[] = [];

                    // Like ratio insight
                    insights.push({
                      text: `点赞占总互动的 ${likeRate}%，${parseFloat(likeRate) > 60 ? "互动以点赞为主，建议提升内容深度以增加收藏和评论" : "互动类型分布较均衡"}`,
                      type: parseFloat(likeRate) > 60 ? "neutral" : "positive",
                    });

                    // Collect ratio insight
                    if (parseFloat(collectRate) > 30) {
                      insights.push({
                        text: `收藏占比 ${collectRate}% 较高，说明内容实用性强，读者愿意留存后续查看`,
                        type: "positive",
                      });
                    }

                    // Comment ratio insight
                    if (parseFloat(commentRate) > 20) {
                      insights.push({
                        text: `评论占比 ${commentRate}%，互动氛围良好，建议继续积极回复评论保持活跃度`,
                        type: "positive",
                      });
                    } else {
                      insights.push({
                        text: `评论占比 ${commentRate}%，可在内容末尾增加互动引导语提升评论率`,
                        type: "neutral",
                      });
                    }

                    // Share ratio insight
                    if (parseFloat(shareRate) > 10) {
                      insights.push({
                        text: `分享占比 ${shareRate}%，内容传播力较强，适合增加实用型内容促进分享`,
                        type: "positive",
                      });
                    } else {
                      insights.push({
                        text: `分享占比 ${shareRate}%，可增加实用型、干货型内容提升分享率`,
                        type: "neutral",
                      });
                    }

                    return insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                          insight.type === "positive" && "bg-emerald-500",
                          insight.type === "negative" && "bg-red-500",
                          insight.type === "neutral" && "bg-amber-500",
                        )} />
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 2: 内容分布 ──────────────────────────────────────── */}
          <TabsContent value="distribution" className="space-y-5 mt-4">
            <div className={cn(
              "grid grid-cols-1 lg:grid-cols-5 gap-4 transition-all duration-300",
              tabAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}>
              {/* Donut Chart */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-xhs" />
                    标签占比
                  </CardTitle>
                  <CardDescription className="text-xs">
                    基于笔记标签的内容分布
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TagDonutChart data={tagData} />
                </CardContent>
              </Card>

              {/* Tag Ranked List */}
              <Card className="lg:col-span-3 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-xhs" />
                    标签详情
                  </CardTitle>
                  <CardDescription className="text-xs">
                    按出现频次排序，含平均互动数据
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tagData.length === 0 ? (
                    <div className="py-8 text-center">
                      <Hash className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">暂无标签数据</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {tagData.map((tag, i) => {
                        const maxCount = Math.max(...tagData.map(t => t.count));
                        const barPct = maxCount > 0 ? (tag.count / maxCount) * 100 : 0;
                        return (
                          <div
                            key={tag.name}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 group"
                          >
                            <span className={cn(
                              "text-xs font-bold w-5 shrink-0 text-center",
                              i === 0 ? "text-xhs" : i === 1 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {i + 1}
                            </span>
                            <div
                              className="w-3 h-3 rounded shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium truncate">#{tag.name}</p>
                                <Badge variant="secondary" className="text-[10px] border-0 h-5 px-1.5 shrink-0 ml-2">
                                  {tag.percentage}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${barPct}%`,
                                      backgroundColor: tag.color,
                                      opacity: 0.7,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                  {tag.count}次 · 均{formatAnalyticsNumber(tag.avgEngagement)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Post Type Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-xhs" />
                  笔记类型对比
                </CardTitle>
                <CardDescription className="text-xs">
                  图文笔记与视频笔记的数量及互动对比
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PostTypeComparison normalData={postTypeData.normal} videoData={postTypeData.video} />
              </CardContent>
            </Card>

            {/* Content Tips */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  内容优化建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tagData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无足够标签数据生成建议</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const tips: { tag: string; color: string; text: string }[] = [];
                      const topByCount = tagData[0];
                      const topByEng = [...tagData].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

                      if (topByCount) {
                        tips.push({
                          tag: topByCount.name,
                          color: topByCount.color,
                          text: `#{topByCount.name} 使用频次最高（${topByCount.count}次），是核心内容方向，建议持续深耕`,
                        });
                      }
                      if (topByEng && topByEng.name !== topByCount?.name) {
                        tips.push({
                          tag: topByEng.name,
                          color: topByEng.color,
                          text: `#${topByEng.name} 平均互动最高（${formatAnalyticsNumber(topByEng.avgEngagement)}），可增加此类内容产出`,
                        });
                      }
                      if (postTypeData.video.count > 0 && postTypeData.normal.count > 0) {
                        const betterType = postTypeData.video.avgEng > postTypeData.normal.avgEng ? "视频" : "图文";
                        tips.push({
                          tag: betterType,
                          color: "#10b981",
                          text: `${betterType}笔记平均互动更高，可适当增加${betterType}内容比例`,
                        });
                      } else if (tagData.length >= 2) {
                        const second = tagData[1];
                        tips.push({
                          tag: second.name,
                          color: second.color,
                          text: `#${second.name} 有 ${second.count} 次出现，可尝试结合热门话题提升曝光`,
                        });
                      }

                      return tips.map((tip, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-muted/30 to-transparent"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: tip.color }}
                            />
                            <span className="text-xs font-medium">#{tip.tag}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 3: 发布规律 ──────────────────────────────────────── */}
          <TabsContent value="patterns" className="space-y-5 mt-4">
            {/* Date range banner */}
            <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">发布周期</p>
                    <p className="text-xs text-muted-foreground">{dateRangeText}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const totalPosts = filteredPosts.length;
                    const datedCount = postsWithDates.length;
                    const avgPerWeek = datedCount > 0 ? (() => {
                      const dates = postsWithDates.map(p => new Date(p.publishDate!).getTime()).sort((a, b) => a - b);
                      if (dates.length < 2) return datedCount;
                      const weeksDiff = (dates[dates.length - 1] - dates[0]) / (7 * 24 * 60 * 60 * 1000);
                      return weeksDiff > 0 ? (datedCount / weeksDiff).toFixed(1) : datedCount;
                    })() : "0";
                    return [
                      { label: "笔记总数", value: `${totalPosts}篇`, color: "text-xhs" },
                      { label: "含发布日期", value: `${datedCount}篇`, color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "周均发布", value: `${avgPerWeek}篇`, color: "text-amber-600 dark:text-amber-400" },
                    ];
                  })().map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekday Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-xhs" />
                  按星期分布
                </CardTitle>
                <CardDescription className="text-xs">
                  各星期发布数量及平均互动表现
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayBarChart data={weekdayData} />
              </CardContent>
            </Card>

            {/* Hour Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  发布时段
                </CardTitle>
                <CardDescription className="text-xs">
                  24小时发布频率与互动效果对比
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HourDistributionChart data={hourData} />
              </CardContent>
            </Card>

            {/* Best Posting Times */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  高效时段
                </CardTitle>
                <CardDescription className="text-xs">
                  按平均互动排序的发布时段
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sortedByEng = hourData
                    .filter(h => h.count > 0)
                    .sort((a, b) => b.avgEngagement - a.avgEngagement)
                    .slice(0, 5);

                  if (sortedByEng.length === 0) {
                    return (
                      <div className="py-6 text-center">
                        <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">暂无含发布时间的数据</p>
                      </div>
                    );
                  }

                  const maxAvgEng = Math.max(...sortedByEng.map(h => h.avgEngagement));

                  return (
                    <div className="space-y-3">
                      {sortedByEng.map((h, i) => (
                        <div key={h.hour} className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs font-bold w-5 shrink-0 text-center",
                            i === 0 ? "text-xhs" : i === 1 ? "text-amber-500" : "text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium w-16 shrink-0 tabular-nums">{h.label}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                i === 0 ? "bg-gradient-to-r from-xhs to-rose-400" : "bg-gradient-to-r from-xhs/50 to-rose-300"
                              )}
                              style={{ width: `${maxAvgEng > 0 ? (h.avgEngagement / maxAvgEng) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="shrink-0 text-right w-28">
                            <span className="text-xs font-bold text-xhs tabular-nums">{formatAnalyticsNumber(h.avgEngagement)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">均互动</span>
                            <span className="text-[10px] text-muted-foreground ml-1">· {h.count}篇</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Posting Insights */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  发布建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const insights: { text: string; type: "positive" | "negative" | "neutral" }[] = [];

                    // Best weekday insight
                    const bestWeekday = [...weekdayData].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
                    const mostPostWeekday = [...weekdayData].sort((a, b) => b.count - a.count)[0];
                    if (bestWeekday && bestWeekday.count > 0) {
                      if (bestWeekday.label === mostPostWeekday.label) {
                        insights.push({
                          text: `${bestWeekday.label}发布最多且互动最高，是最佳发布日`,
                          type: "positive",
                        });
                      } else {
                        insights.push({
                          text: `${mostPostWeekday.label}发布最多，但${bestWeekday.label}平均互动最高，可考虑调整发布节奏`,
                          type: "neutral",
                        });
                      }
                    }

                    // Best hour insight
                    const hoursWithPosts = hourData.filter(h => h.count > 0);
                    if (hoursWithPosts.length > 0) {
                      const bestHour = [...hoursWithPosts].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
                      insights.push({
                        text: `${bestHour.label}发布的笔记平均互动最高（${formatAnalyticsNumber(bestHour.avgEngagement)}），建议优先选择此时段`,
                        type: "positive",
                      });
                    }

                    // Weekend vs weekday
                    const weekdayPosts = weekdayData.slice(0, 5).reduce((s, d) => s + d.count, 0);
                    const weekendPosts = weekdayData.slice(5).reduce((s, d) => s + d.count, 0);
                    const weekdayEng = weekdayData.slice(0, 5).reduce((s, d) => s + d.avgEngagement * d.count, 0);
                    const weekendEng = weekdayData.slice(5).reduce((s, d) => s + d.avgEngagement * d.count, 0);
                    const weekdayAvg = weekdayPosts > 0 ? Math.round(weekdayEng / weekdayPosts) : 0;
                    const weekendAvg = weekendPosts > 0 ? Math.round(weekendEng / weekendPosts) : 0;

                    if (weekdayPosts > 0 && weekendPosts > 0) {
                      if (weekendAvg > weekdayAvg * 1.2) {
                        insights.push({
                          text: `周末发布的平均互动（${formatAnalyticsNumber(weekendAvg)}）高于工作日（${formatAnalyticsNumber(weekdayAvg)}），用户活跃度更高`,
                          type: "positive",
                        });
                      } else if (weekdayAvg > weekendAvg * 1.2) {
                        insights.push({
                          text: `工作日发布的平均互动（${formatAnalyticsNumber(weekdayAvg)}）高于周末（${formatAnalyticsNumber(weekendAvg)}），可集中工作日发布`,
                          type: "neutral",
                        });
                      } else {
                        insights.push({
                          text: "工作日与周末的互动表现相近，保持当前发布节奏即可",
                          type: "neutral",
                        });
                      }
                    }

                    if (insights.length === 0) {
                      insights.push({
                        text: "暂无足够发布时间数据生成建议，需更多含发布日期的笔记",
                        type: "neutral",
                      });
                    }

                    return insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                          insight.type === "positive" && "bg-emerald-500",
                          insight.type === "negative" && "bg-red-500",
                          insight.type === "neutral" && "bg-amber-500",
                        )} />
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </>
          )}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────

/** Horizontal bar chart showing engagement composition (likes, comments, collects, shares) */
function EngagementCompositionChart({ totals }: {
  totals: {
    totalLikes: number;
    totalComments: number;
    totalCollects: number;
    totalShares: number;
    totalEngagement: number;
  };
}) {
  const { totalLikes, totalComments, totalCollects, totalShares, totalEngagement } = totals;

  const metrics = [
    { label: "点赞", value: totalLikes, color: "#f43f5e", bgClass: "bg-rose-500" },
    { label: "评论", value: totalComments, color: "#10b981", bgClass: "bg-emerald-500" },
    { label: "收藏", value: totalCollects, color: "#f59e0b", bgClass: "bg-amber-500" },
    { label: "分享", value: totalShares, color: "#14b8a6", bgClass: "bg-teal-500" },
  ];

  const maxValue = Math.max(...metrics.map(m => m.value), 1);

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      {totalEngagement > 0 && (
        <div className="h-8 rounded-lg overflow-hidden flex">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={cn("h-full transition-all duration-700 flex items-center justify-center", m.bgClass)}
              style={{ width: `${(m.value / totalEngagement) * 100}%` }}
            >
              {(m.value / totalEngagement) * 100 > 8 && (
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {((m.value / totalEngagement) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail bars */}
      <div className="space-y-3">
        {metrics.map((m) => {
          const pct = totalEngagement > 0 ? ((m.value / totalEngagement) * 100).toFixed(1) : "0";
          const barPct = (m.value / maxValue) * 100;
          return (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-sm", m.bgClass)} />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{formatAnalyticsNumber(m.value)}</span>
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: m.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** SVG donut chart for tag distribution */
function TagDonutChart({ data }: { data: TagStat[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center">
        <PieChart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">暂无标签数据</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const strokeWidth = 28;

  // Calculate SVG arc segments using cumulative angles
  const cumulativeAngles = data.reduce<number[]>((acc, item, i) => {
    const pct = total > 0 ? item.count / total : 0;
    const prevAngle = i === 0 ? -90 : acc[i - 1];
    acc.push(prevAngle + pct * 360);
    return acc;
  }, []);

  const segments = data.map((item, i) => {
    const pct = total > 0 ? item.count / total : 0;
    const startAngle = i === 0 ? -90 : cumulativeAngles[i - 1];
    const endAngle = cumulativeAngles[i];
    const angle = pct * 360;

    // SVG arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const isHovered = hoveredIndex === i;

    return {
      ...item,
      pct,
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      isHovered,
      index: i,
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => (
          <g key={seg.name}>
            <path
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth={seg.isHovered ? strokeWidth + 6 : strokeWidth}
              strokeLinecap="butt"
              className="transition-all duration-200 cursor-pointer"
              opacity={seg.isHovered ? 1 : 0.8}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}
        {/* Center text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize="22"
          fontWeight="700"
        >
          {hoveredIndex !== null
            ? `${(segments[hoveredIndex].pct * 100).toFixed(0)}%`
            : data.length
          }
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="11"
        >
          {hoveredIndex !== null ? segments[hoveredIndex].name : "个标签"}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {data.slice(0, 6).map((item, i) => (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-default transition-colors",
                  hoveredIndex === i ? "bg-muted" : "hover:bg-muted/50"
                )}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[60px]">{item.name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>#{item.name}：{item.count}次，篇均互动 {formatAnalyticsNumber(item.avgEngagement)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

/** Post type comparison card: normal vs video */
function PostTypeComparison({
  normalData,
  videoData,
}: {
  normalData: { count: number; avgEng: number };
  videoData: { count: number; avgEng: number };
}) {
  const total = normalData.count + videoData.count;
  const normalPct = total > 0 ? (normalData.count / total) * 100 : 50;
  const videoPct = total > 0 ? (videoData.count / total) * 100 : 50;
  const engDiff = normalData.avgEng > 0 && videoData.avgEng > 0
    ? ((videoData.avgEng - normalData.avgEng) / normalData.avgEng * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Ratio bar */}
      <div className="h-6 rounded-lg overflow-hidden flex">
        <div
          className="h-full bg-gradient-to-r from-xhs to-rose-400 flex items-center justify-center transition-all duration-500"
          style={{ width: `${normalPct}%` }}
        >
          {normalPct > 15 && (
            <span className="text-[10px] font-bold text-white drop-shadow-sm">{normalPct.toFixed(0)}%</span>
          )}
        </div>
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 flex items-center justify-center transition-all duration-500"
          style={{ width: `${videoPct}%` }}
        >
          {videoPct > 15 && (
            <span className="text-[10px] font-bold text-white drop-shadow-sm">{videoPct.toFixed(0)}%</span>
          )}
        </div>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Normal (图文) */}
        <div className="p-3 rounded-lg border border-border/30 bg-rose-50/50 dark:bg-rose-950/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-xhs flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold">图文笔记</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">数量</span>
              <span className="text-xs font-bold tabular-nums">{normalData.count}篇</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">篇均互动</span>
              <span className="text-xs font-bold tabular-nums text-xhs">{formatAnalyticsNumber(normalData.avgEng)}</span>
            </div>
          </div>
        </div>

        {/* Video (视频) */}
        <div className="p-3 rounded-lg border border-border/30 bg-emerald-50/50 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold">视频笔记</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">数量</span>
              <span className="text-xs font-bold tabular-nums">{videoData.count}篇</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">篇均互动</span>
              <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatAnalyticsNumber(videoData.avgEng)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement comparison insight */}
      {engDiff !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
          {engDiff > 0 ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <p className="text-xs text-muted-foreground">
            视频笔记平均互动比图文{engDiff > 0 ? "高" : "低"} {Math.abs(engDiff).toFixed(0)}%
          </p>
        </div>
      )}

      {videoData.count === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
          <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">暂无视频笔记数据，可尝试增加视频内容</p>
        </div>
      )}
    </div>
  );
}

/** Weekday bar chart */
function WeekdayBarChart({ data }: { data: WeekdayStat[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const maxEng = Math.max(...data.filter(d => d.count > 0).map(d => d.avgEngagement), 1);

  return (
    <div className="space-y-3">
      {/* Count bars */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">发布数量</p>
        <div className="flex items-end gap-2 h-24">
          {data.map((d, i) => {
            const heightPct = (d.count / maxCount) * 100;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground tabular-nums">{d.count || ""}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-xhs/60 to-xhs/90 transition-all duration-500"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.short}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avg engagement bars */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">篇均互动</p>
        <div className="flex items-end gap-2 h-24">
          {data.map((d) => {
            const heightPct = d.count > 0 ? (d.avgEngagement / maxEng) * 100 : 0;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {d.count > 0 ? formatAnalyticsNumber(d.avgEngagement) : ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500",
                    d.count > 0 ? "bg-gradient-to-t from-emerald-500/60 to-emerald-500/90" : "bg-muted/20"
                  )}
                  style={{ height: `${Math.max(heightPct, 0)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.short}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-xhs/80" />
          <span className="text-[10px] text-muted-foreground">发布数量</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
          <span className="text-[10px] text-muted-foreground">篇均互动</span>
        </div>
      </div>
    </div>
  );
}

/** 24-hour distribution chart */
function HourDistributionChart({ data }: { data: HourStat[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const maxEng = Math.max(...data.filter(d => d.count > 0).map(d => d.avgEngagement), 1);

  // Group into time blocks for better readability
  const timeBlocks = [
    { label: "凌晨", hours: [0, 1, 2, 3, 4, 5] },
    { label: "上午", hours: [6, 7, 8, 9, 10, 11] },
    { label: "下午", hours: [12, 13, 14, 15, 16, 17] },
    { label: "晚间", hours: [18, 19, 20, 21, 22, 23] },
  ];

  const blockStats = timeBlocks.map((block) => {
    const blockData = block.hours.map(h => data[h]);
    const totalCount = blockData.reduce((s, d) => s + d.count, 0);
    const totalEng = blockData.reduce((s, d) => s + d.avgEngagement * d.count, 0);
    const avgEng = totalCount > 0 ? Math.round(totalEng / totalCount) : 0;
    const peakHour = blockData.sort((a, b) => b.count - a.count)[0];
    return {
      label: block.label,
      hours: block.hours,
      count: totalCount,
      avgEngagement: avgEng,
      peakHour: peakHour?.hour ?? block.hours[0],
    };
  });

  const maxBlockCount = Math.max(...blockStats.map(b => b.count), 1);
  const maxBlockEng = Math.max(...blockStats.filter(b => b.count > 0).map(b => b.avgEngagement), 1);

  return (
    <div className="space-y-4">
      {/* Detailed 24h bar chart */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">24小时发布分布</p>
        <div className="flex items-end gap-0.5 h-20">
          {data.map((d) => {
            const heightPct = (d.count / maxCount) * 100;
            return (
              <Tooltip key={d.hour}>
                <TooltipTrigger asChild>
                  <div
                    className="flex-1 min-w-[8px] rounded-t-sm bg-gradient-to-t from-xhs/50 to-xhs/80 transition-all duration-300 cursor-default hover:from-xhs/70 hover:to-xhs"
                    style={{ height: `${Math.max(heightPct, 1)}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>{d.label}</p>
                  <p>发布 {d.count} 篇 · 均互动 {formatAnalyticsNumber(d.avgEngagement)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {/* Hour labels */}
        <div className="flex gap-0.5 mt-1">
          {data.map((d, i) => (
            <div key={d.hour} className="flex-1 min-w-[8px] text-center">
              {i % 3 === 0 && (
                <span className="text-[8px] text-muted-foreground">{d.hour}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time block summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {blockStats.map((block) => {
          const engPct = block.count > 0 ? (block.avgEngagement / maxBlockEng) * 100 : 0;
          return (
            <div
              key={block.label}
              className="p-3 rounded-lg border border-border/30 bg-gradient-to-br from-muted/20 to-transparent"
            >
              <p className="text-xs font-semibold mb-1">{block.label}</p>
              <p className="text-lg font-bold tabular-nums">{block.count}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">篇</span></p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-500 transition-all duration-500"
                  style={{ width: `${engPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                均互动 {formatAnalyticsNumber(block.avgEngagement)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
