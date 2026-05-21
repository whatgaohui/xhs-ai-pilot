"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  UserCircle,
  FileText,
  Theater,
  Sparkles,
  Settings,
  Plus,
  Download,
  Sun,
  Moon,
  Search,
  PenLine,
} from "lucide-react";
import { useTheme } from "next-themes";

/** Command action definition */
interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  category: "navigation" | "action" | "toggle";
  action: () => void;
}

/** Kbd styled element for keyboard shortcuts */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { setActiveTab, setAddAccountDialogOpen, commandPaletteOpen: open, setCommandPaletteOpen: setOpen } = useAppStore();
  const { setTheme, theme } = useTheme();

  /** Build the list of available actions */
  const getActions = useCallback((): CommandAction[] => {
    const store = useAppStore.getState();
    return [
      // Navigation (5 items aligned with v3.1 architecture)
      { id: "nav-dashboard", label: "前往仪表盘", description: "查看运营数据概览", icon: LayoutDashboard, shortcut: "⌘1", category: "navigation", action: () => setActiveTab("dashboard") },
      { id: "nav-account-hub", label: "前往账号中心", description: "账号 / 笔记 / 人设 工作台", icon: UserCircle, shortcut: "⌘2", category: "navigation", action: () => setActiveTab("account-hub") },
      { id: "nav-analytics", label: "前往数据洞察", description: "深度趋势报告", icon: FileText, shortcut: "⌘3", category: "navigation", action: () => setActiveTab("analytics") },
      { id: "nav-library", label: "前往素材管理", description: "图片 / 视频 / 文字素材库", icon: FileText, shortcut: "⌘4", category: "navigation", action: () => setActiveTab("library") },
      { id: "nav-settings", label: "前往设置", description: "AI 模型与应用偏好", icon: Settings, shortcut: "⌘5", category: "navigation", action: () => setActiveTab("settings") },
      // Sub-tab jumps inside account-hub
      { id: "nav-notes", label: "笔记管理", description: "查看 / 创作笔记", icon: FileText, category: "navigation", action: () => { setActiveTab("account-hub"); store.setAccountHubTab("notes"); } },
      { id: "nav-persona", label: "人设管理", description: "AI 人设模板", icon: Theater, category: "navigation", action: () => { setActiveTab("account-hub"); store.setAccountHubTab("persona"); } },
      // Actions
      { id: "action-create", label: "AI 创作笔记", description: "AI 生成小红书笔记", icon: PenLine, shortcut: "⌘N", category: "action", action: () => { setActiveTab("account-hub"); store.setAccountHubTab("notes"); store.setCreatorSheetOpen(true); } },
      { id: "action-add-account", label: "添加账号", description: "添加新的小红书账号", icon: Plus, category: "action", action: () => setAddAccountDialogOpen(true) },
      { id: "action-export", label: "导出数据", description: "导出所有运营数据为JSON", icon: Download, shortcut: "⌘E", category: "action", action: () => {
        window.dispatchEvent(new CustomEvent("xhs-export"));
      }},
      // Toggles
      { id: "toggle-theme", label: theme === "dark" ? "切换到亮色模式" : "切换到暗色模式", description: "切换应用主题外观", icon: theme === "dark" ? Sun : Moon, category: "toggle", action: () => setTheme(theme === "dark" ? "light" : "dark") },
    ];
  }, [setActiveTab, setAddAccountDialogOpen, setTheme, theme]);

  const allActions = getActions();

  /** Filter actions by search query */
  const filteredActions = query.trim()
    ? allActions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(query.toLowerCase()))
      )
    : allActions;

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Listen for Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!useAppStore.getState().commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay to let dialog animation finish
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector("[data-selected='true']");
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  /** Handle keyboard navigation inside the palette */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = filteredActions[selectedIndex];
      if (action) {
        action.action();
        setOpen(false);
      }
    }
  };

  /** Group filtered actions by category */
  const groupedActions: { category: CommandAction["category"]; label: string; actions: CommandAction[] }[] = [];
  const categories: { key: CommandAction["category"]; label: string }[] = [
    { key: "navigation", label: "导航" },
    { key: "action", label: "操作" },
    { key: "toggle", label: "切换" },
  ];
  for (const cat of categories) {
    const catActions = filteredActions.filter((a) => a.category === cat.key);
    if (catActions.length > 0) {
      groupedActions.push({ category: cat.key, label: cat.label, actions: catActions });
    }
  }

  // Compute flat index offset for grouped rendering
  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden top-[20%] translate-y-0 backdrop-blur-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令或搜索..."
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 h-11 text-sm"
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Action List */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto custom-scrollbar p-2"
        >
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              没有找到匹配的命令
            </div>
          ) : (
            groupedActions.map((group) => {
              const groupStartIndex = flatIndex;
              const items = group.actions.map((action, i) => {
                const idx = groupStartIndex + i;
                const Icon = action.icon;
                const isSelected = idx === selectedIndex;
                flatIndex++;
                return (
                  <div
                    key={action.id}
                    data-selected={isSelected}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-100",
                      isSelected
                        ? "bg-xhs/10 text-foreground"
                        : "text-foreground hover:bg-muted/60"
                    )}
                    onClick={() => {
                      action.action();
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-xhs/15 text-xhs"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{action.label}</p>
                      {action.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{action.description}</p>
                      )}
                    </div>
                    {action.shortcut && (
                      <div className="shrink-0">
                        <Kbd>{action.shortcut.replace("⌘", "")}</Kbd>
                      </div>
                    )}
                  </div>
                );
              });

              flatIndex = groupStartIndex + group.actions.length;

              return (
                <div key={group.category} className="mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    {group.label}
                  </p>
                  {items}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd><Kbd>↓</Kbd> 导航
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> 执行
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> 关闭
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
