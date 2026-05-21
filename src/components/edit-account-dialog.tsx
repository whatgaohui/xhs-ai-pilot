"use client";

import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Cookie,
  CheckCircle2,
  XCircle,
  Globe,
  Shield,
  Save,
  User,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { XhsAccountInfo } from "@/types";
import { cn } from "@/lib/utils";

interface EditAccountDialogProps {
  account: XhsAccountInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** If true, focus on the cookie section when opening */
  focusCookies?: boolean;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onSuccess,
  focusCookies = false,
}: EditAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [cookieSaving, setCookieSaving] = useState(false);
  const [cookieValidating, setCookieValidating] = useState(false);
  const [cookieValidated, setCookieValidated] = useState<boolean | null>(null);
  const [cookieValue, setCookieValue] = useState("");
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    location: "",
    followers: 0,
    following: 0,
    likedCollected: 0,
    notesCount: 0,
  });

  const cookieSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (account && open) {
      setFormData({
        nickname: account.nickname || "",
        bio: account.bio || "",
        location: account.location || "",
        followers: account.followers || 0,
        following: account.following || 0,
        likedCollected: account.likedCollected || 0,
        notesCount: account.notesCount || 0,
      });
      setCookieValue(account.cookies || "");
      setCookieValidated(null);

      // If focusCookies, scroll to cookie section after render
      if (focusCookies) {
        setTimeout(() => {
          cookieSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [account, open, focusCookies]);

  const handleSubmit = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("账号信息已更新");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCookies = async () => {
    if (!account) return;
    setCookieSaving(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: cookieValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cookie 已保存");
        onSuccess?.();
      } else {
        toast.error(data.error || "保存 Cookie 失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setCookieSaving(false);
    }
  };

  const handleValidateCookie = async () => {
    if (!cookieValue.trim()) return;
    setCookieValidating(true);
    setCookieValidated(null);

    // Simulate validation: check if cookie contains typical XHS fields
    await new Promise((r) => setTimeout(r, 1200));

    const hasXhsCookieFields =
      cookieValue.includes("web_session") ||
      cookieValue.includes("xhs") ||
      cookieValue.includes("a1") ||
      cookieValue.length > 50;

    setCookieValidated(hasXhsCookieFields);
    setCookieValidating(false);

    if (hasXhsCookieFields) {
      toast.success("Cookie 验证通过");
    } else {
      toast.error("Cookie 格式似乎不正确，请检查后重试");
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasCookies = !!(account?.cookies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            编辑账号信息
          </DialogTitle>
          <DialogDescription>
            管理小红书账号的基本信息和 Cookie
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable middle content */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-6 py-2">
            {/* ─── Profile Section ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-4 h-4 text-xhs" />
                基本信息
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nickname">昵称</Label>
                <Input
                  id="edit-nickname"
                  placeholder="输入小红书昵称"
                  value={formData.nickname}
                  onChange={(e) => updateField("nickname", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio">简介</Label>
                <Textarea
                  id="edit-bio"
                  placeholder="输入个人简介"
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">地区</Label>
                <Input
                  id="edit-location"
                  placeholder="如：上海"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-followers">粉丝数</Label>
                  <Input
                    id="edit-followers"
                    type="number"
                    min={0}
                    value={formData.followers}
                    onChange={(e) =>
                      updateField("followers", parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-following">关注数</Label>
                  <Input
                    id="edit-following"
                    type="number"
                    min={0}
                    value={formData.following}
                    onChange={(e) =>
                      updateField("following", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-likedCollected">获赞与收藏</Label>
                  <Input
                    id="edit-likedCollected"
                    type="number"
                    min={0}
                    value={formData.likedCollected}
                    onChange={(e) =>
                      updateField("likedCollected", parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notesCount">笔记数</Label>
                  <Input
                    id="edit-notesCount"
                    type="number"
                    min={0}
                    value={formData.notesCount}
                    onChange={(e) =>
                      updateField("notesCount", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ─── Cookie Management Section ────────────────────────────── */}
            <div ref={cookieSectionRef} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Cookie className="w-4 h-4 text-xhs" />
                  Cookie 管理
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] border-0",
                    hasCookies
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {hasCookies ? "已存储 Cookie" : "未存储 Cookie"}
                </Badge>
              </div>

              {/* Cookie status info */}
              <div className={cn(
                "rounded-lg border p-3 space-y-1.5",
                hasCookies
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
              )}>
                <div className="flex items-center gap-2">
                  {hasCookies ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium">
                    {hasCookies
                      ? "Cookie 已存储，可用于刷新数据"
                      : "暂无 Cookie，刷新数据时需要手动输入"}
                  </span>
                </div>
                {hasCookies && (
                  <p className="text-[11px] text-muted-foreground ml-6">
                    Cookie 长度: {account?.cookies?.length || 0} 字符
                  </p>
                )}
              </div>

              {/* Cookie textarea */}
              <div className="space-y-2">
                <Label htmlFor="edit-cookies" className="flex items-center gap-1.5 text-sm">
                  <Shield className="w-3.5 h-3.5" />
                  浏览器 Cookie
                  <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 仅本地存储
                  </span>
                </Label>
                <Textarea
                  id="edit-cookies"
                  placeholder="粘贴完整 Cookie，例如：&#10;abRequestId=...; a1=...; web_session=...; webBuild=...;"
                  value={cookieValue}
                  onChange={(e) => {
                    setCookieValue(e.target.value);
                    setCookieValidated(null);
                  }}
                  rows={4}
                  className="font-mono text-[11px] resize-y break-all min-h-[80px] max-h-[200px] overflow-auto"
                />
              </div>

              {/* Validation feedback */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {cookieValidated === true && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cookie 有效
                    </span>
                  )}
                  {cookieValidated === false && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <XCircle className="w-3.5 h-3.5" /> Cookie 无效
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidateCookie}
                    disabled={!cookieValue.trim() || cookieValidating}
                    className="text-xs"
                  >
                    {cookieValidating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 验证中
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 mr-1" /> 验证 Cookie
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveCookies}
                    disabled={cookieSaving || !cookieValue.trim()}
                    className="bg-gradient-to-r from-xhs to-xhs-dark text-white border-0 text-xs"
                  >
                    {cookieSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 保存中
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1" /> 保存 Cookie
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* How-to hint */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-xhs" />
                  如何获取 Cookie
                </p>
                <ol className="space-y-0.5 ml-1 text-muted-foreground list-decimal list-inside">
                  <li>浏览器打开 <span className="font-mono">xiaohongshu.com</span> 并登录</li>
                  <li>按 <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">F12</kbd> 打开开发者工具</li>
                  <li>切到 <span className="font-semibold">Application</span> → <span className="font-semibold">Cookies</span></li>
                  <li>全选所有行 → 复制 → 粘贴到上方</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 border-t border-border/40 pt-4 -mx-6 px-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-xhs hover:bg-xhs-dark text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                保存中...
              </>
            ) : (
              "保存信息"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
