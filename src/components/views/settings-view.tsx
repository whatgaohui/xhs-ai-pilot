"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Settings as SettingsIcon,
  Zap,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Download,
  Database,
  Star,
  Power,
  ArrowUp,
  ArrowDown,
  Search,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

/* ─── Types ────────────────────────────────────────────────────────── */

interface AIProviderItem {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string; // masked
  apiKeyEmpty?: boolean;
  model: string;
  supportsChat: boolean;
  supportsWebSearch: boolean;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  lastTestedAt?: string | null;
  lastTestStatus?: string;
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderPreset {
  type: string;
  name: string;
  baseUrl: string;
  model: string;
  description: string;
  signupUrl: string;
  supportsWebSearch: boolean;
  recommended?: boolean;
}

const PRESETS: ProviderPreset[] = [
  {
    type: "zhipu",
    name: "智谱 GLM-4.5 Flash",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    description: "国产免费旗舰，新用户送 200 万 Token",
    signupUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    supportsWebSearch: true,
    recommended: true,
  },
  {
    type: "deepseek",
    name: "DeepSeek V3",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    description: "性价比极高，注册即送 500 万 Token",
    signupUrl: "https://platform.deepseek.com/api_keys",
    supportsWebSearch: false,
  },
  {
    type: "ollama",
    name: "Ollama 本地",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    description: "本地部署，完全免费，无需 API Key",
    signupUrl: "https://ollama.com/download",
    supportsWebSearch: false,
  },
  {
    type: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    description: "官方原版，需要海外网络",
    signupUrl: "https://platform.openai.com/api-keys",
    supportsWebSearch: false,
  },
];

const PROVIDER_ICONS: Record<string, string> = {
  zhipu: "🤖",
  deepseek: "🐬",
  ollama: "🦙",
  openai: "✨",
  custom: "🔧",
};

/** Types that could support web search */
const WEB_SEARCH_CAPABLE_TYPES = new Set(["zhipu", "custom"]);

/* ─── Error suggestion helper ──────────────────────────────────────── */

function getErrorSuggestion(errorMsg: string): string | null {
  const lower = errorMsg.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key") || lower.includes("authentication")) {
    return "API Key 无效，请检查是否正确";
  }
  if (lower.includes("econnrefused") || lower.includes("connection refused") || lower.includes("connect econnrefused") || lower.includes("无法连接")) {
    return "无法连接服务器，请检查 Base URL";
  }
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("超时")) {
    return "连接超时，请检查网络";
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return "访问被拒绝，请检查 API Key 权限";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "接口未找到，请检查 Base URL 和模型名称";
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many")) {
    return "请求频率超限，请稍后重试";
  }
  return null;
}

/* ─── Main View ────────────────────────────────────────────────────── */

export function SettingsView() {
  const [providers, setProviders] = useState<AIProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AIProviderItem | null>(null);
  const [preset, setPreset] = useState<ProviderPreset | null>(null);
  const [exportingData, setExportingData] = useState(false);

  // form state
  const [form, setForm] = useState({
    name: "",
    type: "zhipu",
    baseUrl: "",
    apiKey: "",
    model: "",
    priority: 0,
    supportsWebSearch: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; suggestion?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Sorted providers by priority (desc) ─────────────────────────── */
  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => b.priority - a.priority),
    [providers]
  );

  /* ── Count providers by type ─────────────────────────────────────── */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of providers) {
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    return counts;
  }, [providers]);

  /* ── Active providers for fallback chain ─────────────────────────── */
  const activeProviders = useMemo(
    () => sortedProviders.filter((p) => p.isActive),
    [sortedProviders]
  );

  /* ── Data load ──────────────────────────────────────────────────── */
  useEffect(() => {
    void loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-providers");
      const json = await res.json();
      if (json.success) setProviders(json.data);
    } finally {
      setLoading(false);
    }
  }

  /* ── Open dialog (new / from preset / edit) ─────────────────────── */
  function openNew(p?: ProviderPreset) {
    setEditing(null);
    setPreset(p ?? null);
    setForm({
      name: p?.name ?? "",
      type: p?.type ?? "custom",
      baseUrl: p?.baseUrl ?? "",
      apiKey: "",
      model: p?.model ?? "",
      priority: 0,
      supportsWebSearch: p?.supportsWebSearch ?? false,
    });
    setTestResult(null);
    setShowKey(false);
    setDialogOpen(true);
  }

  function openEdit(item: AIProviderItem) {
    setEditing(item);
    setPreset(null);
    setForm({
      name: item.name,
      type: item.type,
      baseUrl: item.baseUrl,
      apiKey: "", // never prefill
      model: item.model,
      priority: item.priority,
      supportsWebSearch: item.supportsWebSearch,
    });
    setTestResult(null);
    setShowKey(false);
    setDialogOpen(true);
  }

  /* ── Actions ────────────────────────────────────────────────────── */
  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          type: form.type,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          model: form.model,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const elapsed = json.data?.elapsed ?? 0;
        const latencySec = (elapsed / 1000).toFixed(1);
        setTestResult({
          ok: true,
          msg: `连接成功！延迟 ${elapsed < 1000 ? `${elapsed}ms` : `${latencySec}s`}`,
        });
        toast.success(`连接成功！延迟 ${elapsed < 1000 ? `${elapsed}ms` : `${latencySec}s`}`);
      } else {
        const errorMsg = json.error || "测试失败";
        const suggestion = getErrorSuggestion(errorMsg);
        setTestResult({ ok: false, msg: errorMsg, suggestion });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "网络错误";
      const suggestion = getErrorSuggestion(errorMsg);
      setTestResult({ ok: false, msg: errorMsg, suggestion });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!form.name || !form.baseUrl || !form.model) {
      toast.error("请填写完整：名称、API 地址、模型");
      return;
    }
    setSaving(true);
    try {
      const isNew = !editing;
      const url = isNew ? "/api/ai-providers" : `/api/ai-providers/${editing!.id}`;
      const method = isNew ? "POST" : "PATCH";
      // For new providers: set as default if no other is default yet
      const isDefault = isNew && providers.length === 0;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey || undefined, // keep old key when blank
          model: form.model,
          priority: form.priority,
          supportsWebSearch: form.supportsWebSearch,
          ...(isDefault && { isDefault: true }),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isNew ? "✅ AI 模型已添加" : "✅ 已更新");
        setDialogOpen(false);
        await loadProviders();
      } else {
        toast.error(json.error || "保存失败");
      }
    } finally {
      setSaving(false);
    }
  }

  async function setAsDefault(id: string) {
    const res = await fetch(`/api/ai-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("已设为默认模型");
      await loadProviders();
    }
  }

  async function toggleActive(item: AIProviderItem) {
    const res = await fetch(`/api/ai-providers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      await loadProviders();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该 AI 模型？")) return;
    const res = await fetch(`/api/ai-providers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("已删除");
      await loadProviders();
    }
  }

  async function movePriority(item: AIProviderItem, direction: "up" | "down") {
    // Find current position in sorted array
    const currentIdx = sortedProviders.findIndex((p) => p.id === item.id);
    if (currentIdx < 0) return;

    if (direction === "up" && currentIdx === 0) return;
    if (direction === "down" && currentIdx === sortedProviders.length - 1) return;

    const targetIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    const targetItem = sortedProviders[targetIdx];

    // Swap priorities
    const newPriority = targetItem.priority;

    const res = await fetch(`/api/ai-providers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    const json = await res.json();
    if (json.success) {
      // Also update the other item's priority to avoid collision
      await fetch(`/api/ai-providers/${targetItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: item.priority }),
      });
      await loadProviders();
      toast.success("优先级已调整");
    }
  }

  async function handleExport() {
    setExportingData(true);
    try {
      const res = await fetch("/api/export", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `xhs-data-export-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("数据导出完成");
      }
    } finally {
      setExportingData(false);
    }
  }

  const hasAnyProvider = providers.length > 0;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 view-animate">
      {/* Unified Page Header */}
      <PageHeader
        icon={<SettingsIcon className="w-6 h-6" />}
        title="设置"
        subtitle="配置 AI 模型与应用偏好"
      />

      {/* AI Models section */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              AI 模型
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasAnyProvider
                ? `已配置 ${providers.length} 个，其中 ${providers.filter((p) => p.isActive).length} 个启用`
                : "添加你的第一个 AI 模型来解锁所有智能功能"}
            </p>
          </div>
          <Button size="sm" onClick={() => openNew()} className="gap-1 btn-gradient-brand text-white border-0">
            <Plus className="w-4 h-4" /> 自定义添加
          </Button>
        </div>

        {/* Configured providers */}
        {loading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : hasAnyProvider ? (
          <>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {sortedProviders.map((p, idx) => (
                <div
                  key={p.id}
                  className={cn(
                    "card-elevated p-4 relative group",
                    !p.isActive && "opacity-60"
                  )}
                >
                  {/* Priority badge */}
                  <Badge
                    variant="outline"
                    className="absolute -top-2 left-3 text-[10px] font-bold px-1.5 py-0 border-border/60 text-muted-foreground"
                  >
                    #{idx + 1}
                  </Badge>
                  {p.isDefault && (
                    <Badge className="absolute -top-2 left-14 bg-gradient-brand text-white border-0 gap-1 px-2 py-0.5 text-[10px] font-bold">
                      <Star className="w-2.5 h-2.5" />
                      默认
                    </Badge>
                  )}
                  {/* Web search badge */}
                  {p.supportsWebSearch && (
                    <Badge
                      variant="secondary"
                      className="absolute top-3 right-3 text-[10px] gap-1 px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      <Search className="w-2.5 h-2.5" />
                      联网搜索
                    </Badge>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{PROVIDER_ICONS[p.type] ?? "🔧"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                        {p.lastTestStatus === "success" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {p.lastTestStatus === "error" && (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {p.model} · {p.apiKeyEmpty ? "无 API Key" : p.apiKey}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                        {p.baseUrl}
                      </p>
                      {p.lastTestError && p.lastTestStatus === "error" && (
                        <p className="text-[10px] text-red-500 mt-1 line-clamp-2">
                          {p.lastTestError}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                    {/* Priority reorder */}
                    <div className="flex items-center gap-0.5 mr-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        disabled={idx === 0}
                        onClick={() => movePriority(p, "up")}
                        title="上移优先级"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        disabled={idx === sortedProviders.length - 1}
                        onClick={() => movePriority(p, "down")}
                        title="下移优先级"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    {!p.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setAsDefault(p.id)}
                      >
                        <Star className="w-3 h-3" />
                        设为默认
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => toggleActive(p)}
                    >
                      <Power className="w-3 h-3" />
                      {p.isActive ? "禁用" : "启用"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="w-3 h-3" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 ml-auto"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fallback chain explanation */}
            {activeProviders.length > 1 && (
              <div className="card-elevated p-4 bg-muted/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      当默认模型请求失败时，系统会自动尝试下一个启用的模型，确保服务不中断。
                    </p>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {activeProviders.map((p, idx) => (
                        <span key={p.id} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 gap-0.5 font-medium",
                              p.isDefault && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
                            )}
                          >
                            {PROVIDER_ICONS[p.type]} {p.name}
                          </Badge>
                          {idx < activeProviders.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card-elevated p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-brand-soft mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-semibold mb-1">还没有配置 AI 模型</h3>
            <p className="text-sm text-muted-foreground mb-3">从下方选一个推荐方案，30 秒搞定</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">1️⃣ 选择推荐方案</span>
              <ChevronRight className="w-3 h-3" />
              <span className="inline-flex items-center gap-1">2️⃣ 填入 API Key</span>
              <ChevronRight className="w-3 h-3" />
              <span className="inline-flex items-center gap-1">3️⃣ 点击测试连接</span>
            </div>
          </div>
        )}

        {/* Preset cards */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-3">
            推荐方案 · 快速添加
          </h3>
          <div
            className={cn(
              "grid gap-3",
              !hasAnyProvider
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            )}
          >
            {PRESETS.map((p) => {
              const count = typeCounts[p.type] || 0;
              return (
                <button
                  key={p.type}
                  onClick={() => openNew(p)}
                  className={cn(
                    "card-elevated p-4 text-left relative transition-all",
                    "hover:border-rose-300/60 cursor-pointer",
                    !hasAnyProvider && "p-5"
                  )}
                >
                  {p.recommended && (
                    <Badge className="absolute -top-2 right-3 bg-gradient-brand text-white border-0 text-[9px] font-bold px-1.5 py-0">
                      推荐
                    </Badge>
                  )}
                  <div className={cn("text-2xl mb-2", !hasAnyProvider && "text-3xl")}>
                    {PROVIDER_ICONS[p.type]}
                  </div>
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                    {p.description}
                  </p>
                  {count > 0 ? (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      已添加 {count} 个
                    </Badge>
                  ) : (
                    <div className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> 添加
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-500" />
            数据管理
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">导出本地数据备份</p>
        </div>
        <div className="card-elevated p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">导出全部数据</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              下载 JSON 格式备份（账号 / 笔记 / 草稿 / 人设）
            </p>
          </div>
          <Button onClick={handleExport} disabled={exportingData} size="sm" className="gap-1.5">
            {exportingData ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            导出
          </Button>
        </div>
      </section>

      {/* About */}
      <section>
        <div className="card-elevated p-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            StudioRed v3.0 Beta
          </div>
          <span>面向个人创作者的小红书 AI 运营工作台</span>
        </div>
      </section>

      {/* ── Add/Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">
                {PROVIDER_ICONS[form.type] ?? "🔧"}
              </span>
              {editing ? "编辑 AI 模型" : preset ? `添加 ${preset.name}` : "添加自定义 AI 模型"}
            </DialogTitle>
            <DialogDescription>
              {preset?.signupUrl && (
                <a
                  href={preset.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 mt-1 text-xs"
                >
                  获取 {preset.name} API Key
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs">显示名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="智谱 GLM-4.5"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">API 地址 (Base URL)</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">
                API Key {editing && <span className="text-muted-foreground">（留空则保持不变）</span>}
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editing ? "•••••••• (留空则保持原 Key)" : "sk-..."}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">模型名称</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="glm-4-flash"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">优先级</Label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="mt-1 w-24"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                数值越大优先级越高，失败时自动切换到低优先级模型
              </p>
            </div>
            {/* SupportsWebSearch toggle — only for capable types */}
            {WEB_SEARCH_CAPABLE_TYPES.has(form.type) && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    联网搜索
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    启用后模型可进行联网搜索获取实时信息
                  </p>
                </div>
                <Switch
                  checked={form.supportsWebSearch}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, supportsWebSearch: checked })
                  }
                />
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div
                className={cn(
                  "rounded-md px-3 py-2 text-xs flex flex-col gap-1",
                  testResult.ok
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                )}
              >
                <div className="flex items-start gap-2">
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 break-all">{testResult.msg}</span>
                </div>
                {testResult.suggestion && (
                  <p className="ml-6 text-[11px] opacity-80">
                    💡 {testResult.suggestion}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !form.baseUrl || !form.model}
              className="gap-1.5"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              测试连接
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.baseUrl || !form.model}
              className="gap-1.5 btn-gradient-brand text-white border-0"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
