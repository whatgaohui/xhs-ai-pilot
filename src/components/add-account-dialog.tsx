"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Cookie,
  Link2,
  Info,
  ChevronRight,
  Lock,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo } from "@/types";
import { cn } from "@/lib/utils";

type Step = "input" | "scraping" | "done";

export function AddAccountDialog() {
  const { addAccountDialogOpen, setAddAccountDialogOpen } = useAppStore();
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);

  // Result state
  const [result, setResult] = useState<{
    nickname?: string;
    followers?: number;
    notesCount?: number;
    partial?: boolean;
    warnings?: string[];
    error?: string;
  } | null>(null);

  function validateUrl(u: string): boolean {
    return (
      u.includes("xiaohongshu.com/user/profile/") || u.includes("xhslink.com/")
    );
  }

  function validateCookies(c: string): boolean {
    // Sanity check: must contain web_session or a1 (key XHS cookies)
    return (
      c.includes("web_session=") ||
      c.includes("a1=") ||
      c.includes("webId=")
    );
  }

  async function handleSubmit() {
    if (!url.trim()) {
      toast.error("请填写小红书主页链接");
      return;
    }
    if (!validateUrl(url)) {
      toast.error("链接格式不正确，需包含 /user/profile/");
      return;
    }
    if (!cookies.trim()) {
      toast.error("请粘贴小红书 Cookie（必填）");
      return;
    }
    if (!validateCookies(cookies)) {
      toast.error("Cookie 看起来不对，应包含 web_session=、a1= 等字段");
      return;
    }

    setLoading(true);
    setStep("scraping");
    setResult(null);

    try {
      // Step 1: create the account
      const createRes = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xhsUrl: url.trim(), cookies: cookies.trim() }),
      });
      const createData = await createRes.json();
      if (!createData.success) {
        toast.error(createData.error || "添加账号失败");
        setStep("input");
        return;
      }
      const account = createData.data as XhsAccountInfo;

      // Step 2: scrape with cookies
      const scrapeRes = await fetch(`/api/accounts/${account.id}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: cookies.trim() }),
      });
      const scrapeData = await scrapeRes.json();

      if (scrapeData.success) {
        const data = scrapeData.data;
        // Save cookies to the account record after successful scrape
        try {
          await fetch(`/api/accounts/${account.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookies: cookies.trim() }),
          });
        } catch {
          // Non-critical: cookie save failure shouldn't block the flow
        }
        setResult({
          nickname: data.account?.nickname,
          followers: data.account?.followers,
          notesCount: data.postsFound,
          partial: data.partialData,
          warnings: data.warnings,
        });
        if (data.partialData) {
          toast.warning("⚠️ 部分数据采集不完整");
        } else {
          toast.success(`✅ 成功采集 ${data.postsFound || 0} 篇笔记`);
        }
      } else {
        setResult({ error: scrapeData.error || "采集失败" });
        toast.error(scrapeData.error || "采集失败");
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "网络错误" });
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
      setStep("done");
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      // Reset all state on close
      setUrl("");
      setCookies("");
      setResult(null);
      setStep("input");
    }
    setAddAccountDialogOpen(open);
  }

  function handleAddAnother() {
    setUrl("");
    setCookies("");
    setResult(null);
    setStep("input");
  }

  return (
    <Dialog open={addAccountDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">📌</span>
            添加小红书账号
          </DialogTitle>
          <DialogDescription>
            填写主页链接 + 浏览器 Cookie，一键采集账号数据与笔记
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable middle content */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
        {/* ─── STEP: input ───────────────────────────────────────── */}
        {step === "input" && (
          <div className="space-y-4 py-2">
            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="xhs-url" className="flex items-center gap-1.5 text-sm">
                <Link2 className="w-3.5 h-3.5" />
                小红书主页链接 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="xhs-url"
                placeholder="https://www.xiaohongshu.com/user/profile/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="font-mono text-xs"
              />
            </div>

            {/* Cookie */}
            <div className="space-y-1.5">
              <Label htmlFor="xhs-cookies" className="flex items-center gap-1.5 text-sm">
                <Cookie className="w-3.5 h-3.5" />
                Cookie <span className="text-rose-500">*</span>
                <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> 仅本地存储
                </span>
              </Label>
              <Textarea
                id="xhs-cookies"
                placeholder="粘贴完整 Cookie，例如：&#10;abRequestId=...; a1=...; web_session=...; webBuild=...;"
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                disabled={loading}
                rows={4}
                className="font-mono text-[11px] resize-none"
              />
            </div>

            {/* How-to */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-rose-500" />
                如何获取 Cookie （30 秒）
              </p>
              <ol className="space-y-1 ml-1 text-muted-foreground list-decimal list-inside">
                <li>浏览器打开 <span className="font-mono">xiaohongshu.com</span> 并登录</li>
                <li>按 <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">F12</kbd> 打开开发者工具</li>
                <li>切到 <span className="font-semibold">Application</span> → <span className="font-semibold">Cookies</span> → <span className="font-mono">https://www.xiaohongshu.com</span></li>
                <li>全选所有行 → 复制 → 粘贴到上方</li>
              </ol>
              <p className="text-[10px] text-muted-foreground/80 pt-1">
                💡 Cookie 含登录态，本应用仅本地使用，不会上传到任何服务器
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP: scraping (loading) ──────────────────────────── */}
        {step === "scraping" && (
          <div className="py-8 space-y-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
            <p className="text-sm font-medium">正在采集账号信息...</p>
            <p className="text-xs text-muted-foreground">
              通常需要 3-10 秒，请稍候
            </p>
          </div>
        )}

        {/* ─── STEP: done ────────────────────────────────────────── */}
        {step === "done" && result && (
          <div className="py-4">
            {result.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  采集失败
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 break-all">
                  {result.error}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  常见原因：Cookie 失效 / 账号已被限制 / 微服务未启动（port 3002）
                </p>
              </div>
            ) : (
              <div className={cn(
                "rounded-lg border p-4 space-y-3",
                result.partial
                  ? "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/40"
                  : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/40"
              )}>
                <div className={cn(
                  "flex items-center gap-2 font-semibold",
                  result.partial
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-emerald-700 dark:text-emerald-300"
                )}>
                  {result.partial ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {result.partial ? "部分采集成功" : "采集成功！"}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">昵称</div>
                    <div className="text-sm font-bold truncate mt-0.5">
                      {result.nickname || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">粉丝</div>
                    <div className="text-sm font-bold mt-0.5">
                      {(result.followers ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">笔记</div>
                    <div className="text-sm font-bold mt-0.5">
                      {result.notesCount ?? 0}
                    </div>
                  </div>
                </div>
                {result.warnings && result.warnings.length > 0 && (
                  <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-current/10 pt-2 mt-2">
                    {result.warnings.slice(0, 3).map((w, i) => (
                      <p key={i}>⚠️ {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        </div>
        {/* End scrollable content */}

        {/* ─── Footer (always visible) ─────────────────────────── */}
        <DialogFooter className="gap-2 shrink-0 border-t border-border/40 pt-4 -mx-6 px-6">
          {step === "input" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !url.trim() || !cookies.trim()}
                className="btn-gradient-brand text-white border-0 gap-1.5"
              >
                开始采集
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              <Button
                variant="outline"
                onClick={handleAddAnother}
              >
                继续添加
              </Button>
              <Button
                onClick={() => handleClose(false)}
                className="btn-gradient-brand text-white border-0"
              >
                完成
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}