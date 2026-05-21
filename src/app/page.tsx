"use client";

import { useEffect, lazy, Suspense } from "react";
import { useAppStore } from "@/store/app-store";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";

// Dynamic imports for large view components — reduces peak compilation memory
const DashboardView = lazy(() =>
  import("@/components/views/dashboard-view").then((m) => ({
    default: m.DashboardView,
  }))
);
const AccountHubView = lazy(() =>
  import("@/components/views/account-hub-view").then((m) => ({
    default: m.AccountHubView,
  }))
);
const AnalyticsView = lazy(() =>
  import("@/components/views/analytics-view").then((m) => ({
    default: m.AnalyticsView,
  }))
);
const LibraryView = lazy(() =>
  import("@/components/views/library-view").then((m) => ({
    default: m.LibraryView,
  }))
);
const SettingsView = lazy(() =>
  import("@/components/views/settings-view").then((m) => ({
    default: m.SettingsView,
  }))
);

// Legacy fallbacks
const AccountView = lazy(() =>
  import("@/components/views/account-view").then((m) => ({
    default: m.AccountView,
  }))
);
const ContentView = lazy(() =>
  import("@/components/views/content-view").then((m) => ({
    default: m.ContentView,
  }))
);
const PersonaView = lazy(() =>
  import("@/components/views/persona-view").then((m) => ({
    default: m.PersonaView,
  }))
);
const CreatorView = lazy(() =>
  import("@/components/views/creator-view").then((m) => ({
    default: m.CreatorView,
  }))
);

/** Full-page loading skeleton shown while a view chunk loads */
function ViewSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ExportHandler() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const handleExport = async () => {
      try {
        const res = await fetch("/api/export", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          const dateStr = new Date().toISOString().slice(0, 10);
          const filename = `xhs-data-export-${dateStr}.json`;
          const blob = new Blob([JSON.stringify(data.data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("数据导出成功！");
          addNotification({
            type: "export",
            title: "数据导出完成",
            message: `已导出 ${data.data.accounts?.length || 0} 个账号的数据`,
            navigateTo: "dashboard",
          });
        } else {
          toast.error(data.error || "导出失败");
        }
      } catch {
        toast.error("网络错误，请重试");
      }
    };

    window.addEventListener("xhs-export", handleExport);
    return () => window.removeEventListener("xhs-export", handleExport);
  }, [addNotification]);

  return null;
}

export default function Home() {
  const { activeTab } = useAppStore();

  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "account-hub":
        return <AccountHubView />;
      case "analytics":
        return <AnalyticsView />;
      case "library":
        return <LibraryView />;
      case "settings":
        return <SettingsView />;
      // Legacy fallbacks (old tab ids redirect to account-hub via store)
      case "account" as never:
        return <AccountView />;
      case "content" as never:
        return <ContentView />;
      case "persona" as never:
        return <PersonaView />;
      case "creator" as never:
        return <CreatorView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Right side: Topbar + content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<ViewSkeleton />}>
            {renderView()}
          </Suspense>
        </main>
      </div>

      {/* Global overlays and handlers */}
      <AddAccountDialog />
      <CommandPalette />
      <KeyboardShortcuts />
      <ExportHandler />
    </div>
  );
}
