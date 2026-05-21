"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Flame,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  PenLine,
  X,
} from "lucide-react";
import type { TrendingTopic, ContentSuggestion } from "@/types";

// ─── Heat level visual config ──────────────────────────────────────────

const HEAT_CONFIG: Record<number, { icon: string; color: string; bg: string; label: string }> = {
  1: { icon: "💧", color: "text-blue-500", bg: "bg-blue-50", label: "冷门" },
  2: { icon: "🌱", color: "text-green-500", bg: "bg-green-50", label: "升温" },
  3: { icon: "🔥", color: "text-orange-500", bg: "bg-orange-50", label: "热门" },
  4: { icon: "🔥🔥", color: "text-red-500", bg: "bg-red-50", label: "爆热" },
  5: { icon: "🔥🔥🔥", color: "text-xhs", bg: "bg-xhs-light", label: "顶流" },
};

// ─── Category color map ────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "生活方式": "bg-rose-50 text-rose-700",
  "美妆护肤": "bg-pink-50 text-pink-700",
  "美食探店": "bg-amber-50 text-amber-700",
  "旅行攻略": "bg-sky-50 text-sky-700",
  "穿搭时尚": "bg-purple-50 text-purple-700",
  "家居装修": "bg-emerald-50 text-emerald-700",
  "职场成长": "bg-blue-50 text-blue-700",
  "学习干货": "bg-indigo-50 text-indigo-700",
  "健身运动": "bg-lime-50 text-lime-700",
  "母婴育儿": "bg-fuchsia-50 text-fuchsia-700",
  "数码科技": "bg-cyan-50 text-cyan-700",
  "宠物萌物": "bg-orange-50 text-orange-700",
};

// ─── Main Component ───────────────────────────────────────────────────

interface TrendingTopicsProps {
  onNavigateToCreator?: (topic?: string) => void;
  compact?: boolean;
}

export function TrendingTopics({ onNavigateToCreator, compact = false }: TrendingTopicsProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trending");
      const data = await res.json();
      if (data.success) {
        setTopics(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load trending topics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = async (topic: TrendingTopic) => {
    setSelectedTopic(topic);
    setDetailOpen(true);
    setSuggestion(null);
    setSuggestionLoading(true);
    try {
      const res = await fetch("/api/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.name }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggestion(data.data);
      }
    } catch (err) {
      console.error("Failed to get suggestions:", err);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleCreateFromTopic = (topic?: string) => {
    if (onNavigateToCreator) {
      onNavigateToCreator(topic);
    }
    setDetailOpen(false);
  };

  if (loading) {
    return (
      <div className={cn(compact ? "grid grid-cols-2 md:grid-cols-3 gap-2" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3")}>
        {Array.from({ length: compact ? 4 : 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-20 rounded-xl skeleton-delay-${(i % 6) + 1}`} />
        ))}
      </div>
    );
  }

  if (topics.length === 0) return null;

  const displayTopics = compact ? topics.slice(0, 6) : topics;

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-xhs" />
            热点灵感
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-xhs hover:text-xhs-dark"
            onClick={loadTopics}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
        <div className={cn(compact ? "grid grid-cols-2 md:grid-cols-3 gap-2" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3")}>
          {displayTopics.map((topic) => {
            const heatConfig = HEAT_CONFIG[topic.heat] || HEAT_CONFIG[3];
            const categoryColor = CATEGORY_COLORS[topic.category] || "bg-muted text-muted-foreground";

            return (
              <Card
                key={topic.id}
                className="cursor-pointer card-hover overflow-hidden"
                onClick={() => handleTopicClick(topic)}
              >
                <CardContent className={cn("p-3", compact && "p-2.5")}>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <p className={cn("font-medium line-clamp-1", compact ? "text-xs" : "text-sm")}>
                      {topic.name}
                    </p>
                    <span className="text-[10px] shrink-0">{heatConfig.icon}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] border-0 px-1.5 py-0 h-4", categoryColor)}
                    >
                      {topic.category}
                    </Badge>
                    <span className={cn("text-[10px] font-medium", heatConfig.color)}>
                      {heatConfig.label}
                    </span>
                  </div>
                  {topic.description && !compact && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">
                      {topic.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Topic Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:w-[520px] md:w-[600px] p-0 overflow-hidden">
          <SheetHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-xhs" />
                {selectedTopic?.name || "话题详情"}
              </SheetTitle>
              <SheetDescription className="text-xs mt-1">
                AI驱动的热点创作建议
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDetailOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetHeader>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
            {selectedTopic && (
              <>
                {/* Topic Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("text-xs border-0", CATEGORY_COLORS[selectedTopic.category] || "bg-muted")}>
                    {selectedTopic.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs border-0 bg-xhs-light text-xhs">
                    {HEAT_CONFIG[selectedTopic.heat]?.icon} {HEAT_CONFIG[selectedTopic.heat]?.label}
                  </Badge>
                </div>
                {selectedTopic.description && (
                  <p className="text-sm text-muted-foreground">{selectedTopic.description}</p>
                )}

                {/* Suggested Angles */}
                {selectedTopic.suggestedAngles && selectedTopic.suggestedAngles.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Lightbulb className="w-3.5 h-3.5" />
                        创作角度
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTopic.suggestedAngles.map((angle, i) => (
                          <Badge key={i} variant="secondary" className="text-xs border-0 bg-amber-50 text-amber-700">
                            {angle}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Example Titles */}
                {selectedTopic.exampleTitles && selectedTopic.exampleTitles.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <PenLine className="w-3.5 h-3.5" />
                        示例标题
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5">
                      {selectedTopic.exampleTitles.map((title, i) => (
                        <p key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-xhs font-bold shrink-0">{i + 1}.</span>
                          {title}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Create Button */}
                <Button
                  className="w-full bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20"
                  onClick={() => handleCreateFromTopic(selectedTopic.name)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  一键创作此话题
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                {/* AI Content Suggestion (loaded dynamically) */}
                {suggestionLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-24 rounded" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                ) : suggestion ? (
                  <div className="space-y-3">
                    {/* Suggested Angles from AI */}
                    {suggestion.angles && suggestion.angles.length > 0 && (
                      <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/20 to-transparent">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-xhs">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI推荐创作角度
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="grid grid-cols-2 gap-1.5">
                            {suggestion.angles.map((angle, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-border/50 text-xs"
                              >
                                <span className="w-5 h-5 rounded-full bg-xhs/10 text-xhs flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {i + 1}
                                </span>
                                {angle}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Generated Titles */}
                    {suggestion.titles && suggestion.titles.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            AI爆款标题
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-1">
                          {suggestion.titles.map((title, i) => (
                            <button
                              key={i}
                              className="w-full text-left text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2 group"
                              onClick={() => handleCreateFromTopic(title)}
                            >
                              <span className="text-xs text-muted-foreground font-mono">{i + 1}.</span>
                              <span className="flex-1">{title}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Tags */}
                    {suggestion.tags && suggestion.tags.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            推荐标签
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {suggestion.tags.map((tag, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className={cn(
                                  "text-xs border-0",
                                  i < 4 ? "bg-xhs-light text-xhs" : "bg-muted text-muted-foreground"
                                )}
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Content Outline */}
                    {suggestion.contentOutline && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            内容大纲
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <p className="text-sm text-foreground/80 leading-relaxed">{suggestion.contentOutline}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Tips */}
                    {suggestion.tips && suggestion.tips.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            创作技巧
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <ul className="space-y-1.5">
                            {suggestion.tips.map((tip, i) => (
                              <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
