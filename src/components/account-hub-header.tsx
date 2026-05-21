"use client";

/**
 * AccountHubHeader — Shared account header visible across all hub tabs
 *
 * Features:
 * - Account selector dropdown (single source of truth)
 * - 4 metric cards (粉丝/获赞/笔记/关注) always visible
 * - Account avatar + nickname + bio display + 小红书主页链接
 * - Quick actions (同步笔记, 添加账号, 编辑账号, Cookie管理, + 新建笔记)
 * - Delete account with confirmation dialog
 * - Sticky below topbar
 */

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { AccountStats, AccountDataState } from "@/hooks/use-account-data";
import {
  Users,
  Heart,
  FileText,
  UserPlus,
  RefreshCw,
  Pencil,
  Plus,
  Loader2,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  PenLine,
  Cookie,
  ExternalLink,
  Download,
  UserCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

interface AccountHubHeaderProps {
  /** Account data from the shared hook */
  accountData: AccountDataState;
  /** Callback to open creator sheet */
  onCreateNote: () => void;
  /** Callback to open edit account dialog */
  onEditAccount: () => void;
  /** Callback to trigger scrape/refresh (sync notes) */
  onRefreshData: () => void;
  /** Callback to delete account */
  onDeleteAccount: () => void;
  /** Callback to open manual data dialog */
  onManualData: () => void;
  /** Callback to open edit account dialog focused on cookie section */
  onEditCookies: () => void;
  /** Callback to open add account dialog */
  onAddAccount: () => void;
  /** Whether a scrape is in progress */
  isScraping?: boolean;
  /** Whether an account delete is in progress */
  isDeleting?: boolean;
}

// ─── Stat Card Component ───────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "card-hover transition-all duration-200 border-border/50",
        onClick && "cursor-pointer hover:border-xhs/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-sm",
              color
            )}
          >
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm md:text-lg font-bold tracking-tight truncate">
              {value}
            </p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function AccountHubHeader({
  accountData,
  onCreateNote,
  onEditAccount,
  onRefreshData,
  onDeleteAccount,
  onManualData,
  onEditCookies,
  onAddAccount,
  isScraping = false,
  isDeleting = false,
}: AccountHubHeaderProps) {
  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const {
    accounts,
    selectedAccount,
    selectedAccountId,
    setSelectedAccountId,
    loading,
    formattedStats,
    engagementRate,
  } = accountData;

  // ─── Status Indicator ────────────────────────────────────────────────

  const getStatusDot = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-emerald-500";
      case "partial":
        return "bg-amber-500";
      case "scraping":
        return "bg-rose-500 animate-pulse";
      case "error":
        return "bg-red-500";
      default:
        return "bg-muted-foreground/30";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "success":
        return "已同步";
      case "partial":
        return "部分采集";
      case "scraping":
        return "采集中";
      case "error":
        return "采集异常";
      default:
        return "待采集";
    }
  };

  // Check if account has stored cookies
  const hasCookies = !!(selectedAccount?.cookies);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-md px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-muted/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0 || !selectedAccount) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-md">
        {/* ─── Account Info Row ──────────────────────────────────────── */}
        <div className="px-4 md:px-6 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Avatar + Info + Account Selector */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar with status indicator */}
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12 md:w-14 md:h-14 ring-2 ring-xhs/10">
                  <AvatarImage
                    src={selectedAccount.avatarUrl}
                    alt={selectedAccount.nickname}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-xhs-light to-xhs-light/50 text-xhs text-lg font-medium">
                    {(selectedAccount.nickname || "用户").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background",
                        getStatusDot(selectedAccount.status)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {getStatusLabel(selectedAccount.status)}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Name + Bio + Selector */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base md:text-lg font-bold truncate">
                    {selectedAccount.nickname || "未命名用户"}
                  </h3>
                  {/* 小红书主页跳转链接 */}
                  {selectedAccount.xhsUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={selectedAccount.xhsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:text-xhs hover:bg-xhs-light/30 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>访问小红书主页</TooltipContent>
                    </Tooltip>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] border-0 shrink-0",
                      selectedAccount.status === "success"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : selectedAccount.status === "partial"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {getStatusLabel(selectedAccount.status)}
                  </Badge>
                </div>
                {selectedAccount.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {selectedAccount.bio}
                  </p>
                )}

                {/* Account Selector Dropdown (inline, compact) */}
                {accounts.length > 1 && (
                  <div className="mt-1.5">
                    <Select
                      value={selectedAccountId || ""}
                      onValueChange={setSelectedAccountId}
                    >
                      <SelectTrigger className="h-7 w-auto min-w-[140px] max-w-[220px] text-xs border-border/50 bg-muted/30 hover:bg-muted/50">
                        <SelectValue placeholder="切换账号" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage
                                  src={acc.avatarUrl}
                                  alt={acc.nickname}
                                />
                                <AvatarFallback className="bg-xhs-light text-xhs text-[8px]">
                                  {(acc.nickname || "用").slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {acc.nickname || "未命名用户"}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {acc.followers > 0
                                  ? `${formattedStats.followers}粉丝`
                                  : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "border-border text-xs hidden sm:inline-flex",
                      !hasCookies && "border-amber-300 dark:border-amber-700"
                    )}
                    onClick={onRefreshData}
                    disabled={isScraping}
                  >
                    {isScraping ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    同步笔记
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasCookies
                    ? "从小红书平台同步该账号的最新笔记"
                    : "同步需要 Cookie，请先添加 Cookie"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-xs hidden md:inline-flex"
                    onClick={onEditCookies}
                  >
                    <Cookie className="w-3.5 h-3.5 mr-1" />
                    Cookie
                    {hasCookies ? (
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasCookies ? "管理已存储的 Cookie" : "添加 Cookie 以启用数据刷新"}
                </TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                variant="outline"
                className="border-border text-xs hidden md:inline-flex"
                onClick={onAddAccount}
              >
                <UserCircle className="w-3.5 h-3.5 mr-1" />
                添加账号
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border text-xs hidden md:inline-flex"
                onClick={onEditAccount}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                编辑
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-xhs to-xhs-dark text-white border-0 text-xs shadow-sm shadow-xhs/20"
                onClick={onCreateNote}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                新建笔记
              </Button>
              {/* More actions dropdown for mobile & extra options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onRefreshData} disabled={isScraping}>
                    <Download
                      className={cn(
                        "w-4 h-4 mr-2",
                        isScraping && "animate-spin"
                      )}
                    />
                    同步笔记
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddAccount}>
                    <UserCircle className="w-4 h-4 mr-2" />
                    添加账号
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEditCookies}>
                    <Cookie className="w-4 h-4 mr-2" />
                    Cookie 管理
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEditAccount}>
                    <Pencil className="w-4 h-4 mr-2" />
                    编辑账号
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onManualData}>
                    <PenLine className="w-4 h-4 mr-2" />
                    手动补充
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除账号
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ─── Delete Confirmation Dialog ───────────────────────────── */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除账号</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除账号「{selectedAccount.nickname || "未命名用户"}」吗？
                该账号下的所有笔记、人设和草稿数据将被永久删除，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteAccount();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Stats Row ─────────────────────────────────────────────── */}
        <div className="px-4 md:px-6 pb-3">
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            <StatCard
              icon={Users}
              label="粉丝"
              value={formattedStats.followers}
              color="stat-icon-gradient-rose"
            />
            <StatCard
              icon={Heart}
              label="获赞与收藏"
              value={formattedStats.likedCollected}
              color="stat-icon-gradient-xhs"
            />
            <StatCard
              icon={FileText}
              label="笔记"
              value={formattedStats.notesCount}
              color="stat-icon-gradient-emerald"
            />
            <StatCard
              icon={UserPlus}
              label="关注"
              value={formattedStats.following}
              color="stat-icon-gradient-amber"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
