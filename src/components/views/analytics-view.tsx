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
import { Separator } from "@/components/ui/separator";
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
import type { XhsPostInfo, XhsAccountInfo } from "@/types";
import {
  BarChart3,
  PieChart,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  RefreshCw,
  Lightbulb,
  Flame,
  Clock,
  Zap,
  ChevronRight,
  Activity,
} from "lucide-react";

// ─── Simulated / Derived Types ──────────────────────────────────────────

interface FunnelStage {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
}

interface CategoryItem {
  name: string;
  count: number;
  avgEngagement: number;
  trend: "up" | "down" | "stable";
  color: string;
  percentage: number;
}

interface AgeGroup {
  range: string;
  percentage: number;
  count: number;
}

interface CompetitorMetric {
  name: string;
  icon: React.ReactNode;
  yourValue: number | string;
  industryAvg: number | string;
  top10: number | string;
  yourVsIndustry: "above" | "below" | "equal";
  yourVsTop10: "above" | "below" | "equal";
  yourPosition: number; // 0-100 percentile
  unit?: string;
  trendData?: number[];
}

// ─── Number Formatting Helpers ──────────────────────────────────────────

/** Consistent number formatting: 万 for >= 10000, k for >= 1000 */
function formatAnalyticsNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

/** Format for funnel display specifically */
function formatFunnelNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

// ─── Main Component ─────────────────────────────────────────────────────

export function AnalyticsView() {
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [accounts, setAccounts] = useState<XhsAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("funnel");
  const [tabAnimating, setTabAnimating] = useState(false);

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

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);

  const funnelData = useMemo((): FunnelStage[] => {
    const totalImpressions = Math.max(
      posts.reduce((s, p) => s + (p.likes + p.comments + p.collects + p.shares) * 8, 0),
      10000
    );
    const totalViews = Math.round(totalImpressions * 0.62);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0) || 1250;
    const totalComments = posts.reduce((s, p) => s + p.comments, 0) || 380;
    const totalCollects = posts.reduce((s, p) => s + p.collects, 0) || 520;
    const totalShares = posts.reduce((s, p) => s + p.shares, 0) || 145;

    return [
      {
        label: "曝光",
        icon: <Eye className="w-4 h-4" />,
        count: totalImpressions,
        color: "text-xhs",
        bgColor: "bg-xhs/15",
      },
      {
        label: "浏览",
        icon: <BarChart3 className="w-4 h-4" />,
        count: totalViews,
        color: "text-xhs-600",
        bgColor: "bg-xhs-200/50",
      },
      {
        label: "点赞",
        icon: <Heart className="w-4 h-4" />,
        count: totalLikes,
        color: "text-rose-500",
        bgColor: "bg-rose-50 dark:bg-rose-950/20",
      },
      {
        label: "评论",
        icon: <MessageCircle className="w-4 h-4" />,
        count: totalComments,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      },
      {
        label: "收藏",
        icon: <Bookmark className="w-4 h-4" />,
        count: totalCollects,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
      },
      {
        label: "分享",
        icon: <Share2 className="w-4 h-4" />,
        count: totalShares,
        color: "text-violet-500",
        bgColor: "bg-violet-50 dark:bg-violet-950/20",
      },
    ];
  }, [posts]);

  const categoryData = useMemo((): CategoryItem[] => {
    if (posts.length === 0) return getSimulatedCategories();

    const catMap = new Map<string, { count: number; totalEng: number }>();
    for (const p of posts) {
      const cat = p.category || "未分类";
      const existing = catMap.get(cat) || { count: 0, totalEng: 0 };
      existing.count++;
      existing.totalEng += p.likes + p.comments + p.collects;
      catMap.set(cat, existing);
    }

    const total = posts.length;
    const colors = [
      "#FF2442", "#f59e0b", "#10b981", "#8b5cf6",
      "#ec4899", "#06b6d4", "#f97316", "#6366f1",
    ];

    return Array.from(catMap.entries())
      .map(([name, data], i) => ({
        name,
        count: data.count,
        avgEngagement: data.count > 0 ? Math.round(data.totalEng / data.count) : 0,
        trend: (Math.random() > 0.4 ? "up" : Math.random() > 0.5 ? "down" : "stable") as "up" | "down" | "stable",
        color: colors[i % colors.length],
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const ageData = useMemo((): AgeGroup[] => {
    return [
      { range: "18-24", percentage: 38, count: Math.round(totalFollowers * 0.38) },
      { range: "25-34", percentage: 32, count: Math.round(totalFollowers * 0.32) },
      { range: "35-44", percentage: 18, count: Math.round(totalFollowers * 0.18) },
      { range: "45+", percentage: 12, count: Math.round(totalFollowers * 0.12) },
    ];
  }, [totalFollowers]);

  const competitorMetrics = useMemo((): CompetitorMetric[] => {
    const avgFollowers = accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.followers, 0) / accounts.length)
      : 5200;
    const avgEng = posts.length > 0
      ? posts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / posts.length / Math.max(totalFollowers, 1) * 100
      : 4.2;
    const notesCount = accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.notesCount, 0) / accounts.length)
      : 48;
    const avgEngPerPost = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / posts.length)
      : 320;
    const growthSpeed = 12.5;

    // Generate sparkline data for each metric
    const genSparkline = (base: number, variance: number) =>
      Array.from({ length: 7 }, (_, i) =>
        Math.round(base + (Math.sin(i * 0.8) + (Math.random() - 0.5)) * variance)
      );

    return [
      {
        name: "粉丝数",
        icon: <Users className="w-4 h-4" />,
        yourValue: avgFollowers,
        industryAvg: 3800,
        top10: 25000,
        yourVsIndustry: avgFollowers > 3800 ? "above" : "below",
        yourVsTop10: avgFollowers > 25000 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgFollowers / 25000) * 80), 95),
        unit: "",
        trendData: genSparkline(avgFollowers, avgFollowers * 0.1),
      },
      {
        name: "互动率",
        icon: <Zap className="w-4 h-4" />,
        yourValue: avgEng.toFixed(1) + "%",
        industryAvg: "3.2%",
        top10: "8.5%",
        yourVsIndustry: avgEng > 3.2 ? "above" : "below",
        yourVsTop10: avgEng > 8.5 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgEng / 8.5) * 75), 90),
        unit: "%",
        trendData: genSparkline(Math.round(avgEng * 100), 30),
      },
      {
        name: "笔记频率",
        icon: <Clock className="w-4 h-4" />,
        yourValue: notesCount + "篇/月",
        industryAvg: "12篇/月",
        top10: "30篇/月",
        yourVsIndustry: notesCount > 12 ? "above" : "below",
        yourVsTop10: notesCount > 30 ? "above" : "below",
        yourPosition: Math.min(Math.round((notesCount / 30) * 70), 85),
        trendData: genSparkline(notesCount, 3),
      },
      {
        name: "平均互动",
        icon: <Heart className="w-4 h-4" />,
        yourValue: avgEngPerPost,
        industryAvg: 180,
        top10: 1200,
        yourVsIndustry: avgEngPerPost > 180 ? "above" : "below",
        yourVsTop10: avgEngPerPost > 1200 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgEngPerPost / 1200) * 70), 88),
        trendData: genSparkline(avgEngPerPost, avgEngPerPost * 0.15),
      },
      {
        name: "增长速度",
        icon: <TrendingUp className="w-4 h-4" />,
        yourValue: growthSpeed + "%/月",
        industryAvg: "5%/月",
        top10: "18%/月",
        yourVsIndustry: growthSpeed > 5 ? "above" : "below",
        yourVsTop10: growthSpeed > 18 ? "above" : "below",
        yourPosition: Math.min(Math.round((growthSpeed / 18) * 70), 82),
        unit: "%/月",
        trendData: genSparkline(Math.round(growthSpeed), 3),
      },
    ];
  }, [accounts, posts, totalFollowers]);

  // ─── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 view-animate">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
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

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
        {/* Unified Page Header */}
        <PageHeader
          icon={<BarChart3 className="w-5 h-5" />}
          title="数据洞察"
          subtitle="深度分析运营数据，发现增长机会"
          actions={
            <Button
              variant="outline"
              size="sm"
              className="border-border"
              onClick={loadData}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 h-10">
            <TabsTrigger value="funnel" className="text-xs sm:text-sm gap-1">
              <Target className="w-3.5 h-3.5 hidden sm:inline-block" />
              互动漏斗
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs sm:text-sm gap-1">
              <PieChart className="w-3.5 h-3.5 hidden sm:inline-block" />
              内容分布
            </TabsTrigger>
            <TabsTrigger value="audience" className="text-xs sm:text-sm gap-1">
              <Users className="w-3.5 h-3.5 hidden sm:inline-block" />
              受众画像
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="text-xs sm:text-sm gap-1">
              <Flame className="w-3.5 h-3.5 hidden sm:inline-block" />
              竞品对标
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: 互动漏斗 ──────────────────────────────────────── */}
          <TabsContent value="funnel" className="space-y-5 mt-4">
            {/* Funnel Summary */}
            <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-xhs" />
                  转化漏斗
                </CardTitle>
                <CardDescription className="text-xs">
                  从曝光到分享的完整转化路径，各阶段转化率一目了然
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelVisualization data={funnelData} />
              </CardContent>
            </Card>

            {/* Conversion Rate Cards - Enhanced with labels */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {funnelData.slice(0, -1).map((stage, i) => {
                const nextStage = funnelData[i + 1];
                const convRate = stage.count > 0
                  ? ((nextStage.count / stage.count) * 100).toFixed(1)
                  : "0";
                const isGood = parseFloat(convRate) > 50;
                return (
                  <Card key={stage.label + "-conv"} className="card-hover shadow-sm group">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1.5">
                        <span className={cn("text-[10px]", stage.color)}>{stage.label}</span>
                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />
                        <span className={cn("text-[10px]", nextStage.color)}>{nextStage.label}</span>
                      </div>
                      <p className="text-2xl font-bold tracking-tight text-xhs">
                        {convRate}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        转化率
                      </p>
                      <div className={cn(
                        "mt-2 h-1 rounded-full overflow-hidden bg-muted/50",
                      )}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            isGood ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-xhs/60 to-xhs"
                          )}
                          style={{ width: `${Math.min(parseFloat(convRate), 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Insights */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  漏斗洞察
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const browseRate = funnelData[0].count > 0
                      ? ((funnelData[1].count / funnelData[0].count) * 100).toFixed(1)
                      : "0";
                    const likeRate = funnelData[1].count > 0
                      ? ((funnelData[2].count / funnelData[1].count) * 100).toFixed(1)
                      : "0";
                    const insights = [
                      {
                        text: `曝光→浏览转化率 ${browseRate}%，${parseFloat(browseRate) > 60 ? "高于" : "低于"}行业平均水平（62%）`,
                        type: parseFloat(browseRate) > 60 ? "positive" as const : "negative" as const,
                      },
                      {
                        text: `浏览→点赞转化率 ${likeRate}%，建议优化首图和标题提升点击率`,
                        type: parseFloat(likeRate) > 12 ? "positive" as const : "neutral" as const,
                      },
                      {
                        text: "评论→收藏转化较好，内容深度获认可",
                        type: "positive" as const,
                      },
                      {
                        text: "收藏→分享转化有提升空间，可增加实用型内容",
                        type: "neutral" as const,
                      },
                    ];
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
              {/* Donut Chart - Enhanced */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-xhs" />
                    分类占比
                  </CardTitle>
                  <CardDescription className="text-xs">
                    各内容类别的分布情况
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedDonutChart data={categoryData} />
                </CardContent>
              </Card>

              {/* Category Ranked List - Enhanced labels */}
              <Card className="lg:col-span-3 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-xhs" />
                    分类详情
                  </CardTitle>
                  <CardDescription className="text-xs">
                    按发布数量排序，含平均互动与趋势
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {categoryData.map((cat, i) => {
                      const maxCount = Math.max(...categoryData.map(c => c.count));
                      const barPct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={cat.name}
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
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium truncate">{cat.name}</p>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <Badge variant="secondary" className="text-[10px] border-0 h-5 px-1.5">
                                  {cat.percentage}%
                                </Badge>
                                {cat.trend === "up" && (
                                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                                )}
                                {cat.trend === "down" && (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                                {cat.trend === "stable" && (
                                  <Minus className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                            </div>
                            {/* Mini progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${barPct}%`,
                                    backgroundColor: cat.color,
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                {cat.count}篇 · 均{formatAnalyticsNumber(cat.avgEngagement)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Performance Tips */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  内容优化建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryData.slice(0, 3).map((cat, i) => {
                    const tips = [
                      `${cat.name}内容互动率最高，建议增加该类内容产出频率`,
                      `${cat.name}类内容可尝试结合热门话题提升曝光`,
                      `${cat.name}类内容收藏比高，适合做系列化内容`,
                    ];
                    return (
                      <div
                        key={cat.name}
                        className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-muted/30 to-transparent"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs font-medium">{cat.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tips[i]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 3: 受众画像 ──────────────────────────────────────── */}
          <TabsContent value="audience" className="space-y-5 mt-4">
            <div className={cn(
              "grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300",
              tabAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}>
              {/* Age Distribution */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-xhs" />
                    年龄分布
                  </CardTitle>
                  <CardDescription className="text-xs">
                    粉丝年龄结构分析
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ageData.map((group) => (
                      <div key={group.range} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{group.range}岁</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatAnalyticsNumber(group.count)}
                            </span>
                            <span className="text-sm font-bold tabular-nums">
                              {group.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-xhs to-xhs-400 transition-all duration-700 ease-out"
                            style={{ width: `${group.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-xhs-light flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-xhs" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          核心受众为 18-34 岁，占比 {ageData[0].percentage + ageData[1].percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gender Split */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-xhs" />
                    性别分布
                  </CardTitle>
                  <CardDescription className="text-xs">
                    粉丝性别构成分析
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GenderDonutChart />
                </CardContent>
              </Card>
            </div>

            {/* Interests Tag Cloud - Enhanced with varying sizes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  兴趣标签
                </CardTitle>
                <CardDescription className="text-xs">
                  粉丝最感兴趣的话题领域
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedInterestTagCloud />
              </CardContent>
            </Card>

            {/* Active Hours Heatmap - Enhanced */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  活跃时段
                </CardTitle>
                <CardDescription className="text-xs">
                  粉丝活跃度按时间段分布（越深代表越活跃）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedAudienceHeatmap />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 4: 竞品对标 ──────────────────────────────────────── */}
          <TabsContent value="benchmark" className="space-y-5 mt-4">
            {/* Summary Banner */}
            <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">竞争力概览</p>
                    <p className="text-xs text-muted-foreground">
                      对比行业平均与 Top 10% 创作者
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const aboveCount = competitorMetrics.filter(m => m.yourVsIndustry === "above").length;
                    const total = competitorMetrics.length;
                    const score = Math.round((aboveCount / total) * 100);
                    return [
                      { label: "超越行业平均", value: `${aboveCount}/${total}项`, color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "综合得分", value: `${score}分`, color: "text-xhs" },
                      { label: "行业排名", value: `前${100 - Math.round(score * 0.6)}%`, color: "text-amber-600 dark:text-amber-400" },
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

            {/* Comparison Cards - Enhanced with score bars and sparklines */}
            <div className={cn(
              "space-y-3 transition-all duration-300",
              tabAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}>
              {competitorMetrics.map((metric) => (
                <EnhancedBenchmarkCard key={metric.name} metric={metric} />
              ))}
            </div>

            {/* Tips */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  提升建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitorMetrics
                    .filter((m) => m.yourVsIndustry === "below")
                    .slice(0, 3)
                    .map((metric) => {
                      const tips: Record<string, string> = {
                        "粉丝数": "持续输出优质内容，结合热门话题提升曝光，定期与粉丝互动",
                        "互动率": "优化内容开头吸引力，增加互动引导语，回复评论提升互动氛围",
                        "笔记频率": "制定内容日历，保持稳定发布节奏，可储备内容避免断更",
                        "平均互动": "提升内容质量，优化标题和封面，增加实用性和分享价值",
                        "增长速度": "关注平台热点，参与话题活动，与其他创作者联动互助",
                      };
                      return (
                        <div key={metric.name} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-500" />
                          <div>
                            <p className="text-sm font-medium">{metric.name}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              {tips[metric.name] || "持续优化该指标以缩小与行业差距"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  {competitorMetrics.filter((m) => m.yourVsIndustry === "below").length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      各项指标均超过行业平均水平，继续保持！
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────

/** Enhanced SVG Funnel Visualization with tooltips, conversion labels, gradient fills */
function FunnelVisualization({ data }: { data: FunnelStage[] }) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const maxCount = data[0]?.count || 1;
  const svgWidth = 520;
  const svgHeight = 400;
  const barHeight = 34;
  const gapY = 22;
  const totalHeight = data.length * barHeight + (data.length - 1) * gapY;
  const startY = (svgHeight - totalHeight) / 2;

  // Color gradients for each stage (xhs-red themed variations)
  const gradientColors = [
    ["#FF2442", "#FF6B81"],
    ["#FF4D6A", "#FF8DA1"],
    ["#f43f5e", "#fb7185"],
    ["#10b981", "#34d399"],
    ["#f59e0b", "#fbbf24"],
    ["#8b5cf6", "#a78bfa"],
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[320px] max-w-[520px] mx-auto"
      >
        <defs>
          {data.map((_, i) => {
            const gradientId = `funnel-grad-${i}`;
            return (
              <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={gradientColors[i]?.[0] || "#FF2442"} />
                <stop offset="100%" stopColor={gradientColors[i]?.[1] || "#FF5C72"} />
              </linearGradient>
            );
          })}
          {/* Shadow filter */}
          <filter id="funnel-shadow" x="-2%" y="-2%" width="104%" height="104%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        {data.map((stage, i) => {
          const widthRatio = Math.max(stage.count / maxCount, 0.08);
          const maxBarWidth = svgWidth - 200;
          const barWidth = widthRatio * maxBarWidth;
          const centerX = svgWidth / 2;
          const x = centerX - barWidth / 2 + 30;
          const y = startY + i * (barHeight + gapY);
          const isHovered = hoveredStage === i;

          return (
            <g
              key={stage.label}
              onMouseEnter={() => setHoveredStage(i)}
              onMouseLeave={() => setHoveredStage(null)}
              className="cursor-default"
            >
              {/* Label */}
              <text
                x={x - 10}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="central"
                className={cn(
                  "text-xs transition-all duration-200",
                  isHovered ? "fill-foreground font-semibold" : "fill-muted-foreground"
                )}
                fontSize="13"
                fontWeight={isHovered ? "600" : "500"}
              >
                {stage.label}
              </text>

              {/* Bar with gradient and shadow */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={`url(#funnel-grad-${i})`}
                opacity={isHovered ? 1 : 0.88}
                filter={isHovered ? "url(#funnel-shadow)" : undefined}
                className="transition-all duration-200"
              >
                <animate
                  attributeName="width"
                  from="0"
                  to={barWidth}
                  dur="0.8s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.25 0.46 0.45 0.94"
                />
              </rect>

              {/* Count inside bar */}
              <text
                x={x + barWidth - 8}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-white"
                fontSize="12"
                fontWeight="700"
              >
                {formatFunnelNumber(stage.count)}
              </text>

              {/* Icon inside bar (left side) */}
              <g transform={`translate(${x + 10}, ${y + barHeight / 2 - 7})`}>
                <foreignObject width="14" height="14">
                  <div className="text-white/80" />
                </foreignObject>
              </g>

              {/* Hover detail overlay */}
              {isHovered && (
                <g>
                  <rect
                    x={x + barWidth + 8}
                    y={y - 4}
                    width="100"
                    height={barHeight + 8}
                    rx="6"
                    className="fill-popover stroke-border"
                    strokeWidth="1"
                  />
                  <text
                    x={x + barWidth + 16}
                    y={y + 8}
                    className="fill-foreground"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {stage.label}: {formatFunnelNumber(stage.count)}
                  </text>
                  {i < data.length - 1 && (() => {
                    const convRate = stage.count > 0
                      ? ((data[i + 1].count / stage.count) * 100).toFixed(1)
                      : "0";
                    return (
                      <text
                        x={x + barWidth + 16}
                        y={y + 22}
                        className="fill-muted-foreground"
                        fontSize="9"
                      >
                        {stage.label}→{data[i + 1].label}: {convRate}%
                      </text>
                    );
                  })()}
                </g>
              )}

              {/* Conversion label between stages */}
              {i < data.length - 1 && (() => {
                const nextWidthRatio = Math.max(data[i + 1].count / maxCount, 0.08);
                const nextBarWidth = nextWidthRatio * maxBarWidth;
                const nextX = centerX - nextBarWidth / 2 + 30;
                const arrowY = y + barHeight + gapY / 2;
                const convRate = stage.count > 0
                  ? ((data[i + 1].count / stage.count) * 100).toFixed(1)
                  : "0";
                const midX = (x + barWidth / 2 + nextX + nextBarWidth / 2) / 2;

                return (
                  <g>
                    {/* Connecting line */}
                    <line
                      x1={x + barWidth / 2}
                      y1={y + barHeight}
                      x2={nextX + nextBarWidth / 2}
                      y2={y + barHeight + gapY}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    {/* Arrow */}
                    <polygon
                      points={`${midX - 3},${arrowY - 2} ${midX + 3},${arrowY - 2} ${midX},${arrowY + 2}`}
                      className="fill-muted-foreground/40"
                    />
                    {/* Conversion rate badge */}
                    <rect
                      x={midX - 28}
                      y={arrowY - 7}
                      width="56"
                      height="14"
                      rx="7"
                      className="fill-muted/80"
                    />
                    <text
                      x={midX}
                      y={arrowY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-muted-foreground"
                      fontSize="8"
                      fontWeight="600"
                    >
                      {stage.label}→{data[i + 1].label} {convRate}%
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Enhanced SVG Donut Chart with better spacing, center total, animation */
function EnhancedDonutChart({ data }: { data: CategoryItem[] }) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 90;
  const innerR = 55;
  const gapDeg = 1.5; // gap between slices in degrees
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  const slices = useMemo(() => {
    const totalGapDeg = gapDeg * data.length;
    const availableDeg = 360 - totalGapDeg;
    const accumulated = data.reduce<{ items: Array<CategoryItem & { pathD: string; angle: number; midAngle: number }>; currentAngle: number }>(
      (acc, item) => {
        const sliceAngle = (item.count / total) * availableDeg;
        const startAngle = acc.currentAngle;
        const endAngle = acc.currentAngle + sliceAngle;
        const midAngle = (startAngle + endAngle) / 2;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1Outer = cx + outerR * Math.cos(startRad);
        const y1Outer = cy + outerR * Math.sin(startRad);
        const x2Outer = cx + outerR * Math.cos(endRad);
        const y2Outer = cy + outerR * Math.sin(endRad);
        const x1Inner = cx + innerR * Math.cos(endRad);
        const y1Inner = cy + innerR * Math.sin(endRad);
        const x2Inner = cx + innerR * Math.cos(startRad);
        const y2Inner = cy + innerR * Math.sin(startRad);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

        const pathD = [
          `M ${x1Outer} ${y1Outer}`,
          `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
          `L ${x1Inner} ${y1Inner}`,
          `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
          "Z",
        ].join(" ");

        acc.items.push({ ...item, pathD, angle: sliceAngle, midAngle });
        acc.currentAngle = endAngle + gapDeg;
        return acc;
      },
      { items: [], currentAngle: -90 }
    );
    return accumulated.items;
  }, [data, total, cx, cy, outerR, innerR, gapDeg]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-52 h-52">
        {/* Animated entrance */}
        {slices.map((slice) => {
          const isHovered = hoveredSlice === slice.name;
          const midRad = (slice.midAngle * Math.PI) / 180;
          const hoverOffset = isHovered ? 4 : 0;
          const offsetX = hoverOffset * Math.cos(midRad);
          const offsetY = hoverOffset * Math.sin(midRad);

          return (
            <path
              key={slice.name}
              d={slice.pathD}
              fill={slice.color}
              opacity={isHovered ? 1 : 0.85}
              transform={`translate(${offsetX}, ${offsetY})`}
              className="transition-all duration-200 cursor-pointer"
              stroke="white"
              strokeWidth="2"
              onMouseEnter={() => setHoveredSlice(slice.name)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <animate
                attributeName="opacity"
                from="0"
                to="0.85"
                dur="0.5s"
                fill="freeze"
              />
            </path>
          );
        })}
        {/* Center text - total count */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize="22"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="10"
        >
          篇笔记
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="9"
        >
          {data.length}个分类
        </text>
      </svg>
      {/* Legend - more visually distinct */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-3">
        {data.map((item) => (
          <div
            key={item.name}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all duration-200 cursor-default",
              hoveredSlice === item.name && "bg-muted/50"
            )}
            onMouseEnter={() => setHoveredSlice(item.name)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-muted-foreground font-medium">
              {item.name}
            </span>
            <span className="text-[10px] font-bold tabular-nums">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gender Donut Chart */
function GenderDonutChart() {
  const malePct = 35;
  const femalePct = 65;

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;

  const femaleOffset = 0;
  const maleOffset = (femalePct / 100) * circumference;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32 shrink-0">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        {/* Female arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#FF2442"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(femalePct / 100) * circumference} ${circumference}`}
          strokeDashoffset={-femaleOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* Male arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(malePct / 100) * circumference} ${circumference}`}
          strokeDashoffset={-maleOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize="18"
          fontWeight="700"
        >
          {femalePct}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="9"
        >
          女性占比
        </text>
      </svg>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-xhs" />
          <div>
            <p className="text-sm font-medium">女性</p>
            <p className="text-xs text-muted-foreground">{femalePct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <div>
            <p className="text-sm font-medium">男性</p>
            <p className="text-xs text-muted-foreground">{malePct}%</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            小红书用户以女性为主，内容策略可侧重女性偏好
          </p>
        </div>
      </div>
    </div>
  );
}

/** Enhanced Interest Tag Cloud with varying sizes and more visual appeal */
function EnhancedInterestTagCloud() {
  const tags = [
    { text: "美妆护肤", intensity: 5 },
    { text: "穿搭时尚", intensity: 4 },
    { text: "美食探店", intensity: 4 },
    { text: "旅行攻略", intensity: 3 },
    { text: "健身运动", intensity: 3 },
    { text: "家居装修", intensity: 2 },
    { text: "母婴育儿", intensity: 3 },
    { text: "数码科技", intensity: 2 },
    { text: "职场成长", intensity: 2 },
    { text: "读书分享", intensity: 1 },
    { text: "摄影技巧", intensity: 2 },
    { text: "宠物萌宠", intensity: 3 },
    { text: "手工DIY", intensity: 1 },
    { text: "学习方法", intensity: 2 },
    { text: "减脂餐", intensity: 2 },
    { text: "收纳整理", intensity: 1 },
  ];

  const getColor = (intensity: number) => {
    switch (intensity) {
      case 5: return "bg-xhs text-white shadow-sm shadow-xhs/20";
      case 4: return "bg-xhs/80 text-white";
      case 3: return "bg-xhs-light text-xhs dark:bg-xhs/20 dark:text-xhs-300";
      case 2: return "bg-xhs-light/60 text-xhs-600 dark:bg-xhs/10 dark:text-xhs-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSize = (intensity: number) => {
    switch (intensity) {
      case 5: return "text-base px-5 py-2 font-bold";
      case 4: return "text-sm px-4 py-1.5 font-semibold";
      case 3: return "text-xs px-3 py-1.5 font-medium";
      case 2: return "text-[11px] px-2.5 py-1 font-medium";
      default: return "text-[10px] px-2 py-0.5";
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center">
      {tags.map((tag, idx) => (
        <span
          key={tag.text}
          className={cn(
            "rounded-full transition-all duration-300 cursor-default inline-flex items-center gap-1",
            getColor(tag.intensity),
            getSize(tag.intensity),
            tag.intensity >= 4 && "hover:scale-110 hover:shadow-md",
            tag.intensity === 3 && "hover:scale-105",
          )}
          style={{
            animationDelay: `${idx * 40}ms`,
          }}
        >
          {tag.text}
          {tag.intensity >= 3 && (
            <span className="opacity-60 text-[0.7em]">×{tag.intensity}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Enhanced Audience Active Hours Heatmap with better color scale and tooltips */
function EnhancedAudienceHeatmap() {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const timeSlots = [
    { label: "6-9时", emoji: "🌅" },
    { label: "9-12时", emoji: "☀️" },
    { label: "12-15时", emoji: "🌤️" },
    { label: "15-18时", emoji: "⛅" },
    { label: "18-21时", emoji: "🌇" },
    { label: "21-24时", emoji: "🌙" },
  ];

  // Simulated heatmap data (0-100 scale)
  const heatData = [
    [25, 30, 45, 35, 55, 40],
    [30, 35, 50, 40, 60, 50],
    [28, 40, 48, 42, 65, 55],
    [22, 38, 52, 38, 70, 60],
    [20, 32, 45, 35, 75, 65],
    [40, 55, 60, 50, 85, 80],
    [45, 50, 55, 48, 80, 75],
  ];

  const getHeatColor = (value: number) => {
    if (value >= 80) return "bg-xhs text-white";
    if (value >= 60) return "bg-xhs/70 text-white";
    if (value >= 45) return "bg-xhs/45 text-xhs-900 dark:text-white";
    if (value >= 30) return "bg-xhs-light text-xhs dark:bg-xhs/20 dark:text-xhs-300";
    if (value >= 15) return "bg-xhs-light/50 text-xhs-600 dark:bg-xhs/10 dark:text-xhs-400";
    return "bg-muted text-muted-foreground";
  };

  const getLevelLabel = (value: number) => {
    if (value >= 80) return "极活跃";
    if (value >= 60) return "很活跃";
    if (value >= 45) return "较活跃";
    if (value >= 30) return "一般";
    if (value >= 15) return "低活跃";
    return "不活跃";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Time header */}
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-10 shrink-0" />
          {timeSlots.map((slot) => (
            <div key={slot.label} className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground">
                {slot.emoji} {slot.label}
              </span>
            </div>
          ))}
        </div>
        {/* Heatmap rows */}
        {days.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-1.5">
            <div className="w-10 shrink-0 text-right">
              <span className="text-[11px] text-muted-foreground font-medium">{day}</span>
            </div>
            {heatData[dayIdx].map((value, slotIdx) => {
              const cellKey = `${dayIdx}-${slotIdx}`;
              const isHovered = hoveredCell === cellKey;
              return (
                <Tooltip key={slotIdx}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex-1 h-10 rounded-lg flex items-center justify-center transition-all duration-200 cursor-default",
                        getHeatColor(value),
                        isHovered ? "scale-110 ring-2 ring-xhs/30 z-10" : "hover:scale-105"
                      )}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className="text-[10px] font-medium tabular-nums">{value}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{day} {timeSlots[slotIdx].label}</p>
                    <p>活跃度: {value} · {getLevelLabel(value)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
        {/* Legend - enhanced color scale */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">低活跃</span>
          <div className="flex items-center gap-0.5">
            <div className="w-5 h-3 rounded-sm bg-muted" />
            <div className="w-5 h-3 rounded-sm bg-xhs-light/50 dark:bg-xhs/10" />
            <div className="w-5 h-3 rounded-sm bg-xhs-light dark:bg-xhs/20" />
            <div className="w-5 h-3 rounded-sm bg-xhs/45" />
            <div className="w-5 h-3 rounded-sm bg-xhs/70" />
            <div className="w-5 h-3 rounded-sm bg-xhs" />
          </div>
          <span className="text-[10px] text-muted-foreground">极活跃</span>
        </div>
      </div>
    </div>
  );
}

/** Mini Sparkline SVG for benchmark trend */
function MiniSparkline({ data, color = "#FF2442", width = 60, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Enhanced Benchmark Comparison Card with score bars, color-coded competitiveness, sparklines */
function EnhancedBenchmarkCard({ metric }: { metric: CompetitorMetric }) {
  const getIndicator = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above":
        return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />;
      case "below":
        return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
      case "equal":
        return <Minus className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getLabel = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above": return "领先";
      case "below": return "落后";
      case "equal": return "持平";
    }
  };

  const getLabelColor = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above": return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20";
      case "below": return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20";
      case "equal": return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20";
    }
  };

  // Color-code competitiveness score
  const getScoreColor = (position: number) => {
    if (position >= 70) return { bar: "bg-gradient-to-r from-emerald-400 to-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
    if (position >= 40) return { bar: "bg-gradient-to-r from-amber-400 to-amber-500", text: "text-amber-600 dark:text-amber-400" };
    return { bar: "bg-gradient-to-r from-red-400 to-red-500", text: "text-red-600 dark:text-red-400" };
  };

  const scoreColor = getScoreColor(metric.yourPosition);

  return (
    <Card className="card-hover shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-xhs-light to-xhs-light/40 flex items-center justify-center text-xhs">
            {metric.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{metric.name}</p>
          </div>
          {/* Sparkline */}
          {metric.trendData && metric.trendData.length >= 2 && (
            <MiniSparkline
              data={metric.trendData}
              color={metric.yourVsIndustry === "above" ? "#10b981" : metric.yourVsIndustry === "below" ? "#ef4444" : "#f59e0b"}
            />
          )}
          <div className="flex items-center gap-1.5">
            {getIndicator(metric.yourVsIndustry)}
            <Badge variant="secondary" className={cn("text-[10px] border-0", getLabelColor(metric.yourVsIndustry))}>
              {getLabel(metric.yourVsIndustry)}
            </Badge>
          </div>
        </div>

        {/* Three-column comparison */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-lg bg-xhs-light/30 dark:bg-xhs/10">
            <p className="text-[10px] text-muted-foreground mb-0.5">你的数据</p>
            <p className="text-sm font-bold text-xhs tabular-nums">
              {typeof metric.yourValue === "number" ? formatAnalyticsNumber(metric.yourValue) : metric.yourValue}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">行业平均</p>
            <p className="text-sm font-bold tabular-nums">
              {typeof metric.industryAvg === "number" ? formatAnalyticsNumber(metric.industryAvg) : metric.industryAvg}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">Top 10%</p>
            <p className="text-sm font-bold tabular-nums">
              {typeof metric.top10 === "number" ? formatAnalyticsNumber(metric.top10) : metric.top10}
            </p>
          </div>
        </div>

        {/* Enhanced Position bar with color-coded score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">竞争力评分</span>
            <span className={cn("font-bold", scoreColor.text)}>{metric.yourPosition}分</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden relative">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", scoreColor.bar)}
              style={{ width: `${metric.yourPosition}%` }}
            />
            {/* Marker for industry average at 50% */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/30"
              style={{ left: "50%" }}
            />
            {/* Label at marker */}
            <div
              className="absolute -top-0.5 text-[7px] text-muted-foreground/60"
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              行业均
            </div>
          </div>
          {/* Score level indicator */}
          <div className="flex justify-between text-[9px] text-muted-foreground/60">
            <span>弱</span>
            <span>中</span>
            <span>强</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────

function getSimulatedCategories(): CategoryItem[] {
  return [
    { name: "美妆护肤", count: 28, avgEngagement: 1250, trend: "up", color: "#FF2442", percentage: 28 },
    { name: "穿搭时尚", count: 22, avgEngagement: 980, trend: "up", color: "#f59e0b", percentage: 22 },
    { name: "美食探店", count: 18, avgEngagement: 860, trend: "stable", color: "#10b981", percentage: 18 },
    { name: "旅行攻略", count: 14, avgEngagement: 720, trend: "down", color: "#8b5cf6", percentage: 14 },
    { name: "生活方式", count: 10, avgEngagement: 540, trend: "up", color: "#ec4899", percentage: 10 },
    { name: "家居好物", count: 8, avgEngagement: 410, trend: "stable", color: "#06b6d4", percentage: 8 },
  ];
}
