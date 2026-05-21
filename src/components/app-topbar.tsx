"use client";

import { useTheme } from "next-themes";
import { useAppStore } from "@/store/app-store";
import {
  Moon,
  Sun,
  Search,
  Sparkles,
  Command as CommandIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const tabLabels: Record<string, { title: string; subtitle: string; emoji?: string }> = {
  dashboard: { title: "仪表盘", subtitle: "运营数据一览", emoji: "📊" },
  "account-hub": { title: "账号中心", subtitle: "账号 · 笔记 · 人设", emoji: "👤" },
  analytics: { title: "数据洞察", subtitle: "深度趋势报告", emoji: "📈" },
  library: { title: "素材管理", subtitle: "图片 · 视频 · 文字", emoji: "📁" },
  settings: { title: "设置", subtitle: "AI 模型与偏好", emoji: "⚙️" },
  // Legacy
  account: { title: "账号中心", subtitle: "账号 · 笔记 · 人设", emoji: "👤" },
  content: { title: "账号中心 · 笔记管理", subtitle: "笔记列表与调度", emoji: "📝" },
  persona: { title: "账号中心 · 人设管理", subtitle: "品牌调性配置", emoji: "🎭" },
  creator: { title: "AI 创作", subtitle: "智能写作工坊", emoji: "✨" },
};

export function AppTopbar() {
  const { activeTab, setCommandPaletteOpen: setPaletteOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted] = useState(true);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    () => false
  );

  const meta = tabLabels[activeTab] ?? tabLabels.dashboard;

  return (
    <header
      className={cn(
        "h-14 shrink-0 sticky top-0 z-20",
        "border-b border-border/60",
        "bg-background/70 backdrop-blur-xl",
        "flex items-center justify-between gap-4 px-4 md:px-6"
      )}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">StudioRed</span>
          <ChevronRight className="w-3 h-3 hidden sm:inline" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {meta.emoji && (
            <span className="text-base hidden sm:inline" aria-hidden>
              {meta.emoji}
            </span>
          )}
          <h2 className="text-sm font-semibold truncate">{meta.title}</h2>
          <span className="text-xs text-muted-foreground hidden md:inline truncate">
            · {meta.subtitle}
          </span>
        </div>
      </div>

      {/* Center: command palette trigger */}
      <button
        onClick={() => setPaletteOpen(true)}
        className={cn(
          "hidden md:flex items-center gap-2.5 flex-1 max-w-md",
          "h-9 px-3 rounded-lg",
          "bg-muted/50 hover:bg-muted/80",
          "border border-border/60 hover:border-border",
          "text-sm text-muted-foreground hover:text-foreground",
          "transition-all group"
        )}
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">搜索功能、账号、笔记...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-medium bg-background/80 border border-border/80 text-muted-foreground">
          {isMac ? (
            <>
              <CommandIcon className="w-2.5 h-2.5" />K
            </>
          ) : (
            <>Ctrl K</>
          )}
        </kbd>
      </button>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick AI create button — open Creator sheet (works on any page) */}
        <Button
          size="sm"
          className={cn(
            "hidden lg:inline-flex h-8 px-3 gap-1.5",
            "btn-gradient-brand text-white border-0 text-xs font-semibold rounded-lg"
          )}
          onClick={() => {
            useAppStore.getState().setActiveTab("account-hub");
            useAppStore.getState().setAccountHubTab("notes");
            useAppStore.getState().setCreatorSheetOpen(true);
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 创作
        </Button>

        {/* Mobile search */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="搜索"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="切换主题"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* User avatar (placeholder) */}
        <div className="ml-1 relative">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold shadow-md shadow-rose-500/20 cursor-pointer hover:scale-105 transition-transform">
            U
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>
      </div>
    </header>
  );
}