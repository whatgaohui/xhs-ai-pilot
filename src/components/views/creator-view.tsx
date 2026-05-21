"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, ContentDraftInfo } from "@/types";
import type { AccountDataState } from "@/hooks/use-account-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Loader2,
  Save,
  Wand2,
  X,
  Plus,
  FileText,
  Trash2,
  Copy,
  Check,
  PenLine,
  Lightbulb,
  Type,
  Hash,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  RefreshCw,
  ShoppingBag,
  Utensils,
  Shirt,
  Plane,
  Home,
  Briefcase,
  Palette,
  ArrowRight,
  Target,
  MessageSquare,
} from "lucide-react";

type QuickTone = "default" | "warm" | "professional" | "witty" | "casual" | "elegant";
type PolishStyle = "fluent" | "vivid" | "professional" | "attractive";

const toneOptions: { value: QuickTone; label: string; emoji: string; desc: string }[] = [
  { value: "default", label: "默认", emoji: "🎯", desc: "平台自然风格" },
  { value: "warm", label: "温暖", emoji: "😊", desc: "亲切友好" },
  { value: "professional", label: "专业", emoji: "💼", desc: "权威严谨" },
  { value: "witty", label: "幽默", emoji: "😄", desc: "风趣生动" },
  { value: "casual", label: "随性", emoji: "🤙", desc: "轻松自在" },
  { value: "elegant", label: "优雅", emoji: "✨", desc: "精致品味" },
];

const polishStyleOptions: { value: PolishStyle; label: string; desc: string; icon: typeof Wand2 }[] = [
  { value: "fluent", label: "更流畅", desc: "优化语句通顺度", icon: ArrowRight },
  { value: "vivid", label: "更生动", desc: "增强画面感", icon: Sparkles },
  { value: "professional", label: "更专业", desc: "提升专业度", icon: Briefcase },
  { value: "attractive", label: "更吸引", desc: "增强吸引力", icon: Target },
];

// ─── Writing Templates ──────────────────────────────────────────────────

interface WritingTemplate {
  id: string;
  icon: React.ElementType;
  emoji: string;
  name: string;
  desc: string;
  placeholder: string;
  defaultTone: QuickTone;
  structure: string[];
  sampleTags: string[];
}

const writingTemplates: WritingTemplate[] = [
  {
    id: "product",
    icon: ShoppingBag,
    emoji: "📝",
    name: "好物种草",
    desc: "推荐实用好物",
    placeholder: "分享一款最近入手的宝藏好物，真心推荐给大家...",
    defaultTone: "warm",
    structure: ["开头：引入痛点或需求", "中间：产品特点+使用体验", "结尾：总结推荐+互动引导"],
    sampleTags: ["好物推荐", "种草", "平价好物", "实用好物"],
  },
  {
    id: "food",
    icon: Utensils,
    emoji: "🍜",
    name: "美食探店",
    desc: "探店美食分享",
    placeholder: "发现一家超赞的宝藏餐厅，环境好味道正...",
    defaultTone: "warm",
    structure: ["开头：店铺印象/环境", "中间：菜品推荐+口感描述", "结尾：人均消费+推荐指数"],
    sampleTags: ["美食探店", "美食推荐", "必吃榜", "探店分享"],
  },
  {
    id: "fashion",
    icon: Shirt,
    emoji: "👗",
    name: "穿搭分享",
    desc: "时尚穿搭灵感",
    placeholder: "今日穿搭分享，这套真的太适合春天了...",
    defaultTone: "elegant",
    structure: ["开头：穿搭场景/风格", "中间：单品介绍+搭配思路", "结尾：穿搭心得+穿搭建议"],
    sampleTags: ["穿搭灵感", "日常穿搭", "OOTD", "显瘦穿搭"],
  },
  {
    id: "travel",
    icon: Plane,
    emoji: "✈️",
    name: "旅行攻略",
    desc: "详细旅行指南",
    placeholder: "超详细的旅行攻略，建议收藏！去了绝对不踩雷...",
    defaultTone: "casual",
    structure: ["开头：目的地概述+最佳季节", "中间：行程安排+必去景点", "结尾：实用tips+费用参考"],
    sampleTags: ["旅行攻略", "旅游推荐", "周末去哪儿", "旅行日记"],
  },
  {
    id: "home",
    icon: Home,
    emoji: "🏠",
    name: "家居好物",
    desc: "家居装饰推荐",
    placeholder: "这些家居好物让家更有仪式感，幸福感直线上升...",
    defaultTone: "warm",
    structure: ["开头：家居需求/痛点", "中间：好物推荐+改造效果", "结尾：搭配建议+购买渠道"],
    sampleTags: ["家居好物", "居家装饰", "提升幸福感", "租房改造"],
  },
  {
    id: "career",
    icon: Briefcase,
    emoji: "💼",
    name: "职场干货",
    desc: "职场经验分享",
    placeholder: "职场新人必看！这些经验早点知道就好了...",
    defaultTone: "professional",
    structure: ["开头：职场场景/痛点", "中间：方法分享+实例说明", "结尾：总结要点+鼓励互动"],
    sampleTags: ["职场干货", "工作效率", "职场成长", "升职加薪"],
  },
  {
    id: "beauty",
    icon: Palette,
    emoji: "💄",
    name: "美妆测评",
    desc: "美妆产品评测",
    placeholder: "亲测这款新品，使用一周真实感受分享...",
    defaultTone: "casual",
    structure: ["开头：产品概述+肤质说明", "中间：使用体验+效果对比", "结尾：适合人群+回购指数"],
    sampleTags: ["美妆测评", "护肤心得", "平价护肤", "成分党"],
  },
];

const topicSuggestions = [
  { label: "好物分享", emoji: "🎁", prompt: "分享我最近入手的实用好物推荐" },
  { label: "探店打卡", emoji: "🏠", prompt: "探店分享：发现一家宝藏店铺" },
  { label: "穿搭灵感", emoji: "👗", prompt: "今日穿搭灵感分享" },
  { label: "美食制作", emoji: "🍳", prompt: "在家也能轻松搞定的美食教程" },
  { label: "旅行攻略", emoji: "✈️", prompt: "超详细的旅行攻略分享" },
  { label: "护肤心得", emoji: "🧴", prompt: "亲测好用的护肤心得分享" },
  { label: "职场干货", emoji: "💼", prompt: "职场新人必看的干货分享" },
  { label: "生活日常", emoji: "☀️", prompt: "平凡日子里的闪光时刻" },
];

// Title length guidelines
const TITLE_MAX = 20;
const CONTENT_MIN = 50;
const CONTENT_MAX = 1000;

// ─── Trending Tag Pools (static, defined outside component) ──────────────

const trendingTagPools: Record<string, string[]> = {
  default: ["生活日常", "好物推荐", "干货分享", "宝藏发现", "必收藏", "亲测好用", "涨知识", "实用技巧"],
  好物: ["好物分享", "好物推荐", "必买清单", "种草", "平价好物", "实用好物", "好物测评", "居家好物", "提升幸福感"],
  探店: ["探店打卡", "美食探店", "宝藏店铺", "探店分享", "网红店", "美食推荐", "必吃榜", "排队美食"],
  穿搭: ["穿搭灵感", "日常穿搭", "显瘦穿搭", "通勤穿搭", "穿搭分享", "OOTD", "时尚穿搭", "早秋穿搭"],
  美食: ["美食制作", "家常菜", "快手菜", "减脂餐", "美食教程", "烘焙", "一人食", "懒人食谱"],
  旅行: ["旅行攻略", "旅游推荐", "周末去哪儿", "小众旅行", "旅行日记", "拍照打卡", "自由行", "出行攻略"],
  护肤: ["护肤心得", "护肤步骤", "平价护肤", "抗老", "美白", "敏感肌", "秋冬护肤", "成分党"],
  职场: ["职场干货", "工作效率", "面试技巧", "职场成长", "升职加薪", "办公好物", "职场穿搭", "副业"],
};

// ─── Content Quality Score ──────────────────────────────────────────────

interface QualityBreakdown {
  overall: number;
  titleAttractiveness: number;
  contentReadability: number;
  engagementGuidance: number;
  tagOptimization: number;
  suggestions: string[];
}

function calculateQualityScore(
  title: string,
  content: string,
  tags: string[],
  coverPrompt: string
): QualityBreakdown {
  // Title attractiveness (0-100)
  let titleScore = 0;
  if (title.length > 0) titleScore += 30;
  if (title.length >= 5 && title.length <= TITLE_MAX) titleScore += 30;
  if (/[!！？?✨🔥💡]/.test(title)) titleScore += 15; // Has engaging punctuation
  if (title.length > 0 && title.length <= 10) titleScore += 15; // Concise title
  if (/[\d]/.test(title)) titleScore += 10; // Has numbers (listicles)
  titleScore = Math.min(titleScore, 100);

  // Content readability (0-100)
  let contentScore = 0;
  if (content.length >= CONTENT_MIN) contentScore += 30;
  if (content.length >= 200) contentScore += 20;
  if (content.length >= 400) contentScore += 10;
  const paragraphs = content.split(/\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) contentScore += 15; // Good paragraph structure
  if (content.includes("•") || content.includes("-") || content.includes("1.") || content.includes("1、"))
    contentScore += 15; // Has list structure
  if (/[!！？?]/.test(content)) contentScore += 10; // Engaging punctuation
  contentScore = Math.min(contentScore, 100);

  // Engagement guidance (0-100)
  let engagementScore = 0;
  if (content.includes("?") || content.includes("？")) engagementScore += 20; // Asks questions
  if (content.includes("评论") || content.includes("留言") || content.includes("分享")) engagementScore += 25;
  if (content.includes("收藏") || content.includes("点赞")) engagementScore += 20;
  if (content.includes("你") || content.includes("大家") || content.includes("姐妹")) engagementScore += 20;
  if (content.includes("关注") || content.includes("主页")) engagementScore += 15;
  engagementScore = Math.min(engagementScore, 100);

  // Tag optimization (0-100)
  let tagScore = 0;
  if (tags.length >= 1) tagScore += 20;
  if (tags.length >= 3) tagScore += 25;
  if (tags.length >= 5) tagScore += 20;
  if (tags.length >= 7) tagScore += 15;
  if (tags.some((t) => t.includes("推荐") || t.includes("分享") || t.includes("干货")))
    tagScore += 10; // Has popular keywords
  if (tags.some((t) => t.length >= 4)) tagScore += 10; // Has specific long-tail tags
  tagScore = Math.min(tagScore, 100);

  // Overall score (weighted average)
  const overall = Math.round(
    titleScore * 0.25 + contentScore * 0.3 + engagementScore * 0.25 + tagScore * 0.2
  );

  // Generate suggestions
  const suggestions: string[] = [];
  if (titleScore < 50) suggestions.push("标题可以更吸引人，尝试加入数字或感叹词");
  if (title.length > TITLE_MAX) suggestions.push("标题建议控制在20字以内，展示效果更好");
  if (contentScore < 50) suggestions.push("正文可以更充实，建议添加段落分隔和列表");
  if (content.length < CONTENT_MIN) suggestions.push("正文内容较短，建议扩展到50字以上");
  if (engagementScore < 50) suggestions.push("添加互动引导，如「评论区告诉我你的看法」");
  if (tagScore < 50) suggestions.push("建议添加3-5个热门标签提高曝光");
  if (tags.length < 3) suggestions.push("至少添加3个标签，包含1-2个热门标签");
  if (coverPrompt.length < 5) suggestions.push("添加封面图提示词，提升笔记视觉吸引力");
  if (overall >= 80) suggestions.push("内容质量优秀！可以尝试发布");

  return {
    overall,
    titleAttractiveness: titleScore,
    contentReadability: contentScore,
    engagementGuidance: engagementScore,
    tagOptimization: tagScore,
    suggestions,
  };
}

interface CreatorViewProps {
  /** Shared account data from AccountHubView (when inside hub) */
  sharedAccountData?: AccountDataState;
}

export function CreatorView({ sharedAccountData }: CreatorViewProps) {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen, prefilledTopic } =
    useAppStore();

  const isInHub = !!sharedAccountData;
  const [standaloneAccounts, setStandaloneAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [drafts, setDrafts] = useState<ContentDraftInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation form
  const [topic, setTopic] = useState("");
  const [selectedTone, setSelectedTone] = useState<QuickTone>("default");
  const [generating, setGenerating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [optimizingTags, setOptimizingTags] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  // Generated content
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [generatedCoverPrompt, setGeneratedCoverPrompt] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Writing template
  const [selectedTemplate, setSelectedTemplate] = useState<WritingTemplate | null>(null);
  const [showStructure, setShowStructure] = useState(false);

  // Polish enhancement
  const [polishStyle, setPolishStyle] = useState<PolishStyle>("fluent");
  const [showPolishStyle, setShowPolishStyle] = useState(false);
  const [polishOriginal, setPolishOriginal] = useState("");
  const [showDiff, setShowDiff] = useState(false);

  // Content quality score
  const qualityScore = useMemo(() => {
    if (!generatedContent && !generatedTitle) return null;
    return calculateQualityScore(generatedTitle, generatedContent, generatedTags, generatedCoverPrompt);
  }, [generatedTitle, generatedContent, generatedTags, generatedCoverPrompt]);

  // Legacy quality bar
  const contentQuality = useMemo(() => {
    if (!generatedContent) return 0;
    let score = 0;
    if (generatedTitle.length > 0 && generatedTitle.length <= TITLE_MAX) score += 25;
    if (generatedContent.length >= CONTENT_MIN) score += 25;
    if (generatedTags.length >= 3) score += 25;
    if (generatedCoverPrompt.length > 5) score += 25;
    return score;
  }, [generatedTitle, generatedContent, generatedTags, generatedCoverPrompt]);

  const qualityLabel = contentQuality >= 75 ? "优秀" : contentQuality >= 50 ? "良好" : contentQuality >= 25 ? "待完善" : "未开始";
  const qualityColor = contentQuality >= 75 ? "text-emerald-600" : contentQuality >= 50 ? "text-amber-600" : contentQuality >= 25 ? "text-orange-500" : "text-muted-foreground";

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadDrafts(selectedAccountId);
    }
  }, [selectedAccountId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setStandaloneAccounts(data.data || []);
        if (!selectedAccountId && data.data?.length > 0) {
          setSelectedAccountId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async (accountId: string) => {
    try {
      const res = await fetch(`/api/drafts?accountId=${accountId}`);
      const data = await res.json();
      if (data.success) setDrafts(data.data || []);
    } catch (err) {
      console.error("Failed to load drafts:", err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccountId) {
      toast.error("请先选择账号");
      return;
    }
    if (!topic.trim()) {
      toast.error("请输入创作主题");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          topic: topic.trim(),
          tone: selectedTone === "default" ? undefined : selectedTone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const draft = data.data.draft;
        const generated = data.data.generated;
        setGeneratedTitle(generated.title || draft.title || "");
        setGeneratedContent(generated.content || draft.content || "");
        setGeneratedTags(generated.tags || draft.tags || []);
        setGeneratedCoverPrompt(generated.coverPrompt || draft.coverPrompt || "");
        setCurrentDraftId(draft.id || null);
        setShowDiff(false);
        toast.success("内容生成成功！");
      } else {
        toast.error(data.error || "生成失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handlePolish = async () => {
    if (!selectedAccountId || !generatedContent) return;

    setPolishing(true);
    setShowPolishStyle(false);
    setPolishOriginal(generatedContent);
    setShowDiff(true);
    try {
      const polishGoalMap: Record<PolishStyle, string> = {
        fluent: "更流畅",
        vivid: "更生动",
        professional: "更专业",
        attractive: "更吸引",
      };

      const res = await fetch("/api/content/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          content: generatedContent,
          polishGoal: polishGoalMap[polishStyle],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedContent(data.data.content || generatedContent);
        if (data.data.title) setGeneratedTitle(data.data.title);
        if (data.data.tags) setGeneratedTags(data.data.tags);
        toast.success(`润色完成！风格：${polishGoalMap[polishStyle]}`);
      } else {
        toast.error(data.error || "润色失败");
        setShowDiff(false);
      }
    } catch {
      toast.error("网络错误，请重试");
      setShowDiff(false);
    } finally {
      setPolishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedAccountId) return;

    setSavingDraft(true);
    try {
      if (currentDraftId) {
        const res = await fetch(`/api/drafts/${currentDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: generatedTitle,
            content: generatedContent,
            tags: generatedTags,
            coverPrompt: generatedCoverPrompt,
            status: "draft",
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("草稿已保存");
        } else {
          toast.error(data.error || "保存失败");
        }
      } else {
        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            title: generatedTitle,
            content: generatedContent,
            tags: generatedTags,
            coverPrompt: generatedCoverPrompt,
            status: "draft",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentDraftId(data.data.id);
          toast.success("草稿已保存");
        } else {
          toast.error(data.error || "保存失败");
        }
      }
      loadDrafts(selectedAccountId);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCopy = async () => {
    const text = `${generatedTitle}\n\n${generatedContent}\n\n${generatedTags.map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("草稿已删除");
        loadDrafts(selectedAccountId!);
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleLoadDraft = (draft: ContentDraftInfo) => {
    setGeneratedTitle(draft.title);
    setGeneratedContent(draft.content);
    setGeneratedTags(draft.tags || []);
    setGeneratedCoverPrompt(draft.coverPrompt || "");
    setCurrentDraftId(draft.id);
    setShowDiff(false);
    toast.success("草稿已加载");
  };

  const addTag = (val?: string) => {
    const tagVal = val || newTag.trim();
    if (tagVal && !generatedTags.includes(tagVal)) {
      setGeneratedTags([...generatedTags, tagVal]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setGeneratedTags(generatedTags.filter((_, i) => i !== index));
  };

  const resetEditor = () => {
    setGeneratedTitle("");
    setGeneratedContent("");
    setGeneratedTags([]);
    setGeneratedCoverPrompt("");
    setCurrentDraftId(null);
    setShowDiff(false);
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template: WritingTemplate) => {
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(template);
    setTopic(template.placeholder);
    setSelectedTone(template.defaultTone);
    setShowStructure(false);
    toast.success(`已选择"${template.name}"模板`);
  };

  // ─── AI Hashtag Optimization ────────────────────────────────────────────

  const suggestedTags = useMemo(() => {
    const content = (topic + " " + generatedTitle + " " + generatedContent).toLowerCase();
    let tags: string[] = [];

    // Match topic to tag pool
    for (const [keyword, pool] of Object.entries(trendingTagPools)) {
      if (keyword !== "default" && content.includes(keyword)) {
        tags = [...tags, ...pool];
      }
    }

    // Always include default pool
    tags = [...tags, ...trendingTagPools.default];

    // Remove duplicates and already-added tags
    const unique = [...new Set(tags)].filter((t) => !generatedTags.includes(t));
    return unique.slice(0, 8);
  }, [topic, generatedTitle, generatedContent, generatedTags]);

  const handleOptimizeTags = useCallback(async () => {
    if (!generatedContent) return;
    setOptimizingTags(true);

    // Simulate AI analysis with 1-2s delay
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    const content = (topic + " " + generatedTitle + " " + generatedContent).toLowerCase();
    let trendingTagsList: string[] = [];

    for (const [keyword, pool] of Object.entries(trendingTagPools)) {
      if (keyword !== "default" && content.includes(keyword)) {
        trendingTagsList = [...trendingTagsList, ...pool.slice(0, 3)];
      }
    }

    // Add some default trending tags if no matches
    if (trendingTagsList.length < 3) {
      trendingTagsList = [...trendingTagsList, ...trendingTagPools.default.slice(0, 3)];
    }

    // Remove duplicates and already-existing tags
    const newTags = [...new Set(trendingTagsList)].filter((t) => !generatedTags.includes(t)).slice(0, 3);

    // Reorder: trending first, then existing
    const optimizedTags = [...newTags, ...generatedTags];
    setGeneratedTags(optimizedTags);
    setOptimizingTags(false);
    toast.success(`标签已优化！新增${newTags.length}个热门标签`);
  }, [topic, generatedTitle, generatedContent, generatedTags]);

  // ─── Diff Highlighting ────────────────────────────────────────────────

  const DiffView = ({ original, modified }: { original: string; modified: string }) => {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");

    // Simple line-by-line diff
    const renderLine = (line: string, type: "same" | "added" | "removed") => {
      if (type === "added") {
        return (
          <div className="bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium border-l-2 border-emerald-400">
            + {line}
          </div>
        );
      }
      if (type === "removed") {
        return (
          <div className="bg-red-100/60 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-2 py-0.5 text-xs line-through opacity-70 border-l-2 border-red-400">
            - {line}
          </div>
        );
      }
      return <div className="px-2 py-0.5 text-xs text-muted-foreground">{line}</div>;
    };

    // Find differences
    const allLines: { text: string; type: "same" | "added" | "removed" }[] = [];
    const maxLen = Math.max(originalLines.length, modifiedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const orig = originalLines[i] || "";
      const mod = modifiedLines[i] || "";
      if (orig === mod) {
        allLines.push({ text: orig, type: "same" });
      } else {
        if (orig) allLines.push({ text: orig, type: "removed" });
        if (mod) allLines.push({ text: mod, type: "added" });
      }
    }

    return (
      <div className="space-y-px rounded-lg overflow-hidden border border-border/50 bg-muted/20 max-h-48 overflow-y-auto custom-scrollbar">
        {allLines.map((line, i) => (
          <div key={i}>{renderLine(line.text, line.type)}</div>
        ))}
      </div>
    );
  };

  // ─── Quality Score Panel ──────────────────────────────────────────────

  const QualityScorePanel = ({ score }: { score: QualityBreakdown }) => {
    const getScoreColor = (value: number) => {
      if (value > 70) return "text-emerald-600 dark:text-emerald-400";
      if (value >= 40) return "text-amber-600 dark:text-amber-400";
      return "text-red-500 dark:text-red-400";
    };

    const getProgressColor = (value: number) => {
      if (value > 70) return "[&>div]:bg-emerald-500";
      if (value >= 40) return "[&>div]:bg-amber-500";
      return "[&>div]:bg-red-500";
    };

    const subScores = [
      { label: "标题吸引力", value: score.titleAttractiveness, icon: Type },
      { label: "内容可读性", value: score.contentReadability, icon: BookOpen },
      { label: "互动引导", value: score.engagementGuidance, icon: MessageSquare },
      { label: "标签优化", value: score.tagOptimization, icon: Hash },
    ];

    // SVG circular progress
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (score.overall / 100) * circumference;

    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 space-y-4">
        <div className="flex items-center gap-4">
          {/* Circular score indicator */}
          <div className="relative shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="6" />
              <circle
                cx="48" cy="48" r="40" fill="none"
                stroke={score.overall > 70 ? "#10b981" : score.overall >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-extrabold", getScoreColor(score.overall))}>
                {score.overall}
              </span>
              <span className="text-[10px] text-muted-foreground">总体评分</span>
            </div>
          </div>

          {/* Sub-score breakdown */}
          <div className="flex-1 space-y-2.5">
            {subScores.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {item.label}
                    </span>
                    <span className={cn("text-[11px] font-bold", getScoreColor(item.value))}>
                      {item.value}
                    </span>
                  </div>
                  <Progress value={item.value} className={cn("h-1.5", getProgressColor(item.value))} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggestions */}
        {score.suggestions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              改进建议
            </p>
            {score.suggestions.slice(0, 3).map((suggestion, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className="text-xhs shrink-0 mt-0.5">•</span>
                <span className="text-muted-foreground">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Resolve accounts: use shared data when in hub, otherwise standalone
  const accounts = isInHub ? sharedAccountData!.accounts : standaloneAccounts;

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={Sparkles}
          title="还没有添加账号"
          description="添加小红书账号后，即可开始AI创作"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header — hide account selector when in hub (it's in the Sheet header) */}
      <div className="flex items-center justify-between">
        <div>
          {!isInHub && <h2 className="text-xl font-bold tracking-tight">AI 创作助手</h2>}
          <p className={cn("text-muted-foreground", isInHub ? "text-xs" : "text-sm mt-0.5")}>智能内容生成与润色</p>
        </div>
        {!isInHub && (
          <select
            value={selectedAccountId || ""}
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
      </div>

      {/* ─── Writing Templates Section ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-xhs" />
            创作模板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
            {writingTemplates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={cn(
                    "flex-shrink-0 w-28 p-3 rounded-xl border-2 transition-all duration-200 text-center group",
                    isSelected
                      ? "border-xhs bg-xhs-light/20 shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors",
                    isSelected ? "bg-xhs text-white" : "bg-muted text-muted-foreground group-hover:bg-xhs-light/30 group-hover:text-xhs"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={cn(
                    "text-xs font-semibold truncate",
                    isSelected ? "text-xhs" : "text-foreground"
                  )}>
                    {template.emoji} {template.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {template.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Template structure hints */}
          {selectedTemplate && (
            <div className="mt-3">
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-xhs transition-colors"
                onClick={() => setShowStructure(!showStructure)}
              >
                <BookOpen className="w-3 h-3" />
                写作结构
                {showStructure ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showStructure && (
                <div className="mt-2 space-y-1.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                  {selectedTemplate.structure.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-xhs-light text-xhs flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                  {/* Sample tags from template */}
                  {selectedTemplate.sampleTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground">推荐标签：</span>
                      {selectedTemplate.sampleTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          disabled={generatedTags.includes(tag)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] border transition-all",
                            generatedTags.includes(tag)
                              ? "bg-muted/50 text-muted-foreground/40 border-border/30 cursor-not-allowed"
                              : "bg-xhs-light/40 text-xhs/80 border-xhs/20 hover:bg-xhs-light/70 hover:text-xhs cursor-pointer"
                          )}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-xhs" />
            生成内容
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">创作主题</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={selectedTemplate?.placeholder || "输入你想创作的内容主题，例如：分享我的居家好物推荐..."}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) handleGenerate();
              }}
            />
            {/* Topic suggestions */}
            <div>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-xhs transition-colors"
                onClick={() => setShowTopicSuggestions(!showTopicSuggestions)}
              >
                <Lightbulb className="w-3 h-3" />
                需要灵感？
                {showTopicSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTopicSuggestions && (
                <div className="mt-2 flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                  {topicSuggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setTopic(s.prompt)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs hover:border-xhs/30 hover:bg-xhs-light/30 hover:text-xhs transition-all"
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">语气风格</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {toneOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTone(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs",
                    selectedTone === opt.value
                      ? "border-xhs bg-xhs-light text-xhs shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/50"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="w-full bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 h-10"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                AI创作中，请稍候...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                开始创作
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Editor Section */}
      {(generatedContent || generating) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                编辑内容
                {contentQuality > 0 && (
                  <Badge variant="secondary" className={cn("text-[10px] border-0", qualityColor)}>
                    {qualityLabel} · {contentQuality}分
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedContent}
                  className="border-border text-xs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copied ? "已复制" : "复制"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetEditor}
                  className="border-border text-xs"
                >
                  清空
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generating ? (
              <div className="space-y-3 py-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-xhs-light flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-xhs animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">AI正在创作中</p>
                    <p className="text-xs text-muted-foreground mt-1">正在分析主题、生成标题和内容...</p>
                  </div>
                  <div className="w-48">
                    <Progress value={undefined} className="h-1.5" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quality score bar */}
                {contentQuality > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">内容完善度</span>
                      <span className={cn("text-xs font-bold", qualityColor)}>{contentQuality}%</span>
                    </div>
                    <Progress value={contentQuality} className="h-1.5" />
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className={cn(generatedTitle.length > 0 && "text-emerald-600")}>
                        {generatedTitle.length > 0 ? "✓" : "○"} 标题
                      </span>
                      <span className={cn(generatedContent.length >= CONTENT_MIN && "text-emerald-600")}>
                        {generatedContent.length >= CONTENT_MIN ? "✓" : "○"} 正文
                      </span>
                      <span className={cn(generatedTags.length >= 3 && "text-emerald-600")}>
                        {generatedTags.length >= 3 ? "✓" : "○"} 标签
                      </span>
                      <span className={cn(generatedCoverPrompt.length > 5 && "text-emerald-600")}>
                        {generatedCoverPrompt.length > 5 ? "✓" : "○"} 封面提示
                      </span>
                    </div>
                  </div>
                )}

                {/* ─── Detailed Quality Score Panel ──────────────────────── */}
                {qualityScore && qualityScore.overall > 0 && (
                  <QualityScorePanel score={qualityScore} />
                )}

                {/* ─── Before/After Diff View ────────────────────────────── */}
                {showDiff && polishOriginal && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <Wand2 className="w-3 h-3 text-xhs" />
                        润色对比
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 text-muted-foreground"
                        onClick={() => setShowDiff(false)}
                      >
                        <X className="w-3 h-3 mr-0.5" />
                        关闭对比
                      </Button>
                    </div>
                    <DiffView original={polishOriginal} modified={generatedContent} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Type className="w-3 h-3" />
                      标题
                    </Label>
                    <span className={cn(
                      "text-[10px]",
                      generatedTitle.length > TITLE_MAX ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                      {generatedTitle.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    placeholder="输入标题..."
                    className={cn(
                      generatedTitle.length > TITLE_MAX && "border-red-300 focus-visible:ring-red-300"
                    )}
                  />
                  {generatedTitle.length > TITLE_MAX && (
                    <p className="text-[10px] text-red-500">标题建议不超过{TITLE_MAX}字，小红书展示效果更好</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" />
                      正文
                    </Label>
                    <span className={cn(
                      "text-[10px]",
                      generatedContent.length > CONTENT_MAX ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                      {generatedContent.length}/{CONTENT_MAX}
                    </span>
                  </div>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="内容正文..."
                    rows={8}
                    className="resize-y"
                  />
                  {generatedContent.length > 0 && generatedContent.length < CONTENT_MIN && (
                    <p className="text-[10px] text-amber-500">建议正文不少于{CONTENT_MIN}字，内容更丰富</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    标签
                  </Label>
                  {generatedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {generatedTags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 text-xs border-0 bg-xhs-light/60 text-xhs/80">
                          #{tag}
                          <button onClick={() => removeTag(i)} className="hover:text-xhs transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="添加标签"
                      className="text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => addTag()} className="shrink-0 border-border">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Hashtag Suggestions Panel */}
                  {suggestedTags.length > 0 && (
                    <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        推荐标签
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedTags.map((tag) => {
                          const isAlreadyAdded = generatedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => !isAlreadyAdded && addTag(tag)}
                              disabled={isAlreadyAdded}
                              className={cn(
                                "badge-animate-in px-2.5 py-1 rounded-full text-xs transition-all duration-200 border",
                                isAlreadyAdded
                                  ? "bg-muted/50 text-muted-foreground/40 border-border/30 cursor-not-allowed line-through"
                                  : "bg-xhs-light/40 text-xhs/80 border-xhs/20 hover:bg-xhs-light/70 hover:text-xhs hover:border-xhs/40 cursor-pointer"
                              )}
                            >
                              #{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ImagePlus className="w-3 h-3" />
                    封面图提示词
                  </Label>
                  <Input
                    value={generatedCoverPrompt}
                    onChange={(e) => setGeneratedCoverPrompt(e.target.value)}
                    placeholder="描述封面图的画面内容..."
                  />
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  {/* Polish with style options */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPolishStyle(!showPolishStyle)}
                        disabled={!generatedContent}
                        className="border-border text-xs"
                      >
                        <Wand2 className="w-3.5 h-3.5 mr-1" />
                        AI润色
                        <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform", showPolishStyle && "rotate-180")} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOptimizeTags}
                        disabled={optimizingTags || !generatedContent}
                        className="border-border text-xs"
                      >
                        {optimizingTags ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            优化中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            优化标签
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Polish style options */}
                    {showPolishStyle && (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground">选择润色风格</p>
                        <div className="grid grid-cols-2 gap-2">
                          {polishStyleOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setPolishStyle(opt.value)}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all",
                                  polishStyle === opt.value
                                    ? "border-xhs bg-xhs-light/20 text-xhs"
                                    : "border-border hover:border-xhs/30 hover:bg-muted/30 text-foreground"
                                )}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <div className="text-left">
                                  <p className="font-medium">{opt.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          onClick={handlePolish}
                          disabled={polishing || !generatedContent}
                          className="w-full bg-xhs hover:bg-xhs-dark text-white text-xs h-8"
                        >
                          {polishing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              润色中...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3.5 h-3.5 mr-1" />
                              开始润色 · {polishStyleOptions.find((o) => o.value === polishStyle)?.label}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Regenerate + Save */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generating || !topic.trim()}
                      className="border-border text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      重新生成
                    </Button>
                    <Button
                      size="sm"
                      className="bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 text-xs"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                    >
                      {savingDraft ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 mr-1" />
                          保存草稿
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drafts List */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              我的草稿 ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                    currentDraftId === draft.id ? "border-xhs/30 bg-xhs-light/20" : "border-border hover:bg-muted/30"
                  )}
                  onClick={() => handleLoadDraft(draft)}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {draft.title || "无标题草稿"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          draft.status === "ready"
                            ? "default"
                            : draft.status === "polishing"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {draft.status === "draft"
                          ? "草稿"
                          : draft.status === "polishing"
                          ? "润色中"
                          : draft.status === "ready"
                          ? "就绪"
                          : "已发布"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(draft.updatedAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDraft(draft.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
