"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Star,
  Clock,
  Eye,
  Pencil,
  Utensils,
  Shirt,
  Plane,
  Home,
  Briefcase,
  Sparkles,
  FileText,
  BookOpen,
} from "lucide-react";
import type { XhsPostInfo } from "@/types";

interface PostCardProps {
  post: XhsPostInfo & { accountNickname?: string; accountAvatar?: string };
  onClick?: () => void;
  className?: string;
  /** Show hover action buttons on cover */
  showActions?: boolean;
  /** Called when quick view action is clicked */
  onQuickView?: () => void;
  /** Called when edit action is clicked */
  onEditAction?: () => void;
  /** Called when bookmark action is clicked */
  onBookmarkToggle?: () => void;
  /** Whether the post is bookmarked */
  isBookmarked?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function formatDate(dateStr: string): string {
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

// ─── Category Config ─────────────────────────────────────────────────────

type CategoryKey =
  | "美食探店"
  | "穿搭时尚"
  | "旅行攻略"
  | "家居装修"
  | "职场成长"
  | "美妆护肤";

interface CategoryConfig {
  gradient: string;
  icon: typeof Utensils;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  tagBg: string;
  tagText: string;
}

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  美食探店: {
    gradient: "from-orange-400 via-amber-400 to-yellow-300",
    icon: Utensils,
    iconColor: "text-white/90",
    badgeBg: "bg-orange-500/70",
    badgeText: "text-white",
    tagBg: "bg-orange-100 dark:bg-orange-950/30",
    tagText: "text-orange-700 dark:text-orange-300",
  },
  穿搭时尚: {
    gradient: "from-pink-400 via-rose-400 to-pink-300",
    icon: Shirt,
    iconColor: "text-white/90",
    badgeBg: "bg-pink-500/70",
    badgeText: "text-white",
    tagBg: "bg-pink-100 dark:bg-pink-950/30",
    tagText: "text-pink-700 dark:text-pink-300",
  },
  旅行攻略: {
    gradient: "from-teal-400 via-cyan-400 to-sky-300",
    icon: Plane,
    iconColor: "text-white/90",
    badgeBg: "bg-teal-500/70",
    badgeText: "text-white",
    tagBg: "bg-teal-100 dark:bg-teal-950/30",
    tagText: "text-teal-700 dark:text-teal-300",
  },
  家居装修: {
    gradient: "from-emerald-400 via-green-400 to-emerald-300",
    icon: Home,
    iconColor: "text-white/90",
    badgeBg: "bg-emerald-500/70",
    badgeText: "text-white",
    tagBg: "bg-emerald-100 dark:bg-emerald-950/30",
    tagText: "text-emerald-700 dark:text-emerald-300",
  },
  职场成长: {
    gradient: "from-blue-500 via-indigo-500 to-blue-400",
    icon: Briefcase,
    iconColor: "text-white/90",
    badgeBg: "bg-indigo-500/70",
    badgeText: "text-white",
    tagBg: "bg-indigo-100 dark:bg-indigo-950/30",
    tagText: "text-indigo-700 dark:text-indigo-300",
  },
  美妆护肤: {
    gradient: "from-purple-400 via-pink-400 to-purple-300",
    icon: Sparkles,
    iconColor: "text-white/90",
    badgeBg: "bg-purple-500/70",
    badgeText: "text-white",
    tagBg: "bg-purple-100 dark:bg-purple-950/30",
    tagText: "text-purple-700 dark:text-purple-300",
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  gradient: "from-xhs via-rose-400 to-pink-300",
  icon: FileText,
  iconColor: "text-white/90",
  badgeBg: "bg-xhs/70",
  badgeText: "text-white",
  tagBg: "bg-xhs-light/60",
  tagText: "text-xhs/80 dark:text-xhs-300",
};

function getCategoryConfig(category: string): CategoryConfig {
  if (category in CATEGORY_CONFIG) {
    return CATEGORY_CONFIG[category as CategoryKey];
  }
  return DEFAULT_CONFIG;
}

// ─── PostCard Component ───────────────────────────────────────────────────

export function PostCard({
  post,
  onClick,
  className,
  showActions = true,
  onQuickView,
  onEditAction,
  onBookmarkToggle,
  isBookmarked = false,
}: PostCardProps) {
  // Calculate engagement score for visual indicator
  const totalEngagement = post.likes + post.comments + post.collects;
  const engagementLevel = totalEngagement > 10000 ? "hot" : totalEngagement > 1000 ? "warm" : "normal";

  const catConfig = getCategoryConfig(post.category || "");
  const CategoryIcon = catConfig.icon;

  // Generate a pseudo-random reads count based on likes (simulated)
  const readsCount = post.likes * 8 + post.comments * 15 + post.shares * 30;

  return (
    <Card
      className={cn(
        "cursor-pointer card-glow overflow-hidden group active:scale-[0.97] transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      {/* Cover image area */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {post.coverUrl ? (
          <>
            <img
              src={post.coverUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Bottom overlay gradient for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center bg-gradient-to-br",
            catConfig.gradient
          )}>
            <div className="flex flex-col items-center gap-2">
              <CategoryIcon className={cn("w-10 h-10", catConfig.iconColor)} />
              <span className="text-[10px] text-white/70 font-medium">
                {post.category || "笔记"}
              </span>
            </div>
          </div>
        )}

        {/* Category badge on cover (top-left corner) */}
        {post.category && (
          <div className={cn(
            "absolute top-2 left-2 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
            catConfig.badgeBg,
            catConfig.badgeText
          )}>
            <CategoryIcon className="w-2.5 h-2.5" />
            {post.category}
          </div>
        )}

        {/* Top-right badges row */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {/* AI Score badge with golden glow */}
          {post.aiScore > 0 && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-[3px] group-hover:blur-[5px] transition-all" />
              <div className="relative bg-gradient-to-r from-amber-500 to-yellow-400 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-white/90" />
                {post.aiScore.toFixed(0)}
              </div>
            </div>
          )}
          {/* Engagement level indicator */}
          {engagementLevel === "hot" && (
            <div className="bg-xhs/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              🔥 爆款
            </div>
          )}
          {engagementLevel === "warm" && (
            <div className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              📈 热门
            </div>
          )}
        </div>

        {/* Hover-reveal action buttons (vertical stack on right side) */}
        {showActions && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            {/* Quick view */}
            <button
              className="w-7 h-7 rounded-full backdrop-blur-md bg-white/25 dark:bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView?.();
              }}
              title="预览"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {/* Edit */}
            <button
              className="w-7 h-7 rounded-full backdrop-blur-md bg-white/25 dark:bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEditAction?.();
              }}
              title="编辑"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {/* Bookmark */}
            <button
              className={cn(
                "w-7 h-7 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-colors",
                isBookmarked
                  ? "bg-amber-500/60 text-white border-amber-400/40"
                  : "bg-white/25 dark:bg-white/15 text-white hover:bg-white/40"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onBookmarkToggle?.();
              }}
              title={isBookmarked ? "取消收藏" : "收藏"}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isBookmarked && "fill-white")} />
            </button>
          </div>
        )}

        {/* Bottom gradient overlay with date */}
        {post.publishDate && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pt-6 pb-2 px-2.5">
            <div className="flex items-center gap-1 text-white/90">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-medium">{formatDate(post.publishDate)}</span>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">
          {post.title || "无标题"}
        </h3>

        {/* Content excerpt */}
        {post.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
            {post.content.slice(0, 50)}{post.content.length > 50 ? "..." : ""}
          </p>
        )}

        {/* Tags - pill-shaped with category color */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center",
                  catConfig.tagBg,
                  catConfig.tagText
                )}
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                +{post.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Divider between tags and stats */}
        <div className="border-t border-border/40" />

        {/* Engagement stats row with icon + number pairs */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
            <Heart className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.likes)}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.comments)}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-amber-500 transition-colors">
            <Bookmark className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.collects)}</span>
          </span>
          {/* Reads count */}
          <span className="flex items-center gap-1 ml-auto hover:text-blue-500 transition-colors">
            <BookOpen className="w-3 h-3" />
            <span className="font-medium">{formatNumber(readsCount)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
