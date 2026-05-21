"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Cookie,
  Search,
  PenLine,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Globe,
  FileText,
  Cpu,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";

interface CookieInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountUrl: string;
  accountId: string;
  onSuccess: () => void;
}

type ScrapeMethod = "cookie" | "search" | "manual" | null;
type DialogStep = "method" | "input" | "progress" | "result";

interface ScrapeProgressStep {
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export function CookieInputDialog({
  open,
  onOpenChange,
  accountUrl,
  accountId,
  onSuccess,
}: CookieInputDialogProps) {
  const [method, setMethod] = useState<ScrapeMethod>(null);
  const [step, setStep] = useState<DialogStep>("method");
  const [cookieValue, setCookieValue] = useState("");
  const [cookieValidated, setCookieValidated] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);

  // Manual input fields
  const [manualNickname, setManualNickname] = useState("");
  const [manualFollowers, setManualFollowers] = useState("");
  const [manualFollowing, setManualFollowing] = useState("");
  const [manualLikedCollected, setManualLikedCollected] = useState("");
  const [manualNotesCount, setManualNotesCount] = useState("");
  const [manualBio, setManualBio] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  // Progress
  const [progressSteps, setProgressSteps] = useState<ScrapeProgressStep[]>([
    { label: "连接小红书", status: "pending" },
    { label: "获取账号信息", status: "pending" },
    { label: "获取笔记列表", status: "pending" },
    { label: "AI分析中", status: "pending" },
  ]);

  // Result
  const [resultData, setResultData] = useState<{
    nickname: string;
    avatarUrl: string;
    postsFound: number;
    scrapeMethod: string;
    warnings: string[];
  } | null>(null);

  const [scrapeSubmitting, setScrapeSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setMethod(null);
    setStep("method");
    setCookieValue("");
    setCookieValidated(null);
    setValidating(false);
    setManualNickname("");
    setManualFollowers("");
    setManualFollowing("");
    setManualLikedCollected("");
    setManualNotesCount("");
    setManualBio("");
    setManualSaving(false);
    setProgressSteps([
      { label: "连接小红书", status: "pending" },
      { label: "获取账号信息", status: "pending" },
      { label: "获取笔记列表", status: "pending" },
      { label: "AI分析中", status: "pending" },
    ]);
    setResultData(null);
    setScrapeSubmitting(false);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleValidateCookie = async () => {
    if (!cookieValue.trim()) return;
    setValidating(true);
    setCookieValidated(null);

    // Simulate validation: check if cookie contains typical XHS fields
    await new Promise((r) => setTimeout(r, 1200));

    const hasXhsCookieFields =
      cookieValue.includes("web_session") ||
      cookieValue.includes("xhs") ||
      cookieValue.includes("a1") ||
      cookieValue.length > 50;

    setCookieValidated(hasXhsCookieFields);
    setValidating(false);

    if (hasXhsCookieFields) {
      toast.success("Cookie验证通过");
    } else {
      toast.error("Cookie格式似乎不正确，请检查后重试");
    }
  };

  const simulateProgress = async () => {
    const delays = [800, 1200, 1500, 1000];
    const newSteps = [...progressSteps];

    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i] = { ...newSteps[i], status: "active" };
      setProgressSteps([...newSteps]);
      await new Promise((r) => setTimeout(r, delays[i]));
      newSteps[i] = { ...newSteps[i], status: "done" };
      setProgressSteps([...newSteps]);
    }
  };

  const handleStartCookieScrape = async () => {
    setScrapeSubmitting(true);
    setStep("progress");
    simulateProgress();

    try {
      const res = await fetch(`/api/accounts/${accountId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: cookieValue, method: "cookie" }),
      });
      const data = await res.json();

      if (data.success) {
        setResultData({
          nickname: data.data?.account?.nickname || "小红书用户",
          avatarUrl: data.data?.account?.avatarUrl || "",
          postsFound: data.data?.postsFound || 0,
          scrapeMethod: "Cookie采集",
          warnings: data.data?.warnings || [],
        });
        setStep("result");
        toast.success("采集完成");
      } else {
        toast.error(data.error || "采集失败");
        setStep("input");
      }
    } catch {
      toast.error("网络错误，请重试");
      setStep("input");
    } finally {
      setScrapeSubmitting(false);
    }
  };

  const handleStartSearchScrape = async () => {
    setScrapeSubmitting(true);
    setStep("progress");
    simulateProgress();

    try {
      const res = await fetch(`/api/accounts/${accountId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "search" }),
      });
      const data = await res.json();

      if (data.success) {
        setResultData({
          nickname: data.data?.account?.nickname || "小红书用户",
          avatarUrl: data.data?.account?.avatarUrl || "",
          postsFound: data.data?.postsFound || 0,
          scrapeMethod: "搜索采集",
          warnings: data.data?.warnings || [],
        });
        setStep("result");
        toast.success("采集完成");
      } else {
        toast.error(data.error || "采集失败");
        setStep("input");
      }
    } catch {
      toast.error("网络错误，请重试");
      setStep("input");
    } finally {
      setScrapeSubmitting(false);
    }
  };

  const handleManualSave = async () => {
    setManualSaving(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: manualNickname,
          followers: Number(manualFollowers) || 0,
          following: Number(manualFollowing) || 0,
          likedCollected: Number(manualLikedCollected) || 0,
          notesCount: Number(manualNotesCount) || 0,
          bio: manualBio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("手动数据已保存");
        onSuccess();
        handleOpenChange(false);
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setManualSaving(false);
    }
  };

  // ─── Step 1: Method Selection ──────────────────────────────────────
  const renderMethodStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">选择采集方式以获取小红书账号数据</p>
      <div className="space-y-3">
        {/* Cookie采集 */}
        <button
          type="button"
          onClick={() => setMethod("cookie")}
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
            method === "cookie"
              ? "border-xhs bg-xhs-light/20 dark:bg-xhs/10 ring-1 ring-xhs/30"
              : "border-border/60 hover:border-xhs/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              method === "cookie"
                ? "bg-xhs text-white"
                : "bg-muted text-muted-foreground"
            )}>
              <Cookie className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Cookie采集</p>
                <Badge variant="secondary" className="text-[10px] bg-xhs-light text-xhs border-0">
                  推荐
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                使用浏览器Cookie直接获取数据，最完整最准确
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              method === "cookie" ? "border-xhs bg-xhs" : "border-muted-foreground/30"
            )}>
              {method === "cookie" && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
          </div>
        </button>

        {/* 搜索采集 */}
        <button
          type="button"
          onClick={() => setMethod("search")}
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
            method === "search"
              ? "border-xhs bg-xhs-light/20 dark:bg-xhs/10 ring-1 ring-xhs/30"
              : "border-border/60 hover:border-xhs/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              method === "search"
                ? "bg-xhs text-white"
                : "bg-muted text-muted-foreground"
            )}>
              <Search className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">搜索采集</p>
              <p className="text-xs text-muted-foreground mt-1">
                通过搜索引擎获取公开数据，无需Cookie但数据可能不完整
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              method === "search" ? "border-xhs bg-xhs" : "border-muted-foreground/30"
            )}>
              {method === "search" && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
          </div>
        </button>

        {/* 手动输入 */}
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
            method === "manual"
              ? "border-xhs bg-xhs-light/20 dark:bg-xhs/10 ring-1 ring-xhs/30"
              : "border-border/60 hover:border-xhs/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              method === "manual"
                ? "bg-xhs text-white"
                : "bg-muted text-muted-foreground"
            )}>
              <PenLine className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">手动输入</p>
              <p className="text-xs text-muted-foreground mt-1">
                手动填写账号和笔记信息
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              method === "manual" ? "border-xhs bg-xhs" : "border-muted-foreground/30"
            )}>
              {method === "manual" && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-gradient-to-r from-xhs to-xhs-dark text-white"
          disabled={!method}
          onClick={() => setStep("input")}
        >
          下一步
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  // ─── Step 2a: Cookie Input ─────────────────────────────────────────
  const renderCookieInput = () => (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-muted/50 dark:bg-muted/30 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Globe className="w-4 h-4 text-xhs" />
          获取Cookie步骤
        </p>
        <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 list-decimal">
          <li>打开浏览器访问 xiaohongshu.com 并登录</li>
          <li>按 <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">F12</kbd> 打开开发者工具</li>
          <li>切换到 <span className="font-medium text-foreground">Network(网络)</span> 标签</li>
          <li>刷新页面，点击任意请求</li>
          <li>在请求头中找到 <span className="font-medium text-foreground">Cookie</span>，复制整个值</li>
        </ol>
      </div>

      {/* Cookie textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium">粘贴Cookie</label>
        <Textarea
          value={cookieValue}
          onChange={(e) => {
            setCookieValue(e.target.value);
            setCookieValidated(null);
          }}
          placeholder="粘贴从小红书复制的Cookie值..."
          className="min-h-[100px] text-xs font-mono"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cookieValidated === true && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cookie有效
              </span>
            )}
            {cookieValidated === false && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <XCircle className="w-3.5 h-3.5" /> Cookie无效
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateCookie}
            disabled={!cookieValue.trim() || validating}
          >
            {validating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 验证中
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 mr-1" /> 验证Cookie
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setStep("method")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <Button
          className="bg-gradient-to-r from-xhs to-xhs-dark text-white"
          disabled={cookieValidated !== true || scrapeSubmitting}
          onClick={handleStartCookieScrape}
        >
          {scrapeSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 采集中
            </>
          ) : (
            <>
              开始采集
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Step 2b: Search Scrape ────────────────────────────────────────
  const renderSearchInput = () => (
    <div className="space-y-4">
      <div className="bg-muted/50 dark:bg-muted/30 rounded-xl p-4">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-xhs" />
          搜索采集
        </p>
        <p className="text-xs text-muted-foreground">
          系统将通过搜索引擎获取该账号的公开数据，无需Cookie即可使用。
        </p>
      </div>

      {/* Account URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">采集目标</label>
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/30">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground truncate">
            {accountUrl || `账号 ${accountId}`}
          </span>
        </div>
      </div>

      {/* Warning */}
      <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
          搜索采集获取的数据可能不完整，建议使用Cookie采集获得更全面的数据
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setStep("method")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <Button
          className="bg-gradient-to-r from-xhs to-xhs-dark text-white"
          disabled={scrapeSubmitting}
          onClick={handleStartSearchScrape}
        >
          {scrapeSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 采集中
            </>
          ) : (
            <>
              开始搜索采集
              <Search className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Step 2c: Manual Input ─────────────────────────────────────────
  const renderManualInput = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">手动填写账号信息</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">昵称</label>
          <Input
            value={manualNickname}
            onChange={(e) => setManualNickname(e.target.value)}
            placeholder="小红书昵称"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">粉丝数</label>
          <Input
            type="number"
            value={manualFollowers}
            onChange={(e) => setManualFollowers(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">关注数</label>
          <Input
            type="number"
            value={manualFollowing}
            onChange={(e) => setManualFollowing(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">获赞与收藏</label>
          <Input
            type="number"
            value={manualLikedCollected}
            onChange={(e) => setManualLikedCollected(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">笔记数</label>
          <Input
            type="number"
            value={manualNotesCount}
            onChange={(e) => setManualNotesCount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">简介</label>
          <Textarea
            value={manualBio}
            onChange={(e) => setManualBio(e.target.value)}
            placeholder="账号简介..."
            className="min-h-[60px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setStep("method")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <Button
          className="bg-gradient-to-r from-xhs to-xhs-dark text-white"
          disabled={manualSaving}
          onClick={handleManualSave}
        >
          {manualSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 保存中
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Step 3: Progress ──────────────────────────────────────────────
  const renderProgress = () => (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <p className="text-sm font-medium">正在采集数据...</p>
        <p className="text-xs text-muted-foreground mt-1">请耐心等待，不要关闭对话框</p>
      </div>

      <div className="space-y-4">
        {progressSteps.map((pStep, idx) => (
          <div key={pStep.label} className="flex items-center gap-4">
            {/* Step icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
              pStep.status === "done" && "bg-emerald-500 text-white",
              pStep.status === "active" && "bg-xhs text-white ring-4 ring-xhs/20",
              pStep.status === "error" && "bg-red-500 text-white",
              pStep.status === "pending" && "bg-muted text-muted-foreground"
            )}>
              {pStep.status === "done" && <CheckCircle2 className="w-5 h-5" />}
              {pStep.status === "active" && <Loader2 className="w-5 h-5 animate-spin" />}
              {pStep.status === "error" && <XCircle className="w-5 h-5" />}
              {pStep.status === "pending" && (
                <span className="text-sm font-bold">{idx + 1}</span>
              )}
            </div>
            {/* Step info */}
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium transition-colors",
                pStep.status === "active" && "text-xhs",
                pStep.status === "done" && "text-emerald-600",
                pStep.status === "pending" && "text-muted-foreground",
                pStep.status === "error" && "text-red-500"
              )}>
                {pStep.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {pStep.status === "done" && "完成"}
                {pStep.status === "active" && "进行中..."}
                {pStep.status === "pending" && "等待中"}
                {pStep.status === "error" && "失败"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Step 4: Result ────────────────────────────────────────────────
  const renderResult = () => (
    <div className="space-y-4">
      {/* Success card */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
            <AvatarImage src={resultData?.avatarUrl} alt={resultData?.nickname} />
            <AvatarFallback className="bg-xhs-light text-xhs text-xl font-medium">
              {(resultData?.nickname || "用").slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-base font-bold">{resultData?.nickname}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              采集到 <span className="text-xhs font-bold">{resultData?.postsFound}</span> 篇笔记
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
        </div>
      </div>

      {/* Data source */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="w-4 h-4" />
        <span>数据来源: <span className="text-foreground font-medium">{resultData?.scrapeMethod}</span></span>
      </div>

      {/* Warnings */}
      {resultData?.warnings && resultData.warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">采集提示</p>
            <ul className="list-disc ml-4 space-y-0.5">
              {resultData.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          className="flex-1 bg-gradient-to-r from-xhs to-xhs-dark text-white"
          onClick={() => {
            onSuccess();
            handleOpenChange(false);
          }}
        >
          查看账号
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            resetState();
          }}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          继续采集
        </Button>
      </div>
    </div>
  );

  // ─── Step title ────────────────────────────────────────────────────
  const getStepTitle = () => {
    switch (step) {
      case "method": return "选择采集方式";
      case "input": {
        if (method === "cookie") return "Cookie采集";
        if (method === "search") return "搜索采集";
        if (method === "manual") return "手动输入";
        return "数据采集";
      }
      case "progress": return "采集进度";
      case "result": return "采集结果";
      default: return "数据采集";
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case "method": return <Sparkles className="w-5 h-5" />;
      case "input": {
        if (method === "cookie") return <Cookie className="w-5 h-5" />;
        if (method === "search") return <Search className="w-5 h-5" />;
        return <PenLine className="w-5 h-5" />;
      }
      case "progress": return <Cpu className="w-5 h-5" />;
      case "result": return <CheckCircle2 className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-xhs to-xhs-dark bg-clip-text text-transparent text-lg font-bold">
              小红书数据采集
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-base flex items-center gap-1.5">
              {getStepIcon()}
              {getStepTitle()}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "method" && "选择最适合你的数据采集方式"}
            {step === "input" && method === "cookie" && "输入浏览器Cookie以获取完整数据"}
            {step === "input" && method === "search" && "通过搜索引擎获取公开数据"}
            {step === "input" && method === "manual" && "手动填写账号信息"}
            {step === "progress" && "数据采集进行中"}
            {step === "result" && "采集结果概览"}
          </DialogDescription>
        </DialogHeader>

        {step === "method" && renderMethodStep()}
        {step === "input" && method === "cookie" && renderCookieInput()}
        {step === "input" && method === "search" && renderSearchInput()}
        {step === "input" && method === "manual" && renderManualInput()}
        {step === "progress" && renderProgress()}
        {step === "result" && renderResult()}
      </DialogContent>
    </Dialog>
  );
}
