"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNotificationStore, type NotificationCategory, type Notification } from "@/store/notification-store";
import { useAppStore } from "@/store/app-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  FileText,
  RefreshCw,
  Sparkles,
  Trash2,
  Download,
  Info,
  X,
  Settings,
  BarChart3,
  Zap,
  CheckCheck,
} from "lucide-react";

/* ─── Category Config ────────────────────────────────────────────────── */

const categories: { key: NotificationCategory; label: string; icon: typeof Bell }[] = [
  { key: "all", label: "全部", icon: Bell },
  { key: "system", label: "系统", icon: Settings },
  { key: "data", label: "数据", icon: BarChart3 },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "export", label: "导出", icon: Download },
];

/* ─── Type Config (icon + colors) ─────────────────────────────────────── */

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string; darkBg: string; borderColor: string }> = {
  scrape: {
    icon: RefreshCw,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50",
    darkBg: "dark:bg-emerald-950/40",
    borderColor: "border-l-emerald-500",
  },
  analysis: {
    icon: Sparkles,
    color: "text-xhs dark:text-xhs-300",
    bg: "bg-xhs-light",
    darkBg: "dark:bg-xhs-950/30",
    borderColor: "border-l-xhs",
  },
  draft: {
    icon: FileText,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950/40",
    borderColor: "border-l-amber-500",
  },
  export: {
    icon: Download,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50",
    darkBg: "dark:bg-sky-950/40",
    borderColor: "border-l-sky-500",
  },
  delete: {
    icon: Trash2,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-950/40",
    borderColor: "border-l-red-500",
  },
  info: {
    icon: Info,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50",
    darkBg: "dark:bg-slate-800/40",
    borderColor: "border-l-slate-400",
  },
};

/* ─── Time Helpers ─────────────────────────────────────────────────────── */

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

type TimeGroup = "today" | "yesterday" | "earlier";

function getTimeGroup(timestamp: number): TimeGroup {
  const now = new Date();
  const notifDate = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (notifDate >= today) return "today";
  if (notifDate >= yesterday) return "yesterday";
  return "earlier";
}

const timeGroupLabels: Record<TimeGroup, string> = {
  today: "今天",
  yesterday: "昨天",
  earlier: "更早",
};

/* ─── Grouped Notifications ──────────────────────────────────────────── */

function groupNotificationsByTime(notifications: Notification[]): Record<TimeGroup, Notification[]> {
  const groups: Record<TimeGroup, Notification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const notif of notifications) {
    groups[getTimeGroup(notif.timestamp)].push(notif);
  }
  return groups;
}

/* ─── Counter Badge Animation ────────────────────────────────────────── */

function AnimatedCounter({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span
      key={count}
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-xhs text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 notif-badge-bounce"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ─── Notification Item ──────────────────────────────────────────────── */

function NotificationItem({
  notif,
  onRead,
  onDelete,
  onNavigate,
  index,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string, navigateTo?: string, accountId?: string) => void;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const config = typeConfig[notif.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 transition-all duration-200 cursor-pointer group",
        "border-l-[3px] border-l-transparent",
        !notif.read && config.borderColor,
        !notif.read && "bg-muted/30 dark:bg-muted/20",
        "hover:bg-muted/50 dark:hover:bg-muted/30",
        "notif-item-enter"
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={() => onNavigate(notif.id, notif.navigateTo, notif.accountId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", config.bg, config.darkBg)}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm leading-snug", !notif.read && "font-semibold")}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0 notif-unread-dot" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {formatTimeAgo(notif.timestamp)}
        </p>
      </div>

      {/* Delete button on hover */}
      <button
        className={cn(
          "shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        aria-label="删除通知"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export function NotificationCenter() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount,
    categoryCount,
  } = useNotificationStore();
  const { setActiveTab, setSelectedAccountId } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [open, setOpen] = useState(false);

  const unread = unreadCount();

  const handleNotificationClick = useCallback(
    (id: string, navigateTo?: string, accountId?: string) => {
      markAsRead(id);
      if (navigateTo) {
        setActiveTab(
          navigateTo as
            | "dashboard"
            | "account-hub"
            | "analytics"
            | "library"
            | "settings"
        );
      }
      if (accountId) {
        setSelectedAccountId(accountId);
      }
      setOpen(false);
    },
    [markAsRead, setActiveTab, setSelectedAccountId]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id);
    },
    [deleteNotification]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  // Filter notifications by active category
  const filteredNotifications =
    activeCategory === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeCategory);

  // Group by time
  const grouped = groupNotificationsByTime(filteredNotifications);

  const hasNotifications = filteredNotifications.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-muted/80 btn-press"
        >
          <Bell className="w-4.5 h-4.5" />
          <AnimatedCounter count={unread} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 border border-border shadow-xl notif-panel-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">通知中心</h3>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-xhs hover:text-xhs-dark h-7 px-2 btn-press"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                全部已读
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive h-7 px-2 btn-press"
                onClick={handleClearAll}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                清空
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto">
          {categories.map((cat) => {
            const count = categoryCount(cat.key);
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                className={cn(
                  "relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 btn-press whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-gradient-brand text-white shadow-sm shadow-rose-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                onClick={() => setActiveCategory(cat.key)}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="leading-none">{cat.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0",
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[400px]">
          {!hasNotifications ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">
                {activeCategory === "all" ? "暂无通知" : `暂无${categories.find((c) => c.key === activeCategory)?.label}通知`}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                有新消息时会在这里提醒你
              </p>
            </div>
          ) : (
            <div>
              {(["today", "yesterday", "earlier"] as TimeGroup[]).map((group) => {
                const items = grouped[group];
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    {/* Time Group Header */}
                    <div className="px-4 py-1.5 bg-muted/15 border-b border-border/30">
                      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                        {timeGroupLabels[group]}
                      </span>
                    </div>
                    {/* Notification Items */}
                    <div className="divide-y divide-border/30">
                      {items.map((notif, idx) => (
                        <NotificationItem
                          key={notif.id}
                          notif={notif}
                          onRead={markAsRead}
                          onDelete={handleDelete}
                          onNavigate={handleNotificationClick}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {hasNotifications && (
          <div className="px-4 py-2 border-t border-border/50 bg-muted/10">
            <p className="text-[11px] text-muted-foreground/50 text-center">
              共 {filteredNotifications.length} 条通知{unread > 0 ? `，${unread} 条未读` : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
