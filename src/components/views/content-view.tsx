"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, XhsPostInfo, ContentDraftInfo } from "@/types";
import type { AccountDataState } from "@/hooks/use-account-data";
import { PostCard } from "@/components/post-card";
import { formatNumber } from "@/components/account-card";
import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import { toast } from "sonner";
import { ExportDialog } from "@/components/export-dialog";
import {
  FileText,
  Search,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Star,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  PenLine,
  Sparkles,
  Filter,
  ArrowUpDown,
  Hash,
  Eye,
  Clock,
  Pencil,
  CheckCircle2,
  Plus,
  CheckSquare,
  Download,
  Tag,
  BookOpen,
  Palette,
  Play,
} from "lucide-react";

type SortOption = "date" | "likes" | "comments" | "collects" | "aiScore";
type ViewMode = "grid" | "list" | "calendar" | "schedule";
type CategoryFilter = "全部" | "美食探店" | "穿搭时尚" | "旅行攻略" | "家居装修" | "职场成长" | "美妆护肤";
type NoteTypeFilter = "all" | "posts" | "drafts";

const CATEGORY_CHIPS: CategoryFilter[] = ["全部", "美食探店", "穿搭时尚", "旅行攻略", "家居装修", "职场成长", "美妆护肤"];

const NOTE_TYPE_CHIPS: { value: NoteTypeFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "posts", label: "已发布笔记" },
  { value: "drafts", label: "草稿" },
];

// ─── Schedule Types ─────────────────────────────────────────────────────

type ScheduleStatus = "pending" | "published" | "draft";

interface ScheduledPost {
  id: string;
  postId?: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  accountId: string;
  status: ScheduleStatus;
  notes: string;
}

const POSTS_PER_PAGE = 12;

// ─── Helper: Date Grouping ──────────────────────────────────────────────

function getDateGroupLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "明天";
  if (diffDays > 1 && diffDays <= 6) return "本周";
  if (diffDays > 6 && diffDays <= 13) return "下周";
  // Past dates
  if (diffDays === -1) return "昨天";
  if (diffDays < -1 && diffDays >= -6) return "上周";
  if (diffDays < -6) return "更早";
  return "更晚";
}

function getDateGroupOrder(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 0;
  if (diffDays === 1) return 1;
  if (diffDays > 1 && diffDays <= 6) return 2;
  if (diffDays > 6 && diffDays <= 13) return 3;
  if (diffDays > 13) return 4;
  // Past dates come after future, before "更晚"
  if (diffDays === -1) return 5;
  if (diffDays < -1 && diffDays >= -6) return 6;
  return 7; // 更早
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

// ─── Draft Status Badge ────────────────────────────────────────────────

function DraftStatusBadge({ status }: { status: ContentDraftInfo["status"] }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: "草稿",
      className: "bg-muted text-muted-foreground border-border",
    },
    polishing: {
      label: "润色中",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
    },
    ready: {
      label: "待发布",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
    },
    published: {
      label: "已发布",
      className: "bg-xhs-light/60 text-xhs border-xhs/20",
    },
  };
  const { label, className } = config[status] || config.draft;
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border", className)}>
      {label}
    </Badge>
  );
}

// ─── DraftCard Component ───────────────────────────────────────────────

function DraftCard({
  draft,
  onClick,
  className,
}: {
  draft: ContentDraftInfo & { accountNickname?: string; accountAvatar?: string };
  onClick?: () => void;
  className?: string;
}) {
  const statusConfig: Record<string, { gradient: string; icon: typeof Palette }> = {
    draft: { gradient: "from-slate-400 via-gray-400 to-zinc-300", icon: FileText },
    polishing: { gradient: "from-amber-400 via-orange-400 to-yellow-300", icon: Sparkles },
    ready: { gradient: "from-emerald-400 via-green-400 to-teal-300", icon: CheckCircle2 },
    published: { gradient: "from-xhs via-rose-400 to-pink-300", icon: CheckCircle2 },
  };
  const config = statusConfig[draft.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer card-glow overflow-hidden group active:scale-[0.97] transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      {/* Cover area with draft styling */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <div className={cn(
          "w-full h-full flex items-center justify-center bg-gradient-to-br",
          config.gradient
        )}>
          <div className="flex flex-col items-center gap-2">
            <StatusIcon className="w-10 h-10 text-white/90" />
            <span className="text-[10px] text-white/70 font-medium">
              {draft.status === "draft" ? "草稿" : draft.status === "polishing" ? "润色中" : draft.status === "ready" ? "待发布" : "已发布"}
            </span>
          </div>
        </div>

        {/* Draft badge */}
        <div className="absolute top-2 left-2 bg-amber-500/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <FileText className="w-2.5 h-2.5" />
          草稿
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <DraftStatusBadge status={draft.status} />
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">
          {draft.title || "无标题草稿"}
        </h3>

        {/* Content excerpt */}
        {draft.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
            {draft.content.slice(0, 50)}{draft.content.length > 50 ? "..." : ""}
          </p>
        )}

        {/* Tags */}
        {draft.tags && draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {draft.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium inline-flex items-center"
              >
                #{tag}
              </span>
            ))}
            {draft.tags.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                +{draft.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeDate(draft.createdAt)}
          </span>
          {draft.accountNickname && (
            <span className="flex items-center gap-1 ml-auto truncate max-w-[80px]">
              {draft.accountNickname}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ContentCalendar Component ──────────────────────────────────────────

function ContentCalendar({
  posts,
  drafts,
  onPostClick,
  onDraftClick,
  onDateClick,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  posts: XhsPostInfo[];
  drafts: ContentDraftInfo[];
  onPostClick: (post: XhsPostInfo) => void;
  onDraftClick: (draft: ContentDraftInfo) => void;
  onDateClick: (dateStr: string) => void;
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const postsByDate = useMemo(() => {
    const map: Record<string, XhsPostInfo[]> = {};
    for (const post of posts) {
      // Fallback: use scrapedAt if publishDate is empty
      const dateStr = post.publishDate
        ? post.publishDate.slice(0, 10)
        : post.scrapedAt
          ? post.scrapedAt.slice(0, 10)
          : "";
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(post);
      }
    }
    return map;
  }, [posts]);

  const draftsByDate = useMemo(() => {
    const map: Record<string, ContentDraftInfo[]> = {};
    for (const draft of drafts) {
      const dateStr = draft.createdAt ? draft.createdAt.slice(0, 10) : "";
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(draft);
      }
    }
    return map;
  }, [drafts]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const monthLabel = `${year}年${month + 1}月`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const cells: { day: number | null; dateStr: string; isToday: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: null, dateStr: "", isToday: false });
    } else {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({ day: dayNum, dateStr, isToday: dateStr === todayStr });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onToday}>
            今天
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const dayPosts = cell.dateStr ? postsByDate[cell.dateStr] || [] : [];
          const dayDrafts = cell.dateStr ? draftsByDate[cell.dateStr] || [] : [];
          const hasContent = dayPosts.length > 0 || dayDrafts.length > 0;
          return (
            <div
              key={i}
              className={cn(
                "min-h-[72px] border border-border/50 rounded-lg p-1 transition-colors cursor-pointer",
                cell.day === null && "bg-muted/20 cursor-default",
                cell.isToday && "bg-xhs-light/30 border-xhs/30",
                cell.day !== null && !cell.isToday && "bg-white dark:bg-neutral-950",
                cell.day !== null && hasContent && "hover:border-xhs/30"
              )}
              onClick={() => {
                if (cell.dateStr && cell.day !== null) {
                  onDateClick(cell.dateStr);
                }
              }}
            >
              {cell.day !== null && (
                <>
                  <span
                    className={cn(
                      "text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full",
                      cell.isToday && "bg-xhs text-white"
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <button
                        key={post.id}
                        className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded bg-xhs/10 text-xhs hover:bg-xhs/20 transition-colors truncate"
                        onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
                        title={post.title || "无标题"}
                      >
                        {post.title || "无标题"}
                      </button>
                    ))}
                    {dayDrafts.slice(0, 2 - Math.min(dayPosts.length, 2)).map((draft) => (
                      <button
                        key={draft.id}
                        className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-950/50 transition-colors truncate"
                        onClick={(e) => { e.stopPropagation(); onDraftClick(draft); }}
                        title={draft.title || "无标题草稿"}
                      >
                        {draft.title || "无标题草稿"}
                      </button>
                    ))}
                    {(() => {
                      const totalItems = dayPosts.length + dayDrafts.length;
                      const shown = Math.min(dayPosts.length, 2) + Math.min(dayDrafts.length, 2 - Math.min(dayPosts.length, 2));
                      if (totalItems > shown) {
                        return (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{totalItems - shown}更多
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────

function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const config: Record<ScheduleStatus, { label: string; className: string }> = {
    pending: {
      label: "待发布",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
    },
    published: {
      label: "已发布",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
    },
    draft: {
      label: "草稿",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border", className)}>
      {label}
    </Badge>
  );
}

// ─── Schedule Timeline Component ────────────────────────────────────────

function ScheduleTimeline({
  scheduledPosts,
  accounts,
  onEdit,
  onDelete,
  onMarkPublished,
}: {
  scheduledPosts: ScheduledPost[];
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  onEdit: (post: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onMarkPublished: (id: string) => void;
}) {
  // Group by date group
  const groupedPosts = useMemo(() => {
    const groups: Record<string, ScheduledPost[]> = {};
    const groupOrder: string[] = ["今天", "明天", "本周", "下周", "更晚", "昨天", "上周", "更早"];

    for (const post of scheduledPosts) {
      const label = getDateGroupLabel(post.scheduledDate);
      if (!groups[label]) groups[label] = [];
      groups[label].push(post);
    }

    // Sort posts within each group by scheduledTime (if available), then by title
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
        if (a.scheduledTime) return -1;
        if (b.scheduledTime) return 1;
        return a.title.localeCompare(b.title);
      });
    }

    // Return in order
    return groupOrder
      .filter((label) => groups[label])
      .map((label) => ({ label, posts: groups[label] }));
  }, [scheduledPosts]);

  const getAccount = useCallback(
    (accountId: string) => accounts.find((a) => a.id === accountId),
    [accounts]
  );

  const statusAccentColor = (status: ScheduleStatus) => {
    switch (status) {
      case "pending":
        return "border-l-amber-400 dark:border-l-amber-500";
      case "published":
        return "border-l-emerald-400 dark:border-l-emerald-500";
      case "draft":
        return "border-l-muted-foreground/40";
    }
  };

  const dotColor = (status: ScheduleStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-400 dark:bg-amber-500";
      case "published":
        return "bg-emerald-400 dark:bg-emerald-500";
      case "draft":
        return "bg-muted-foreground/50";
    }
  };

  if (scheduledPosts.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="暂无排期内容"
        description="点击「新建排期」按钮，为笔记安排发布时间"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-0">
      {groupedPosts.map((group, gi) => (
        <div key={group.label} className="relative">
          {/* Sticky Date Group Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 py-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{group.label}</span>
              {group.label === "今天" && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-xhs-light/60 text-xhs border-0">
                  {group.posts.length}篇
                </Badge>
              )}
              {group.label !== "今天" && group.posts.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{group.posts.length}篇</span>
              )}
              {group.posts.length > 0 && group.label !== "今天" && group.label !== "明天" && (
                <span className="text-[10px] text-muted-foreground">
                  · {formatDateDisplay(group.posts[0].scheduledDate)}
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border/70" />

            <div className="space-y-2 pb-4">
              {group.posts.map((post) => {
                const account = getAccount(post.accountId);
                return (
                  <div key={post.id} className="relative pl-7 group">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-0 top-3.5 w-[15px] h-[15px] rounded-full border-[2.5px] border-background z-[1]",
                        dotColor(post.status)
                      )}
                    />

                    {/* Content Card */}
                    <div
                      className={cn(
                        "rounded-lg border border-border/60 bg-white dark:bg-neutral-950 p-3 transition-all duration-200",
                        "hover:shadow-md hover:border-border",
                        "border-l-[3px]",
                        statusAccentColor(post.status)
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Time + Status */}
                          <div className="flex items-center gap-2 mb-1">
                            {post.scheduledTime ? (
                              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {post.scheduledTime}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                                <Clock className="w-3 h-3" />
                                {post.scheduledDate}
                              </span>
                            )}
                            <ScheduleStatusBadge status={post.status} />
                          </div>

                          {/* Title */}
                          <p className="text-sm font-medium truncate mb-1">
                            {post.title}
                          </p>

                          {/* Account + Notes */}
                          <div className="flex items-center gap-2">
                            {account && (
                              <div className="flex items-center gap-1.5">
                                <Avatar size="sm">
                                  <AvatarImage src={proxyXhsImage(account.avatarUrl)} alt={account.nickname} />
                                  <AvatarFallback className="bg-xhs-light text-xhs text-[8px]">
                                    {(account.nickname || "用").slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                                  {account.nickname || "未命名"}
                                </span>
                              </div>
                            )}
                            {post.notes && (
                              <span className="text-[11px] text-muted-foreground/70 truncate max-w-[120px]">
                                · {post.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {post.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => onMarkPublished(post.id)}
                              title="标记为已发布"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(post)}
                            title="编辑"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(post.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty within group */}
              {group.posts.length === 0 && (
                <div className="relative pl-7">
                  <div className="absolute left-0 top-3 w-[15px] h-[15px] rounded-full border-[2.5px] border-background bg-muted-foreground/20 z-[1]" />
                  <p className="text-xs text-muted-foreground py-2">暂无排期内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Schedule Post Dialog ───────────────────────────────────────────────

function SchedulePostDialog({
  open,
  onOpenChange,
  posts,
  accounts,
  onSchedule,
  editingPost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: XhsPostInfo[];
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  onSchedule: (data: Omit<ScheduledPost, "id">) => void;
  editingPost: ScheduledPost | null;
}) {
  // Compute initial values based on editingPost
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [selectedPostId, setSelectedPostId] = useState(editingPost?.postId ?? "");
  const [scheduledDate, setScheduledDate] = useState(editingPost?.scheduledDate ?? tomorrow);
  const [scheduledTime, setScheduledTime] = useState(editingPost?.scheduledTime ?? "19:00");
  const [selectedAccountId, setSelectedAccountId] = useState(
    editingPost?.accountId ?? (accounts.length > 0 ? accounts[0].id : "")
  );
  const [notes, setNotes] = useState(editingPost?.notes ?? "");

  const handleSubmit = () => {
    if (!title.trim() || !scheduledDate || !scheduledTime) return;
    onSchedule({
      postId: selectedPostId || undefined,
      title: title.trim(),
      scheduledDate,
      scheduledTime,
      accountId: selectedAccountId,
      status: editingPost?.status || "pending",
      notes,
    });
    onOpenChange(false);
  };

  // Available time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h <= 23; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingPost ? "编辑排期" : "新建排期"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Select from existing drafts */}
          <div className="space-y-1.5">
            <Label className="text-xs">从笔记中选择</Label>
            <Select value={selectedPostId} onValueChange={(val) => {
              setSelectedPostId(val);
              if (val && val !== "manual") {
                const found = posts.find((p) => p.id === val);
                if (found) setTitle(found.title || "无标题");
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择已有笔记（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动输入标题</SelectItem>
                {posts.slice(0, 20).map((post) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.title || "无标题"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">标题</Label>
            <Input
              placeholder="输入笔记标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">日期</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">时间</Label>
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs">发布账号</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择账号" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.nickname || "未命名"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">备注</Label>
            <Textarea
              placeholder="添加备注（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || !scheduledDate || !scheduledTime}
            className="text-xs bg-xhs hover:bg-xhs-dark text-white"
          >
            {editingPost ? "保存修改" : "确认排期"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Props Interface ───────────────────────────────────────────────────

interface ContentViewProps {
  /** Shared account data from AccountHubView (when inside hub) */
  sharedAccountData?: AccountDataState;
  /** Open creator sheet */
  onOpenCreator?: () => void;
}

// ─── Main ContentView Component ─────────────────────────────────────────

export function ContentView({ sharedAccountData, onOpenCreator }: ContentViewProps) {
  const { setAddAccountDialogOpen, setActiveTab, setCreatorSheetOpen } = useAppStore();
  const isInHub = !!sharedAccountData;
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [drafts, setDrafts] = useState<(ContentDraftInfo & { accountNickname?: string; accountAvatar?: string })[]>([]);
  const [standaloneAccounts, setStandaloneAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<XhsPostInfo | null>(null);
  const [postComments, setPostComments] = useState<Array<{
    id: string;
    xhsCommentId: string;
    content: string;
    userName: string;
    userAvatar: string;
    likes: number;
    subCommentCount: number;
    commentDate: string;
    createdAt: string;
  }>>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<(ContentDraftInfo & { accountNickname?: string; accountAvatar?: string }) | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [draftCopied, setDraftCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("全部");
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteTypeFilter>("all");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const lastClickedIdRef = useRef<string | null>(null);

  // Schedule state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingScheduledPost, setEditingScheduledPost] = useState<ScheduledPost | null>(null);

  // Generate schedule data from real scraped posts and drafts
  const generateSampleSchedule = useCallback(
    (loadedPosts: XhsPostInfo[], loadedAccounts: (XhsAccountInfo & { postsCount?: number })[]) => {
      if (loadedPosts.length === 0) return [];
      const samples: ScheduledPost[] = [];

      // Create schedule entries from scraped posts using their ACTUAL publish dates
      loadedPosts.forEach((post, i) => {
        // Use the real publishDate from XHS; fallback to scrapedAt if missing
        const publishDate = post.publishDate || (post.scrapedAt ? post.scrapedAt.slice(0, 10) : "");
        if (!publishDate) return;

        // All scraped posts are already published on XHS
        samples.push({
          id: `schedule-published-${post.id}`,
          postId: post.id,
          title: post.title || "无标题笔记",
          scheduledDate: publishDate,
          scheduledTime: "", // Scraped posts don't have scheduled time
          accountId: post.accountId || (loadedAccounts[0]?.id ?? ""),
          status: "published",
          notes: "",
        });
      });

      return samples;
    },
    []
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  // When in hub, auto-set filter to selected account
  useEffect(() => {
    if (isInHub && sharedAccountData?.selectedAccountId) {
      if (filterAccountId !== sharedAccountData.selectedAccountId) {
        setFilterAccountId(sharedAccountData.selectedAccountId);
      }
    }
  }, [isInHub, sharedAccountData?.selectedAccountId, filterAccountId]);

  useEffect(() => {
    loadPosts();
    loadDrafts();
  }, [sortBy, filterAccountId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterAccountId, searchQuery, categoryFilter, noteTypeFilter]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) setStandaloneAccounts(data.data || []);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy, limit: "100" });
      if (filterAccountId !== "all") params.set("accountId", filterAccountId);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      if (data.success) {
        const loadedPosts = data.data || [];
        setPosts(loadedPosts);
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAccountId !== "all") params.set("accountId", filterAccountId);
      const res = await fetch(`/api/drafts?${params}`);
      const data = await res.json();
      if (data.success) {
        setDrafts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load drafts:", err);
    }
  };

  // Resolve accounts: use shared data when in hub, otherwise standalone
  const accounts = isInHub ? sharedAccountData!.accounts : standaloneAccounts;

  // Generate sample schedule data once posts and accounts are loaded
  useEffect(() => {
    if (posts.length > 0 && accounts.length > 0 && scheduledPosts.length === 0) {
      setScheduledPosts(generateSampleSchedule(posts, accounts));
    }
  }, [posts, accounts, scheduledPosts.length, generateSampleSchedule]);

  const filteredPosts = posts.filter((post) => {
    // Category filter
    if (categoryFilter !== "全部" && (post.category || "") !== categoryFilter) return false;
    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (post.title || "").toLowerCase().includes(q) ||
      (post.content || "").toLowerCase().includes(q) ||
      (post.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const filteredDrafts = drafts.filter((draft) => {
    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (draft.title || "").toLowerCase().includes(q) ||
      (draft.content || "").toLowerCase().includes(q) ||
      (draft.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  // Determine which items to show based on noteTypeFilter
  const displayPosts = noteTypeFilter === "drafts" ? [] : filteredPosts;
  const displayDrafts = noteTypeFilter === "posts" ? [] : filteredDrafts;

  // For pagination: combined items when showing "all"
  type DisplayItem =
    | { type: "post"; data: XhsPostInfo }
    | { type: "draft"; data: ContentDraftInfo & { accountNickname?: string; accountAvatar?: string } };

  const allDisplayItems = useMemo(() => {
    const items: DisplayItem[] = [];
    if (noteTypeFilter === "all") {
      // Interleave posts and drafts by date (posts first, then drafts)
      for (const post of filteredPosts) {
        items.push({ type: "post", data: post });
      }
      for (const draft of filteredDrafts) {
        items.push({ type: "draft", data: draft });
      }
    } else if (noteTypeFilter === "posts") {
      for (const post of filteredPosts) {
        items.push({ type: "post", data: post });
      }
    } else {
      for (const draft of filteredDrafts) {
        items.push({ type: "draft", data: draft });
      }
    }
    return items;
  }, [noteTypeFilter, filteredPosts, filteredDrafts]);

  // Pagination
  const totalPages = Math.ceil(allDisplayItems.length / POSTS_PER_PAGE);
  const paginatedItems = allDisplayItems.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  // Also keep paginatedPosts for batch operations compatibility
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const sortOptions: { value: SortOption; label: string; icon: typeof ArrowUpDown }[] = [
    { value: "date", label: "最新", icon: Clock },
    { value: "likes", label: "点赞", icon: Heart },
    { value: "comments", label: "评论", icon: MessageCircle },
    { value: "collects", label: "收藏", icon: Bookmark },
    { value: "aiScore", label: "AI评分", icon: Sparkles },
  ];

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleTodayMonth = () => {
    setCurrentMonth(new Date());
  };

  const handleCopyContent = async () => {
    if (!selectedPost) return;
    const text = `${selectedPost.title}\n\n${selectedPost.content || ""}\n\n${(selectedPost.tags || []).map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDraftContent = async () => {
    if (!selectedDraft) return;
    const text = `${selectedDraft.title}\n\n${selectedDraft.content || ""}\n\n${(selectedDraft.tags || []).map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2000);
  };

  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
    setPostComments([]);
  };

  const loadPostComments = useCallback(async (postId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (data.success) {
        setPostComments(data.data || []);
      } else {
        setPostComments([]);
      }
    } catch {
      setPostComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const openPostDetail = useCallback((post: XhsPostInfo) => {
    setSelectedPost(post);
    setPostComments([]);
    loadPostComments(post.id);
  }, [loadPostComments]);

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts?id=${draftId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        setSelectedDraft(null);
        toast.success("草稿已删除");
      } else {
        toast.error("删除草稿失败");
      }
    } catch {
      toast.error("删除草稿失败");
    }
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate((prev) => prev === dateStr ? null : dateStr);
  };

  // Items for the selected date in calendar
  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return [];
    return posts.filter((post) => {
      const dateStr = post.publishDate
        ? post.publishDate.slice(0, 10)
        : post.scrapedAt
          ? post.scrapedAt.slice(0, 10)
          : "";
      return dateStr === selectedDate;
    });
  }, [posts, selectedDate]);

  const selectedDateDrafts = useMemo(() => {
    if (!selectedDate) return [];
    return drafts.filter((draft) => {
      const dateStr = draft.createdAt ? draft.createdAt.slice(0, 10) : "";
      return dateStr === selectedDate;
    });
  }, [drafts, selectedDate]);

  // ─── Batch Operations ──────────────────────────────────────────────────

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
        setLastClickedId(null);
        lastClickedIdRef.current = null;
      }
      return !prev;
    });
  }, []);

  const handleCardClick = useCallback(
    (post: XhsPostInfo, e: React.MouseEvent) => {
      if (!selectionMode) {
        openPostDetail(post);
        return;
      }

      const postId = post.id;

      if (e.shiftKey && lastClickedIdRef.current) {
        // Shift+Click: range selection
        const currentIdx = paginatedPosts.findIndex((p) => p.id === postId);
        const lastIdx = paginatedPosts.findIndex((p) => p.id === lastClickedIdRef.current);

        if (currentIdx !== -1 && lastIdx !== -1) {
          const start = Math.min(currentIdx, lastIdx);
          const end = Math.max(currentIdx, lastIdx);
          const rangeIds = paginatedPosts.slice(start, end + 1).map((p) => p.id);

          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of rangeIds) {
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
            }
            return next;
          });
        }
      } else {
        // Normal click: toggle selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(postId)) {
            next.delete(postId);
          } else {
            next.add(postId);
          }
          return next;
        });
      }

      lastClickedIdRef.current = postId;
      setLastClickedId(postId);
    },
    [selectionMode, paginatedPosts]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedPosts.length) {
      // Deselect all on current page
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPosts.map((p) => p.id)));
    }
  }, [selectedIds.size, paginatedPosts]);

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setDeleteConfirmOpen(false);
    setLastClickedId(null);
    lastClickedIdRef.current = null;
    toast.success(`已删除 ${count} 篇笔记`);
  }, [selectedIds]);

  const handleBatchExport = useCallback(() => {
    const selectedPosts = posts.filter((p) => selectedIds.has(p.id));
    const exportData = selectedPosts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      tags: p.tags,
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      aiScore: p.aiScore,
      publishDate: p.publishDate,
      category: p.category,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xhs-posts-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${selectedPosts.length} 篇笔记`);
  }, [posts, selectedIds]);

  const handleBatchTag = useCallback(() => {
    const count = selectedIds.size;
    toast.success(`已为 ${count} 篇笔记添加标签`);
    setSelectedIds(new Set());
    setSelectionMode(false);
    setLastClickedId(null);
    lastClickedIdRef.current = null;
  }, [selectedIds]);

  // Bookmark toggle handler
  const toggleBookmark = useCallback((postId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        toast.success("已取消收藏");
      } else {
        next.add(postId);
        toast.success("已收藏");
      }
      return next;
    });
  }, []);

  // Schedule handlers
  const handleSchedulePost = useCallback(
    (data: Omit<ScheduledPost, "id">) => {
      if (editingScheduledPost) {
        // Update existing
        setScheduledPosts((prev) =>
          prev.map((sp) => (sp.id === editingScheduledPost.id ? { ...sp, ...data } : sp))
        );
        setEditingScheduledPost(null);
      } else {
        // Add new
        const newPost: ScheduledPost = {
          ...data,
          id: `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        setScheduledPosts((prev) => [...prev, newPost]);
      }
    },
    [editingScheduledPost]
  );

  const handleDeleteScheduledPost = useCallback((id: string) => {
    setScheduledPosts((prev) => prev.filter((sp) => sp.id !== id));
  }, []);

  const handleMarkPublished = useCallback((id: string) => {
    setScheduledPosts((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, status: "published" as ScheduleStatus } : sp))
    );
  }, []);

  const handleEditScheduledPost = useCallback((post: ScheduledPost) => {
    setEditingScheduledPost(post);
    setScheduleDialogOpen(true);
  }, []);

  // Schedule stats
  const scheduleStats = useMemo(() => {
    const pending = scheduledPosts.filter((sp) => sp.status === "pending").length;
    const published = scheduledPosts.filter((sp) => sp.status === "published").length;
    const draft = scheduledPosts.filter((sp) => sp.status === "draft").length;
    const today = scheduledPosts.filter((sp) => getDateGroupLabel(sp.scheduledDate) === "今天").length;
    return { pending, published, draft, today, total: scheduledPosts.length };
  }, [scheduledPosts]);

  if (loading && posts.length === 0 && drafts.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isInHub && sharedAccountData?.selectedAccountId && filterAccountId === sharedAccountData.selectedAccountId && posts.length === 0 && drafts.length === 0) {
    const selectedAccount = accounts.find((a) => a.id === sharedAccountData.selectedAccountId);
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={FileText}
          title="该账号暂无笔记"
          description={selectedAccount ? `「${selectedAccount.nickname || "未命名"}」还没有采集到笔记数据，请先采集数据` : "该账号还没有笔记数据"}
        />
      </div>
    );
  }

  if (posts.length === 0 && accounts.length === 0 && drafts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={FileText}
          title="还没有笔记数据"
          description="先添加小红书账号并采集数据，即可在此查看笔记内容"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header — compact when in hub */}
      <div className="flex items-center justify-between">
        <div>
          {!isInHub && <h2 className="text-xl font-bold tracking-tight">内容库</h2>}
          <p className={cn("text-muted-foreground", isInHub ? "text-xs" : "text-sm mt-0.5")}>
            {viewMode === "schedule"
              ? `排期管理 · ${scheduleStats.today}篇今天发布`
              : `${isInHub ? '' : '浏览和管理笔记 · '}共 ${filteredPosts.length + filteredDrafts.length} 篇`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "grid" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("grid")}
              title="网格视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "list" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("list")}
              title="列表视图"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "calendar" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("calendar")}
              title="日历视图"
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "schedule" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("schedule")}
              title="排期视图"
            >
              <CalendarClock className="w-3.5 h-3.5" />
            </Button>
          </div>
          {viewMode !== "schedule" && (
            <>
              <Button
                variant={selectionMode ? "default" : "ghost"}
                size="sm"
                onClick={toggleSelectionMode}
                className={cn(
                  "text-xs",
                  selectionMode ? "bg-xhs hover:bg-xhs-dark text-white" : "text-muted-foreground"
                )}
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                {selectionMode ? "取消批量" : "批量"}
              </Button>
              <Button
                variant={showFilters ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "text-xs",
                  showFilters ? "bg-xhs hover:bg-xhs-dark text-white" : "text-muted-foreground"
                )}
              >
                <Filter className="w-3.5 h-3.5 mr-1" />
                筛选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                className="text-xs text-muted-foreground"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                导出
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Schedule View */}
      {viewMode === "schedule" && (
        <div className="space-y-4 view-animate">
          {/* Schedule Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.pending}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">待发布</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.published}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">已发布</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.draft}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">草稿</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-xhs-light/60 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-xhs" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.total}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">全部排期</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Schedule Button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              按日期分组显示排期内容，拖拽调整发布时间
            </p>
            <Button
              size="sm"
              className="text-xs bg-xhs hover:bg-xhs-dark text-white"
              onClick={() => {
                setEditingScheduledPost(null);
                setScheduleDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              新建排期
            </Button>
          </div>

          {/* Schedule Timeline */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
              <ScheduleTimeline
                scheduledPosts={scheduledPosts}
                accounts={accounts}
                onEdit={handleEditScheduledPost}
                onDelete={handleDeleteScheduledPost}
                onMarkPublished={handleMarkPublished}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Note Type + Category Chips + Sort (hidden in schedule view) */}
      {viewMode !== "schedule" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索笔记标题、内容、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10 bg-white dark:bg-neutral-950"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {/* Sort dropdown */}
            <div className="relative">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-10 w-[120px] bg-white dark:bg-neutral-950 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note type filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {NOTE_TYPE_CHIPS.map((chip) => (
              <button
                key={chip.value}
                className={cn(
                  "shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 border",
                  noteTypeFilter === chip.value
                    ? "bg-xhs text-white border-xhs shadow-sm shadow-xhs/20"
                    : "bg-white dark:bg-neutral-900 text-muted-foreground border-border/60 hover:border-xhs/40 hover:text-xhs"
                )}
                onClick={() => setNoteTypeFilter(chip.value)}
              >
                {chip.label}
                {chip.value === "drafts" && filteredDrafts.length > 0 && (
                  <span className="ml-1 text-[10px] opacity-80">({filteredDrafts.length})</span>
                )}
                {chip.value === "posts" && filteredPosts.length > 0 && (
                  <span className="ml-1 text-[10px] opacity-80">({filteredPosts.length})</span>
                )}
                {chip.value === "all" && (
                  <span className="ml-1 text-[10px] opacity-80">({filteredPosts.length + filteredDrafts.length})</span>
                )}
              </button>
            ))}
            <div className="h-4 w-px bg-border/60" />
            {/* Category filter chips */}
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip}
                className={cn(
                  "shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 border",
                  categoryFilter === chip
                    ? "bg-xhs text-white border-xhs shadow-sm shadow-xhs/20"
                    : "bg-white dark:bg-neutral-900 text-muted-foreground border-border/60 hover:border-xhs/40 hover:text-xhs"
                )}
                onClick={() => setCategoryFilter(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters (hidden in schedule view) */}
      {viewMode !== "schedule" && showFilters && (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-3 space-y-3">
            {/* Account filter — hidden in hub mode since it's auto-filtered */}
            {!isInHub && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">账号</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={filterAccountId === "all" ? "default" : "outline"}
                  className={cn(
                    "h-7 text-xs",
                    filterAccountId === "all" ? "bg-xhs hover:bg-xhs-dark text-white" : "border-border"
                  )}
                  onClick={() => setFilterAccountId("all")}
                >
                  全部
                </Button>
                {accounts.map((acc) => (
                  <Button
                    key={acc.id}
                    size="sm"
                    variant={filterAccountId === acc.id ? "default" : "outline"}
                    className={cn(
                      "h-7 text-xs",
                      filterAccountId === acc.id ? "bg-xhs hover:bg-xhs-dark text-white" : "border-border"
                    )}
                    onClick={() => setFilterAccountId(acc.id)}
                  >
                    {acc.nickname || "未命名"}
                  </Button>
                ))}
              </div>
            </div>
            )}

            <Separator className="opacity-50" />

            {/* Sort options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">排序</span>
              <div className="flex flex-wrap gap-1.5">
                {sortOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={sortBy === opt.value ? "default" : "outline"}
                      className={cn(
                        "h-7 text-xs gap-1",
                        sortBy === opt.value
                          ? "bg-xhs hover:bg-xhs-dark text-white"
                          : "border-border"
                      )}
                      onClick={() => setSortBy(opt.value)}
                    >
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content area: Grid, List, or Calendar */}
      {viewMode === "calendar" ? (
        <div className="space-y-4 view-animate">
          <Card className="border border-border">
            <CardContent className="p-4">
              <ContentCalendar
                posts={displayPosts}
                drafts={displayDrafts}
                onPostClick={setSelectedPost}
                onDraftClick={setSelectedDraft}
                onDateClick={handleDateClick}
                currentMonth={currentMonth}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onToday={handleTodayMonth}
              />
            </CardContent>
          </Card>

          {/* Date Detail Panel */}
          {selectedDate && (
            <Card className="border border-border shadow-sm view-animate">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {formatDateDisplay(selectedDate)} 的内容
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selectedDatePosts.length + selectedDateDrafts.length} 篇
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedDate(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {selectedDatePosts.length === 0 && selectedDateDrafts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">该日期暂无内容</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {selectedDatePosts.map((post) => (
                      <button
                        key={post.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        onClick={() => openPostDetail(post)}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                          {post.coverUrl ? (
                            <img src={proxyXhsImage(post.coverUrl)} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-xhs/20 to-xhs/5">
                              <FileText className="w-4 h-4 text-xhs" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{post.title || "无标题"}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{formatNumber(post.likes)}</span>
                            <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{formatNumber(post.comments)}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-xhs-light/60 text-xhs/70 border-0">
                              笔记
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                    {selectedDateDrafts.map((draft) => (
                      <button
                        key={draft.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        onClick={() => setSelectedDraft(draft)}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-950/30 overflow-hidden shrink-0 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{draft.title || "无标题草稿"}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <DraftStatusBadge status={draft.status} />
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-0">
                              草稿
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : viewMode === "grid" ? (
        allDisplayItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="没有找到笔记"
            description={searchQuery ? "尝试修改搜索关键词" : noteTypeFilter === "drafts" ? "暂无草稿，在AI创作中保存草稿后即可查看" : "该账号暂无笔记数据"}
            className="py-8"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {paginatedItems.map((item, i) => (
                <div
                  key={item.type === "post" ? item.data.id : `draft-${item.data.id}`}
                  className="stagger-item relative"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {item.type === "post" ? (
                    <div
                      className={cn(
                        "relative transition-all duration-200 rounded-xl",
                        selectionMode && selectedIds.has(item.data.id) && "ring-2 ring-xhs scale-[1.02]",
                        selectionMode && !selectedIds.has(item.data.id) && "hover:ring-1 hover:ring-muted-foreground/30"
                      )}
                      onClick={(e) => handleCardClick(item.data, e)}
                    >
                      {selectionMode && (
                        <div className="absolute top-2 left-2 z-20 transition-all duration-200">
                          <Checkbox
                            checked={selectedIds.has(item.data.id)}
                            className={cn(
                              "h-5 w-5 rounded-md border-2 transition-all duration-200",
                              selectedIds.has(item.data.id)
                                ? "border-xhs bg-xhs text-white"
                                : "border-white/80 bg-black/40 backdrop-blur-sm hover:border-xhs/60"
                            )}
                          />
                        </div>
                      )}
                      <PostCard
                        post={item.data}
                        showActions={!selectionMode}
                        onQuickView={() => openPostDetail(item.data)}
                        onEditAction={() => {
                          openPostDetail(item.data);
                          setActiveTab("creator");
                        }}
                        onBookmarkToggle={() => toggleBookmark(item.data.id)}
                        isBookmarked={bookmarkedIds.has(item.data.id)}
                      />
                    </div>
                  ) : (
                    <DraftCard
                      draft={item.data}
                      onClick={() => setSelectedDraft(item.data)}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          currentPage === pageNum && "bg-xhs hover:bg-xhs-dark text-white"
                        )}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  共 {allDisplayItems.length} 篇
                </span>
              </div>
            )}
          </>
        )
      ) : viewMode === "list" ? (
        allDisplayItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="没有找到笔记"
            description={searchQuery ? "尝试修改搜索关键词" : noteTypeFilter === "drafts" ? "暂无草稿，在AI创作中保存草稿后即可查看" : "该账号暂无笔记数据"}
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {paginatedItems.map((item, i) => {
              if (item.type === "draft") {
                const draft = item.data;
                return (
                  <div
                    key={`draft-${draft.id}`}
                    className="stagger-item relative"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <Card
                      className="overflow-hidden hover:shadow-md transition-all duration-200 border-border/60 cursor-pointer"
                      onClick={() => setSelectedDraft(draft)}
                    >
                      <div className="flex">
                        {/* Thumbnail */}
                        <div className="w-28 sm:w-36 shrink-0 aspect-[4/3] bg-amber-100 dark:bg-amber-950/30 relative overflow-hidden flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">草稿</span>
                          </div>
                          <DraftStatusBadge status={draft.status} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                          <div>
                            {/* Title + Status */}
                            <div className="flex items-start gap-2 mb-1">
                              <h3 className="text-sm font-medium line-clamp-1 flex-1 min-w-0">
                                {draft.title || "无标题草稿"}
                              </h3>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] shrink-0 border-0 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                草稿
                              </Badge>
                            </div>

                            {/* Content excerpt */}
                            {draft.content && (
                              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed mb-2">
                                {draft.content.slice(0, 80)}{draft.content.length > 80 ? "..." : ""}
                              </p>
                            )}

                            {/* Tags */}
                            {draft.tags && draft.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {draft.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {draft.tags.length > 3 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                                    +{draft.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeDate(draft.createdAt)}
                            </span>
                            {draft.accountNickname && (
                              <span className="ml-auto truncate max-w-[80px]">{draft.accountNickname}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              }

              const post = item.data;
              const totalEng = post.likes + post.comments + post.collects;
              const readsCount = post.likes * 8 + post.comments * 15 + post.shares * 30;
              return (
                <div
                  key={post.id}
                  className={cn(
                    "stagger-item relative",
                    selectionMode && selectedIds.has(post.id) && "ring-2 ring-xhs rounded-xl",
                    selectionMode && !selectedIds.has(post.id) && "hover:ring-1 hover:ring-muted-foreground/30 rounded-xl"
                  )}
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={(e) => handleCardClick(post, e)}
                >
                  {selectionMode && (
                    <div className="absolute top-3 left-3 z-20">
                      <Checkbox
                        checked={selectedIds.has(post.id)}
                        className={cn(
                          "h-5 w-5 rounded-md border-2 transition-all duration-200",
                          selectedIds.has(post.id)
                            ? "border-xhs bg-xhs text-white"
                            : "border-white/80 bg-black/40 backdrop-blur-sm hover:border-xhs/60"
                        )}
                      />
                    </div>
                  )}
                  <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-border/60">
                    <div className="flex">
                      {/* Thumbnail */}
                      <div className="w-28 sm:w-36 shrink-0 aspect-[4/3] bg-muted relative overflow-hidden">
                        {post.coverUrl ? (
                          <img
                            src={proxyXhsImage(post.coverUrl)}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center bg-gradient-to-br",
                            (() => {
                              const cat = post.category || "";
                              const configs: Record<string, string> = {
                                "美食探店": "from-orange-400 via-amber-400 to-yellow-300",
                                "穿搭时尚": "from-pink-400 via-rose-400 to-pink-300",
                                "旅行攻略": "from-teal-400 via-cyan-400 to-sky-300",
                                "家居装修": "from-emerald-400 via-green-400 to-emerald-300",
                                "职场成长": "from-blue-500 via-indigo-500 to-blue-400",
                                "美妆护肤": "from-purple-400 via-pink-400 to-purple-300",
                              };
                              return configs[cat] || "from-xhs via-rose-400 to-pink-300";
                            })()
                          )}>
                            <span className="text-white/80 text-lg font-bold">{(post.title || "笔记").slice(0, 1)}</span>
                          </div>
                        )}
                        {/* AI Score badge */}
                        {post.aiScore > 0 && (
                          <div className="absolute top-1.5 right-1.5">
                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-white/90" />
                              {post.aiScore.toFixed(0)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        <div>
                          {/* Title + Category */}
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="text-sm font-medium line-clamp-1 flex-1 min-w-0">
                              {post.title || "无标题"}
                            </h3>
                            {post.category && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] shrink-0 border-0 bg-xhs-light/60 text-xhs/80">
                                {post.category}
                              </Badge>
                            )}
                          </div>

                          {/* Content excerpt */}
                          {post.content && (
                            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed mb-2">
                              {post.content.slice(0, 80)}{post.content.length > 80 ? "..." : ""}
                            </p>
                          )}

                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {post.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-xhs-light/60 text-xhs/80 font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                                  +{post.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            <span className="font-medium">{formatNumber(post.likes)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span className="font-medium">{formatNumber(post.comments)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Bookmark className="w-3 h-3" />
                            <span className="font-medium">{formatNumber(post.collects)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span className="font-medium">{formatNumber(readsCount)}</span>
                          </span>
                          {totalEng > 10000 && (
                            <span className="text-[10px] font-bold text-xhs">🔥 爆款</span>
                          )}
                          <span className="ml-auto flex items-center gap-1 text-[10px]">
                            <Clock className="w-2.5 h-2.5" />
                            {post.publishDate ? formatRelativeDate(post.publishDate) : post.scrapedAt ? formatRelativeDate(post.scrapedAt) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}

            {/* Pagination for list view */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          currentPage === pageNum && "bg-xhs hover:bg-xhs-dark text-white"
                        )}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  共 {allDisplayItems.length} 篇
                </span>
              </div>
            )}
          </div>
        )
      ) : null}

      {/* Post Detail Modal */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(open) => { if (!open) { setSelectedPost(null); setPostComments([]); } }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {selectedPost && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-left text-lg">
                  {selectedPost.title || "无标题"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4">
                {/* Engagement stats with labels */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20">
                    <Heart className="w-4 h-4 text-red-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.likes)}</span>
                    <span className="text-[10px] text-muted-foreground">点赞</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                    <MessageCircle className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.comments)}</span>
                    <span className="text-[10px] text-muted-foreground">评论</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                    <Bookmark className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.collects)}</span>
                    <span className="text-[10px] text-muted-foreground">收藏</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20">
                    <Share2 className="w-4 h-4 text-rose-400 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.shares)}</span>
                    <span className="text-[10px] text-muted-foreground">分享</span>
                  </div>
                </div>

                {/* AI Score */}
                {selectedPost.aiScore > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/0 dark:from-amber-950/20 dark:to-transparent border border-amber-200/50 dark:border-amber-900/30">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AI评分</p>
                      <p className="text-sm font-bold">{selectedPost.aiScore.toFixed(0)} 分</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />
                      标签
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs border-0 bg-xhs-light/60 text-xhs/80 hover:bg-xhs-light">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Content */}
                {selectedPost.content && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      正文内容
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedPost.content}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {selectedPost.aiAnalysis && (
                  <div className="bg-xhs-light/30 rounded-xl p-4 border border-xhs/10">
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-xhs" />
                      AI 分析
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {selectedPost.aiAnalysis}
                    </p>
                  </div>
                )}

                {/* Images */}
                {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      图片（{selectedPost.imageUrls.length}张）
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPost.imageUrls.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(url, '_blank')}>
                          <img
                            src={proxyXhsImage(url)}
                            alt={`图片 ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {selectedPost.videoUrl && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Play className="w-3 h-3" />
                      视频
                    </p>
                    <div className="rounded-xl overflow-hidden bg-black">
                      <video
                        src={proxyXhsImage(selectedPost.videoUrl)}
                        controls
                        className="w-full max-h-[400px]"
                        preload="metadata"
                      />
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  {selectedPost.publishDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedPost.publishDate.slice(0, 10)}
                    </span>
                  )}
                  {selectedPost.category && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {selectedPost.category}
                    </span>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MessageCircle className="w-3 h-3" />
                    评论（{selectedPost.comments}）
                  </p>
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-xhs rounded-full animate-spin" />
                      <span className="ml-2 text-xs text-muted-foreground">加载评论中...</span>
                    </div>
                  ) : postComments.length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="flex gap-2.5 group">
                          <div className="w-7 h-7 rounded-full bg-muted overflow-hidden shrink-0 mt-0.5">
                            {comment.userAvatar ? (
                              <img
                                src={proxyXhsImage(comment.userAvatar)}
                                alt={comment.userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-muted-foreground bg-xhs-light/40">
                                {(comment.userName || "用").slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground/90">{comment.userName || "匿名用户"}</span>
                              {comment.commentDate && (
                                <span className="text-[10px] text-muted-foreground/60">{comment.commentDate}</span>
                              )}
                            </div>
                            <p className="text-xs text-foreground/80 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                                <Heart className="w-2.5 h-2.5" />
                                {comment.likes > 0 ? comment.likes : ""}
                              </span>
                              {comment.subCommentCount > 0 && (
                                <span className="text-[10px] text-muted-foreground/60">
                                  {comment.subCommentCount}条回复
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MessageCircle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground/60">
                        {selectedPost.comments > 0 ? "评论数据采集中，请重新采集获取" : "暂无评论"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Action Footer */}
              <DialogFooter className="flex-row gap-2 sm:justify-between border-t border-border/50 pt-4 shrink-0 -mx-6 px-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-border"
                  onClick={() => {
                    setSelectedPost(null);
                    setActiveTab("creator");
                  }}
                >
                  <PenLine className="w-3.5 h-3.5 mr-1" />
                  参考创作
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={handleCopyContent}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    {copied ? "已复制" : "复制内容"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePost(selectedPost.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    删除
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Draft Detail Dialog */}
      <Dialog
        open={!!selectedDraft}
        onOpenChange={(open) => !open && setSelectedDraft(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {selectedDraft && (
            <>
              <DialogHeader className="shrink-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-left text-lg">
                    {selectedDraft.title || "无标题草稿"}
                  </DialogTitle>
                  <DraftStatusBadge status={selectedDraft.status} />
                </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
                <div className="space-y-4">
                  {/* Tags */}
                  {selectedDraft.tags && selectedDraft.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        标签
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDraft.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs border-0 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-950/50">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDraft.tags && selectedDraft.tags.length > 0 && <Separator />}

                  {/* Content */}
                  {selectedDraft.content && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                        正文内容
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedDraft.content}
                      </p>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {selectedDraft.aiSuggestions && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-900/30">
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        AI 建议
                      </p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {selectedDraft.aiSuggestions}
                      </p>
                    </div>
                  )}

                  {/* Cover Prompt */}
                  {selectedDraft.coverPrompt && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Palette className="w-3 h-3" />
                        封面提示词
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedDraft.coverPrompt}
                      </p>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      创建于 {formatRelativeDate(selectedDraft.createdAt)}
                    </span>
                    {selectedDraft.updatedAt !== selectedDraft.createdAt && (
                      <span className="flex items-center gap-1">
                        · 更新于 {formatRelativeDate(selectedDraft.updatedAt)}
                      </span>
                    )}
                    {selectedDraft.accountNickname && (
                      <span className="flex items-center gap-1">
                        · {selectedDraft.accountNickname}
                      </span>
                    )}
                    {selectedDraft.aiModel && (
                      <span className="flex items-center gap-1">
                        · {selectedDraft.aiModel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <DialogFooter className="flex-row gap-2 sm:justify-between border-t border-border/50 pt-4 shrink-0 -mx-6 px-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-border"
                  onClick={() => {
                    setSelectedDraft(null);
                    setCreatorSheetOpen(true);
                  }}
                >
                  <PenLine className="w-3.5 h-3.5 mr-1" />
                  在创作中编辑
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={handleCopyDraftContent}
                  >
                    {draftCopied ? (
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    {draftCopied ? "已复制" : "复制内容"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteDraft(selectedDraft.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    删除草稿
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Post Dialog - key forces remount on editingPost change */}
      <SchedulePostDialog
        key={editingScheduledPost?.id ?? "new"}
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setEditingScheduledPost(null);
        }}
        posts={posts}
        accounts={accounts}
        onSchedule={handleSchedulePost}
        editingPost={editingScheduledPost}
      />

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 篇笔记吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)} className="text-xs">
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleBatchDelete}
              className="text-xs bg-destructive hover:bg-destructive/90 text-white"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              确认删除 ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-950/80 border border-border/60 rounded-2xl shadow-lg shadow-black/10 px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium">
              已选 <span className="text-xhs font-bold">{selectedIds.size}</span> 篇
            </span>
            <div className="h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              批量删除
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover:bg-muted"
              onClick={handleBatchExport}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              批量导出
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover:bg-muted"
              onClick={handleBatchTag}
            >
              <Tag className="w-3.5 h-3.5 mr-1" />
              批量打标签
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedIds(new Set());
                setLastClickedId(null);
                lastClickedIdRef.current = null;
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Batch Select All Bar (when in selection mode but nothing selected) */}
      {selectionMode && selectedIds.size === 0 && (viewMode === "grid" || viewMode === "list") && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-950/80 border border-border/60 rounded-2xl shadow-lg shadow-black/10 px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">点击卡片选择，或</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-xhs/40 text-xhs hover:bg-xhs-light/30"
              onClick={handleSelectAll}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              全选当前页
            </Button>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  );
}
