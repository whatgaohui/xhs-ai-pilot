"use client";

/**
 * AccountHubView — 账号中心 (v4.1 Deep Integration)
 *
 * Unified workspace combining 3 tabs with shared account context:
 *   - 账号概览  (AccountView)  原"账号分析"页
 *   - 笔记管理  (ContentView)  原"内容库"页，"+ 新建笔记"打开 CreatorView Sheet
 *   - 人设管理  (PersonaView)  原"人设管理"页
 *
 * Key improvements over v3.1:
 *   - Shared AccountHeader visible across all tabs (avatar, stats, selector)
 *   - Shared account data via useAccountData hook (single fetch)
 *   - Cross-tab navigation (overview → notes → persona)
 *   - CreatorView Sheet pre-fills account context
 *   - Child views accept shared data as props to avoid duplicate fetches
 */

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import { useAccountData } from "@/hooks/use-account-data";
import { AccountHubHeader } from "@/components/account-hub-header";
import { AccountView } from "@/components/views/account-view";
import { ContentView } from "@/components/views/content-view";
import { PersonaView } from "@/components/views/persona-view";
import { CreatorView } from "@/components/views/creator-view";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { CookieInputDialog } from "@/components/cookie-input-dialog";
import { ManualDataDialog } from "@/components/manual-data-dialog";
import { cn } from "@/lib/utils";
import { proxyXhsImage } from "@/lib/media-url";
import { toast } from "sonner";
import {
  LayoutGrid,
  FileText,
  Theater,
  Users,
  Plus,
  Sparkles,
} from "lucide-react";

// ─── Context for sharing account data with child views ──────────────────

import { createContext, useContext } from "react";
import type { AccountDataState } from "@/hooks/use-account-data";

const AccountHubContext = createContext<AccountDataState | null>(null);

export function useAccountHubContext() {
  const ctx = useContext(AccountHubContext);
  return ctx;
}

// ─── Main Component ────────────────────────────────────────────────────

export function AccountHubView() {
  const {
    accountHubTab,
    setAccountHubTab,
    creatorSheetOpen,
    setCreatorSheetOpen,
    addAccountDialogOpen,
    setAddAccountDialogOpen,
  } = useAppStore();

  // Shared account data hook
  const accountData = useAccountData();

  // Dialog state for the shared header actions
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editFocusCookies, setEditFocusCookies] = useState(false);

  // ─── Header Action Handlers ──────────────────────────────────────────

  const handleRefreshData = useCallback(async () => {
    if (!accountData.selectedAccountId) return;
    setScraping(true);
    try {
      const selectedAccount = accountData.selectedAccount;
      const body: { cookies?: string } = {};
      // If no stored cookies, prompt the user
      if (!selectedAccount?.cookies) {
        toast.error("请先添加 Cookie 才能同步笔记");
        setScraping(false);
        setEditFocusCookies(true);
        setEditDialogOpen(true);
        return;
      }
      body.cookies = selectedAccount.cookies;
      const res = await fetch(
        `/api/accounts/${accountData.selectedAccountId}/scrape`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (data.success) {
        await accountData.refreshAccounts();
        await accountData.refreshAnalysis();
        const postsSynced = data.data?.postsSynced || 0;
        const postsFound = data.data?.postsFound || 0;
        const commentsSynced = data.data?.commentsSynced || 0;
        toast.success(`同步完成：发现 ${postsFound} 篇笔记，已同步 ${postsSynced} 篇，评论 ${commentsSynced} 条`);
      } else {
        toast.error(data.error || "同步失败");
      }
    } catch {
      toast.error("同步失败");
    } finally {
      setScraping(false);
    }
  }, [accountData]);

  const handleEditAccount = useCallback(() => {
    setEditFocusCookies(false);
    setEditDialogOpen(true);
  }, []);

  const handleEditCookies = useCallback(() => {
    setEditFocusCookies(true);
    setEditDialogOpen(true);
  }, []);

  const handleCreateNote = useCallback(() => {
    setCreatorSheetOpen(true);
  }, [setCreatorSheetOpen]);

  const handleAddAccount = useCallback(() => {
    setAddAccountDialogOpen(true);
  }, [setAddAccountDialogOpen]);

  const handleDeleteAccount = useCallback(async () => {
    if (!accountData.selectedAccountId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${accountData.selectedAccountId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("账号已删除");
        accountData.setSelectedAccountId(null);
        await accountData.refreshAccounts();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  }, [accountData]);

  const handleManualData = useCallback(() => {
    setManualDialogOpen(true);
  }, []);

  const handleScrapeDialogSuccess = useCallback(async () => {
    if (accountData.selectedAccountId) {
      await accountData.refreshAccounts();
      await accountData.refreshAnalysis();
    }
  }, [accountData]);

  const handleEditSuccess = useCallback(async () => {
    if (accountData.selectedAccountId) {
      await accountData.refreshAccounts();
      await accountData.refreshAnalysis();
    }
  }, [accountData]);

  // ─── Render ──────────────────────────────────────────────────────────

  const selectedAccount = accountData.selectedAccount;

  return (
    <AccountHubContext.Provider value={accountData}>
      <div className="h-full flex flex-col overflow-hidden view-animate">
        {/* Shared Account Header — always visible */}
        <AccountHubHeader
          accountData={accountData}
          onCreateNote={handleCreateNote}
          onEditAccount={handleEditAccount}
          onRefreshData={handleRefreshData}
          onDeleteAccount={handleDeleteAccount}
          onManualData={handleManualData}
          onEditCookies={handleEditCookies}
          onAddAccount={handleAddAccount}
          isScraping={scraping}
          isDeleting={deleting}
        />

        {/* Empty state when no accounts exist — show ONLY this, no tabs */}
        {accountData.accounts.length === 0 && !accountData.loading ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              icon={Users}
              title="还没有添加账号"
              description="添加你的第一个小红书账号，开始数据分析"
              actionLabel="添加账号"
              onAction={() => setAddAccountDialogOpen(true)}
              demoLabel="加载演示数据"
              onDemoAction={async () => {
                try {
                  const res = await fetch("/api/demo/seed", {
                    method: "POST",
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("演示数据加载成功！");
                    await accountData.refreshAccounts();
                  } else {
                    toast.error(data.error || "加载演示数据失败");
                  }
                } catch {
                  toast.error("网络错误，请重试");
                }
              }}
            />
          </div>
        ) : (
          <Tabs
            value={accountHubTab}
            onValueChange={(v) =>
              setAccountHubTab(v as "overview" | "notes" | "persona")
            }
            className="h-full flex flex-col overflow-hidden"
          >
            {/* Tab triggers — modern pill-style tab bar */}
            <div className="shrink-0 px-4 md:px-6 py-2.5 bg-muted/30">
              <TabsList className="h-9 bg-background rounded-lg shadow-sm border border-border/40 gap-0.5 p-0.5">
                <TabsTrigger
                  value="overview"
                  className={cn(
                    "h-8 px-3.5 gap-1.5 rounded-md text-xs font-medium transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-xhs data-[state=active]:to-rose-500",
                    "data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  概览
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className={cn(
                    "h-8 px-3.5 gap-1.5 rounded-md text-xs font-medium transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-xhs data-[state=active]:to-rose-500",
                    "data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  笔记
                </TabsTrigger>
                <TabsTrigger
                  value="persona"
                  className={cn(
                    "h-8 px-3.5 gap-1.5 rounded-md text-xs font-medium transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-xhs data-[state=active]:to-rose-500",
                    "data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Theater className="w-3.5 h-3.5" />
                  人设
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab content — each scrolls independently */}
            <TabsContent
              value="overview"
              className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
            >
              <AccountView
                sharedAccountData={accountData}
                onNavigateToNotes={() => setAccountHubTab("notes")}
                onOpenCreator={handleCreateNote}
              />
            </TabsContent>

            <TabsContent
              value="notes"
              className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
            >
              <ContentView
                sharedAccountData={accountData}
                onOpenCreator={handleCreateNote}
              />
            </TabsContent>

            <TabsContent
              value="persona"
              className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
            >
              <PersonaView
                sharedAccountData={accountData}
                onOpenCreator={handleCreateNote}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* AI Creator Sheet — opened by "+ 新建笔记" button anywhere */}
        <Sheet open={creatorSheetOpen} onOpenChange={setCreatorSheetOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[800px] p-0 flex flex-col"
          >
            <SheetHeader className="px-6 py-4 border-b border-border/60 shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                AI 创作笔记
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                选择主题、风格，AI 帮你生成爆款笔记
                {selectedAccount && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] border-0 bg-xhs-light/50 text-xhs"
                  >
                    为 {selectedAccount.nickname || "未命名"} 创作
                  </Badge>
                )}
              </SheetDescription>
            </SheetHeader>
            {/* Context bar showing which account the note is being created for */}
            {selectedAccount && (
              <div className="px-6 py-2.5 bg-muted/30 border-b border-border/40 flex items-center gap-2.5">
                <Avatar className="w-6 h-6">
                  <AvatarImage
                    src={proxyXhsImage(selectedAccount.avatarUrl)}
                    alt={selectedAccount.nickname}
                  />
                  <AvatarFallback className="bg-xhs-light text-xhs text-[8px]">
                    {(selectedAccount.nickname || "用").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  正在为{" "}
                  <span className="font-medium text-foreground">
                    {selectedAccount.nickname || "未命名用户"}
                  </span>{" "}
                  创建笔记
                </span>
                {selectedAccount.status === "success" && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] border-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                  >
                    已同步
                  </Badge>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <CreatorView sharedAccountData={accountData} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit Account Dialog (shared from header) */}
        <EditAccountDialog
          account={selectedAccount || null}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
          focusCookies={editFocusCookies}
          onDelete={handleDeleteAccount}
        />

        {/* Cookie Input / Scrape Dialog (shared from header) */}
        {selectedAccount && (
          <CookieInputDialog
            open={scrapeDialogOpen}
            onOpenChange={setScrapeDialogOpen}
            accountUrl={selectedAccount.xhsUrl}
            accountId={selectedAccount.id}
            onSuccess={handleScrapeDialogSuccess}
          />
        )}

        {/* Manual Data Dialog (shared from header) */}
        {selectedAccount && (
          <ManualDataDialog
            open={manualDialogOpen}
            onOpenChange={setManualDialogOpen}
            accountId={selectedAccount.id}
            existingData={selectedAccount as unknown as Record<string, unknown>}
            onSuccess={() => { handleScrapeDialogSuccess(); }}
          />
        )}
      </div>
    </AccountHubContext.Provider>
  );
}
