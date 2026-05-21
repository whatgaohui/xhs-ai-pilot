"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FolderOpen,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationCenter } from "@/components/notification-center";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type NavId = "dashboard" | "account-hub" | "analytics" | "library" | "settings";

const navItems: { id: NavId; label: string; icon: typeof LayoutDashboard; hint?: string }[] = [
  { id: "dashboard", label: "仪表盘", icon: LayoutDashboard, hint: "总览" },
  { id: "account-hub", label: "账号中心", icon: Users, hint: "运营工作台" },
  { id: "analytics", label: "数据洞察", icon: BarChart3, hint: "趋势报告" },
  { id: "library", label: "素材管理", icon: FolderOpen, hint: "图片/视频" },
];

export function AppSidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 z-30",
          "border-r border-border/60",
          "bg-sidebar/80 backdrop-blur-xl",
          "transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 h-16 border-b border-border/40 shrink-0",
          collapsed ? "px-4 justify-center" : "px-5"
        )}>
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-rose-500/25">
              <span className="text-white font-bold text-sm tracking-tighter">红</span>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-brand blur-md opacity-40 -z-10" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold leading-tight tracking-tight gradient-text-brand truncate">
                  StudioRed
                </h1>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
                  AI · 小红书运营
                </p>
              </div>
              <NotificationCenter />
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 py-4 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2 mt-1">
              工作台
            </p>
          )}
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const button = (
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg text-sm font-medium",
                  "nav-item-v3 nav-item-hover active:scale-[0.98]",
                  collapsed ? "h-10 justify-center" : "px-3 h-10",
                  isActive
                    ? "nav-item-v3-active"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] shrink-0 transition-all", isActive && "drop-shadow-sm")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        {item.hint}
                      </span>
                    )}
                  </>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return <div key={item.id}>{button}</div>;
          })}
        </nav>

        {/* Settings */}
        <div className={cn("border-t border-border/40 py-3", collapsed ? "px-2" : "px-3")}>
          {(() => {
            const isActive = activeTab === "settings";
            const button = (
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg text-sm font-medium",
                  "nav-item-v3 nav-item-hover active:scale-[0.98]",
                  collapsed ? "h-10 justify-center" : "px-3 h-10",
                  isActive
                    ? "nav-item-v3-active"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Settings className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 text-left">设置</span>}
              </button>
            );
            return collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">设置</TooltipContent>
              </Tooltip>
            ) : button;
          })()}
        </div>

        {/* Footer: version + collapse button */}
        <div className={cn(
          "border-t border-border/40 flex items-center",
          collapsed ? "px-2 py-3 justify-center" : "px-4 py-3 justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">v3.0</span>
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 font-semibold">
                Beta
              </Badge>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? "展开" : "收起"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg min-w-[56px] active:scale-[0.95] transition-all",
                isActive ? "text-rose-500" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                isActive && "bg-gradient-brand-soft"
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}