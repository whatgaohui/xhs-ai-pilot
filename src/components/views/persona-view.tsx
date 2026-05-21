"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { AccountCard } from "@/components/account-card";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, XhsPersonaInfo } from "@/types";
import type { AccountDataState } from "@/hooks/use-account-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Theater,
  Save,
  Loader2,
  X,
  Plus,
  Eye,
  UserCircle,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Palette,
  Target,
  PenLine,
  Hash,
  MessageSquareQuote,
} from "lucide-react";

type ToneType = XhsPersonaInfo["tone"];
type WritingStyleType = XhsPersonaInfo["writingStyle"];

const toneOptions: { value: ToneType; label: string; emoji: string; desc: string }[] = [
  { value: "warm", label: "温暖亲切", emoji: "😊", desc: "如朋友般的关怀" },
  { value: "professional", label: "专业严谨", emoji: "💼", desc: "权威可信的语气" },
  { value: "witty", label: "幽默风趣", emoji: "😄", desc: "轻松有趣的风格" },
  { value: "casual", label: "随性自然", emoji: "🤙", desc: "不拘束的真实感" },
  { value: "elegant", label: "优雅精致", emoji: "✨", desc: "品味与格调" },
];

const writingStyleOptions: { value: WritingStyleType; label: string; emoji: string; desc: string }[] = [
  { value: "concise", label: "简洁精炼", emoji: "📝", desc: "言简意赅" },
  { value: "detailed", label: "详细丰富", emoji: "📖", desc: "内容详实" },
  { value: "emotional", label: "感性细腻", emoji: "💗", desc: "情感真挚" },
  { value: "balanced", label: "平衡适中", emoji: "⚖️", desc: "兼顾深度" },
];

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  icon?: typeof Hash;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const val = inputValue.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInputValue("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs border-0 bg-xhs-light/60 text-xhs/80">
              {tag}
              <button onClick={() => handleRemove(i)} className="hover:text-xhs transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          className="shrink-0 border-border"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

interface PersonaViewProps {
  /** Shared account data from AccountHubView (when inside hub) */
  sharedAccountData?: AccountDataState;
  /** Open creator sheet */
  onOpenCreator?: () => void;
}

export function PersonaView({ sharedAccountData, onOpenCreator }: PersonaViewProps) {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen, setCreatorSheetOpen } = useAppStore();
  const isInHub = !!sharedAccountData;
  const [standaloneAccounts, setStandaloneAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [persona, setPersona] = useState<XhsPersonaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personaExists, setPersonaExists] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [tone, setTone] = useState<ToneType>("warm");
  const [writingStyle, setWritingStyle] = useState<WritingStyleType>("balanced");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentThemes, setContentThemes] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [avoidTopics, setAvoidTopics] = useState<string[]>([]);
  const [referenceDesc, setReferenceDesc] = useState("");
  const [signaturePhrase, setSignaturePhrase] = useState("");

  // Track original values for reset
  const [originalValues, setOriginalValues] = useState<{
    name: string; tone: ToneType; writingStyle: WritingStyleType;
    targetAudience: string; contentThemes: string[]; keywords: string[];
    avoidTopics: string[]; referenceDesc: string; signaturePhrase: string;
  } | null>(null);

  // Check if form is dirty
  const isDirty = originalValues && (
    originalValues.name !== name ||
    originalValues.tone !== tone ||
    originalValues.writingStyle !== writingStyle ||
    originalValues.targetAudience !== targetAudience ||
    JSON.stringify(originalValues.contentThemes) !== JSON.stringify(contentThemes) ||
    JSON.stringify(originalValues.keywords) !== JSON.stringify(keywords) ||
    JSON.stringify(originalValues.avoidTopics) !== JSON.stringify(avoidTopics) ||
    originalValues.referenceDesc !== referenceDesc ||
    originalValues.signaturePhrase !== signaturePhrase
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadPersona(selectedAccountId);
    } else {
      setLoading(false);
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        const accountList = data.data || [];
        setStandaloneAccounts(accountList);
        if (!selectedAccountId && accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      } else {
        toast.error(data.error || "加载账号列表失败");
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
      toast.error("网络错误，无法加载账号列表");
    }
  };

  const loadPersona = async (accountId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/persona?accountId=${accountId}`);
      if (!res.ok) {
        throw new Error(`API返回错误: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data as XhsPersonaInfo;
        setPersona(p);
        setPersonaExists(true);
        setName(p.name || "");
        const validTones = ["warm", "professional", "witty", "casual", "elegant"] as const;
        const validStyles = ["concise", "detailed", "emotional", "balanced"] as const;
        const toneVal = validTones.includes(p.tone as typeof validTones[number]) ? p.tone : "warm";
        const styleVal = validStyles.includes(p.writingStyle as typeof validStyles[number]) ? p.writingStyle : "balanced";
        setTone(toneVal as ToneType);
        setWritingStyle(styleVal as WritingStyleType);
        setTargetAudience(p.targetAudience || "");
        setContentThemes(Array.isArray(p.contentThemes) ? p.contentThemes : []);
        setKeywords(Array.isArray(p.keywords) ? p.keywords : []);
        setAvoidTopics(Array.isArray(p.avoidTopics) ? p.avoidTopics : []);
        setReferenceDesc(p.referenceDesc || "");
        setSignaturePhrase(p.signaturePhrase || "");
        setOriginalValues({
          name: p.name || "",
          tone: toneVal as ToneType,
          writingStyle: styleVal as WritingStyleType,
          targetAudience: p.targetAudience || "",
          contentThemes: Array.isArray(p.contentThemes) ? p.contentThemes : [],
          keywords: Array.isArray(p.keywords) ? p.keywords : [],
          avoidTopics: Array.isArray(p.avoidTopics) ? p.avoidTopics : [],
          referenceDesc: p.referenceDesc || "",
          signaturePhrase: p.signaturePhrase || "",
        });
      } else {
        setPersona(null);
        setPersonaExists(false);
        resetForm();
      }
    } catch (err) {
      console.error("Failed to load persona:", err);
      setPersona(null);
      setPersonaExists(false);
      resetForm();
      toast.error("加载人设信息失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setTone("warm");
    setWritingStyle("balanced");
    setTargetAudience("");
    setContentThemes([]);
    setKeywords([]);
    setAvoidTopics([]);
    setReferenceDesc("");
    setSignaturePhrase("");
    setOriginalValues(null);
  };

  const handleReset = () => {
    if (originalValues) {
      setName(originalValues.name);
      setTone(originalValues.tone);
      setWritingStyle(originalValues.writingStyle);
      setTargetAudience(originalValues.targetAudience);
      setContentThemes([...originalValues.contentThemes]);
      setKeywords([...originalValues.keywords]);
      setAvoidTopics([...originalValues.avoidTopics]);
      setReferenceDesc(originalValues.referenceDesc);
      setSignaturePhrase(originalValues.signaturePhrase);
      toast.success("已恢复为上次保存的内容");
    } else {
      resetForm();
    }
  };

  const handleSave = async () => {
    if (!selectedAccountId) return;

    setSaving(true);
    try {
      const body = {
        accountId: selectedAccountId,
        name,
        tone,
        writingStyle,
        targetAudience,
        contentThemes,
        keywords,
        avoidTopics,
        referenceDesc,
        signaturePhrase,
      };

      const res = await fetch("/api/persona", {
        method: personaExists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setPersona(data.data);
        setPersonaExists(true);
        setOriginalValues({
          name, tone, writingStyle, targetAudience,
          contentThemes: [...contentThemes],
          keywords: [...keywords],
          avoidTopics: [...avoidTopics],
          referenceDesc, signaturePhrase,
        });
        setSaveSuccess(true);
        toast.success(personaExists ? "人设已更新" : "人设已创建");
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  // Resolve accounts: use shared data when in hub, otherwise standalone
  const accounts = isInHub ? sharedAccountData!.accounts : standaloneAccounts;

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={Theater}
          title="还没有添加账号"
          description="添加小红书账号后，即可为其设置AI创作人设"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  if (!selectedAccountId) {
    return (
      <div className="p-4 md:p-6 space-y-4 view-animate">
        <h2 className="text-lg font-bold">选择账号</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => setSelectedAccountId(account.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header — compact when in hub */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isInHub && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden -ml-2"
              onClick={() => setSelectedAccountId(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            {!isInHub && <h2 className="text-xl font-bold tracking-tight">人设管理</h2>}
            <p className={cn("text-muted-foreground", isInHub ? "text-xs" : "text-sm mt-0.5")}>
              {isInHub ? "定制AI创作风格" : "定制AI创作风格"}
            </p>
          </div>
          {saveSuccess && (
            <Badge className="bg-emerald-50 text-emerald-600 border-0 text-xs animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              已保存
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isInHub && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nickname || "未命名用户"}
                </option>
              ))}
            </select>
          )}
          {/* Quick link to create content */}
          {isInHub && onOpenCreator && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-xhs/20 text-xhs hover:bg-xhs-light/30"
              onClick={onOpenCreator}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              用此人设创作
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-xhs" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">人设名称</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：生活美学博主"
                />
                <p className="text-[10px] text-muted-foreground">给人设取一个容易记忆的名字，方便AI理解和运用</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Palette className="w-3 h-3" />
                  语气风格
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {toneOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTone(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs",
                        tone === opt.value
                          ? "border-xhs bg-xhs-light text-xhs shadow-sm shadow-xhs/10"
                          : "border-border hover:border-xhs/30 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <PenLine className="w-3 h-3" />
                  写作风格
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {writingStyleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWritingStyle(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs",
                        writingStyle === opt.value
                          ? "border-xhs bg-xhs-light text-xhs shadow-sm shadow-xhs/10"
                          : "border-border hover:border-xhs/30 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  目标受众
                </Label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="例如：25-35岁都市女性，追求品质生活"
                />
                <p className="text-[10px] text-muted-foreground">描述你的目标受众，包括年龄、性别、兴趣等特征</p>
              </div>
            </CardContent>
          </Card>

          {/* Content Strategy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Hash className="w-4 h-4 text-xhs" />
                内容策略
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagInput
                label="内容主题"
                tags={contentThemes}
                onChange={setContentThemes}
                placeholder="输入主题后按回车添加"
                icon={Hash}
              />
              <TagInput
                label="核心关键词"
                tags={keywords}
                onChange={setKeywords}
                placeholder="输入关键词后按回车添加"
                icon={Target}
              />
              <TagInput
                label="避免话题"
                tags={avoidTopics}
                onChange={setAvoidTopics}
                placeholder="输入要避免的话题"
                icon={X}
              />
            </CardContent>
          </Card>

          {/* Reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-xhs" />
                参考描述
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">人设描述 / 品牌调性</Label>
                <Textarea
                  value={referenceDesc}
                  onChange={(e) => setReferenceDesc(e.target.value)}
                  placeholder="描述这个账号的人设定位、品牌调性、内容风格等，AI将参考此描述进行创作..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">标志性用语</Label>
                <Input
                  value={signaturePhrase}
                  onChange={(e) => setSignaturePhrase(e.target.value)}
                  placeholder="例如：生活的美好，在于发现细节"
                />
                <p className="text-[10px] text-muted-foreground">每篇内容的结尾签名语，增强人设辨识度</p>
              </div>
            </CardContent>
          </Card>

          {/* Save / Reset Buttons */}
          <div className="flex items-center gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm py-3 px-1 -mx-1">
            <Button
              size="sm"
              className={cn(
                "bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20",
                saveSuccess && "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </>
              )}
            </Button>
            {isDirty && (
              <Button
                size="sm"
                variant="outline"
                className="border-border text-xs"
                onClick={handleReset}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                撤销修改
              </Button>
            )}
            {isDirty && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                有未保存的修改
              </span>
            )}
          </div>
        </div>

        {/* Preview Card */}
        <div className="space-y-4">
          {/* Persona Strength Meter */}
          <Card className="border-xhs/10 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-xhs" />
                人设完整度
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {(() => {
                const fields = [
                  { label: "人设名称", filled: !!name.trim() },
                  { label: "语气风格", filled: true },
                  { label: "写作风格", filled: true },
                  { label: "目标受众", filled: !!targetAudience.trim() },
                  { label: "内容主题", filled: contentThemes.length > 0 },
                  { label: "核心关键词", filled: keywords.length > 0 },
                  { label: "人设描述", filled: !!referenceDesc.trim() },
                  { label: "标志性用语", filled: !!signaturePhrase.trim() },
                ];
                const filledCount = fields.filter(f => f.filled).length;
                const pct = Math.round((filledCount / fields.length) * 100);
                const level = pct >= 75 ? "完善" : pct >= 50 ? "良好" : pct >= 25 ? "基础" : "待完善";
                const levelColor = pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : pct >= 25 ? "text-orange-500" : "text-red-500";
                const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-orange-500" : "bg-red-500";

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-lg font-bold", levelColor)}>{pct}%</span>
                      <Badge variant="secondary" className={cn("text-[10px] border-0 font-medium",
                        pct >= 75 ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" :
                        pct >= 50 ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400" :
                        "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                      )}>
                        {level}
                      </Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {fields.map((f) => (
                        <div key={f.label} className="flex items-center gap-1.5 text-[10px]">
                          <div className={cn("w-3 h-3 rounded-full flex items-center justify-center shrink-0",
                            f.filled ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-muted/50"
                          )}>
                            {f.filled ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                            )}
                          </div>
                          <span className={cn("truncate", f.filled ? "text-foreground" : "text-muted-foreground")}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="sticky top-6 border-xhs/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                人设预览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-xhs-light/50 to-xhs-light/10 border border-xhs/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-xhs-light to-xhs-light/30 flex items-center justify-center border-2 border-xhs/20 shadow-sm shadow-xhs/10">
                  <UserCircle className="w-8 h-8 text-xhs" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {name || "未命名人设"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {toneOptions.find((t) => t.value === tone)?.emoji}{" "}
                    {toneOptions.find((t) => t.value === tone)?.label} ·{" "}
                    {writingStyleOptions.find((w) => w.value === writingStyle)?.label}
                  </p>
                </div>
              </div>

              {targetAudience && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    目标受众
                  </p>
                  <p className="text-xs leading-relaxed">{targetAudience}</p>
                </div>
              )}

              {contentThemes.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    内容主题
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contentThemes.map((theme, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] border-0 bg-muted/80">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {keywords.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    核心关键词
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((kw, i) => (
                      <Badge key={i} className="text-[10px] bg-xhs-light text-xhs border-0">
                        #{kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {avoidTopics.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    避免话题
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {avoidTopics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] text-muted-foreground">
                        🚫 {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {referenceDesc && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    人设描述
                  </p>
                  <p className="text-xs line-clamp-3 leading-relaxed">{referenceDesc}</p>
                </div>
              )}

              {signaturePhrase && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs italic text-xhs font-medium flex items-center gap-1">
                    <MessageSquareQuote className="w-3 h-3" />
                    &ldquo;{signaturePhrase}&rdquo;
                  </p>
                </div>
              )}

              {name && (
                <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-xhs" />
                  AI将基于此人设进行内容创作
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
