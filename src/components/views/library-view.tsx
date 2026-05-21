"use client";

/**
 * LibraryView — 素材管理 (v4.0, complete implementation)
 *
 * Full-featured material management with:
 * - Drag & drop upload + text snippet creation + AI image generation
 * - Grid/List view with responsive layout
 * - Asset detail dialog with metadata editing
 * - AI analysis integration
 * - Debounced search, type filter, sort, pagination
 * - Delete confirmation, toast feedback
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  Sparkles,
  LayoutGrid,
  List,
  Play,
  Trash2,
  Pencil,
  ScanSearch,
  Download,
  X,
  Plus,
  Loader2,
  Wand2,
  MoreHorizontal,
  ChevronDown,
  FileUp,
  Type,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { getMediaUrl } from "@/lib/media-url";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ──────────────────────────────────────────────────────────────────

type AssetType = "all" | "image" | "video" | "text";
type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "name" | "size";

interface MediaAssetInfo {
  id: string;
  type: "image" | "video" | "text";
  fileName: string;
  originalName: string;
  url: string;
  thumbnail: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  category: string;
  tags: string[];
  description: string;
  aiDescription: string;
  aiTags: string[];
  aiAnalyzed: boolean;
  source: "upload" | "ai-generated" | "scraped";
  accountId: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data?: {
    items: MediaAssetInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function sourceLabel(source: string): string {
  switch (source) {
    case "upload":
      return "上传";
    case "ai-generated":
      return "AI生成";
    case "scraped":
      return "采集";
    default:
      return source;
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "image":
      return "图片";
    case "video":
      return "视频";
    case "text":
      return "文字";
    default:
      return type;
  }
}

const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];
const ACCEPT_STRING = ACCEPTED_MIME.join(",");
const PAGE_SIZE = 20;

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Skeleton grid shown while loading */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton list shown while loading */
function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LibraryView() {
  // --- State ---
  const [assets, setAssets] = useState<MediaAssetInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<AssetType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetInfo | null>(null);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [aiGenDialogOpen, setAiGenDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<MediaAssetInfo | null>(null);

  // Upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text snippet form
  const [textContent, setTextContent] = useState("");
  const [textCategory, setTextCategory] = useState("");
  const [textTags, setTextTags] = useState("");
  const [textDescription, setTextDescription] = useState("");
  const [textSubmitting, setTextSubmitting] = useState(false);

  // AI generate form
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSize, setAiSize] = useState("1024x1024");
  const [aiCategory, setAiCategory] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Edit metadata (inside detail dialog)
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Analyze
  const [analyzing, setAnalyzing] = useState(false);

  // Batch operations
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // --- Debounced search ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Fetch assets ---
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", filterType === "all" ? "all" : filterType);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/media?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      const json: ListResponse = await res.json();
      const data = json.data;
      setAssets(data?.items || []);
      setTotal(data?.total || 0);
    } catch {
      toast.error("加载素材失败");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, debouncedSearch, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterType, debouncedSearch]);

  // --- Upload ---
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const validFiles = fileArr.filter((f) => ACCEPTED_MIME.includes(f.type));
      if (validFiles.length === 0) {
        toast.error("不支持的文件格式");
        return;
      }

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        if (textCategory) formData.append("category", textCategory);

        setUploadProgress(0);
        try {
          // Use XMLHttpRequest for progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/media/upload");
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100));
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(formData);
          });
          toast.success(`${file.name} 上传成功`);
        } catch {
          toast.error(`${file.name} 上传失败`);
        }
      }
      setUploadProgress(null);
      fetchAssets();
    },
    [textCategory, fetchAssets]
  );

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  // --- Delete ---
  const confirmDelete = useCallback((asset: MediaAssetInfo) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!assetToDelete) return;
    try {
      const res = await fetch(`/api/media/${assetToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("删除成功");
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
      if (selectedAsset?.id === assetToDelete.id) {
        setDetailOpen(false);
        setSelectedAsset(null);
      }
      fetchAssets();
    } catch {
      toast.error("删除失败");
    }
  }, [assetToDelete, selectedAsset, fetchAssets]);

  // --- Detail dialog helpers ---
  const openDetail = useCallback((asset: MediaAssetInfo) => {
    setSelectedAsset(asset);
    setEditCategory(asset.category || "");
    setEditTags(asset.tags?.join(", ") || "");
    setEditDescription(asset.description || "");
    setDetailOpen(true);
  }, []);

  const saveMetadata = useCallback(async () => {
    if (!selectedAsset) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        category: editCategory,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: editDescription,
      };
      if (selectedAsset.type === "text" && editDescription) {
        // textContent remains unchanged unless user edits it in a separate field
      }
      const res = await fetch(`/api/media/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("保存成功");
      fetchAssets();
      // Refresh selected asset — API returns { success: true, data: MediaAssetInfo }
      const updated = await res.json();
      if (updated.data) {
        setSelectedAsset((prev) => (prev ? { ...prev, ...updated.data } : prev));
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setEditSaving(false);
    }
  }, [selectedAsset, editCategory, editTags, editDescription, fetchAssets]);

  // --- AI Analyze ---
  const analyzeAsset = useCallback(async () => {
    if (!selectedAsset) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/media/${selectedAsset.id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success("AI 分析完成");
      if (json.data?.asset) {
        setSelectedAsset(json.data.asset);
      } else {
        setSelectedAsset((prev) =>
          prev ? { ...prev, aiAnalyzed: true, aiDescription: json.data?.aiDescription || '', aiTags: json.data?.aiTags || [] } : prev
        );
      }
      fetchAssets();
    } catch {
      toast.error("AI 分析失败");
    } finally {
      setAnalyzing(false);
    }
  }, [selectedAsset, fetchAssets]);

  // --- Text snippet submit ---
  const submitText = useCallback(async () => {
    if (!textContent.trim()) {
      toast.error("请输入文字内容");
      return;
    }
    setTextSubmitting(true);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textContent,
          category: textCategory || undefined,
          tags: textTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          description: textDescription || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("文字片段创建成功");
      setTextDialogOpen(false);
      setTextContent("");
      setTextCategory("");
      setTextTags("");
      setTextDescription("");
      fetchAssets();
    } catch {
      toast.error("创建失败");
    } finally {
      setTextSubmitting(false);
    }
  }, [textContent, textCategory, textTags, textDescription, fetchAssets]);

  // --- AI Generate ---
  const generateAiImage = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast.error("请输入生成描述");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          size: aiSize,
          category: aiCategory || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("AI 图片生成成功");
      setAiGenDialogOpen(false);
      setAiPrompt("");
      setAiCategory("");
      fetchAssets();
    } catch {
      toast.error("AI 生成失败");
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiSize, aiCategory, fetchAssets]);

  // --- Sort assets client-side ---
  const sortedAssets = useMemo(() => {
    const sorted = [...assets];
    switch (sortOption) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name":
        sorted.sort((a, b) => (a.originalName || a.fileName).localeCompare(b.originalName || b.fileName));
        break;
      case "size":
        sorted.sort((a, b) => b.fileSize - a.fileSize);
        break;
    }
    return sorted;
  }, [assets, sortOption]);

  const hasMore = page * PAGE_SIZE < total;
  const isEmpty = !loading && assets.length === 0;

  // --- Filter tab config ---
  const filters: { id: AssetType; label: string; icon: typeof ImageIcon }[] = [
    { id: "all", label: "全部", icon: FolderOpen },
    { id: "image", label: "图片", icon: ImageIcon },
    { id: "video", label: "视频", icon: Video },
    { id: "text", label: "文字", icon: FileText },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 view-animate">
      {/* ── 1. Unified Page Header ────────────────────────────────────── */}
      <PageHeader
        icon={<FolderOpen className="w-6 h-6" />}
        title="素材管理"
        subtitle={loading ? "加载中..." : `共 ${total} 个素材${!loading && total > 0 ? " · 上传图片、视频、文字片段，创作笔记时一键调用" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Upload button with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="btn-gradient-brand text-white border-0 gap-1.5">
                  <Upload className="w-4 h-4" />
                  上传素材
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  上传文件
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTextDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Type className="w-4 h-4" />
                  文字片段
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
              onClick={() => setAiGenDialogOpen(true)}
            >
              <Sparkles className="w-4 h-4" />
              AI 生成图片
            </Button>
          </div>
        }
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ── 2. Toolbar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-md min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="搜索素材名称、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = filterType === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="网格视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="列表视图"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Sort */}
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[120px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">最新</SelectItem>
            <SelectItem value="oldest">最早</SelectItem>
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="size">大小</SelectItem>
          </SelectContent>
        </Select>

        {/* Batch mode toggle */}
        <Button
          variant={batchMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5 h-9",
            batchMode
              ? "bg-rose-600 text-white hover:bg-rose-700 border-0"
              : "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
          )}
          onClick={() => {
            setBatchMode(!batchMode);
            if (batchMode) {
              setSelectedIds(new Set());
            }
          }}
        >
          <CheckSquare className="w-4 h-4" />
          {batchMode ? "退出批量" : "批量选择"}
        </Button>
      </div>

      {/* ── 3. Upload Zone ────────────────────────────────────────────── */}
      {uploadProgress !== null && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-800/50 dark:bg-rose-950/20 p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium">上传中...</p>
            <div className="mt-1.5 h-2 rounded-full bg-rose-100 dark:bg-rose-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-rose-600 dark:text-rose-400 tabular-nums">
            {uploadProgress}%
          </span>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed transition-all p-10 text-center cursor-pointer group",
          isDragOver
            ? "border-rose-400 bg-rose-50/60 dark:border-rose-500 dark:bg-rose-950/30"
            : "border-border/60 bg-muted/20 hover:bg-muted/30 hover:border-rose-300/60"
        )}
      >
        <div
          className={cn(
            "w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 transition-transform",
            isDragOver
              ? "bg-gradient-brand scale-110"
              : "bg-gradient-brand-soft group-hover:scale-110"
          )}
        >
          <Upload className={cn("w-7 h-7", isDragOver ? "text-white" : "text-rose-500")} />
        </div>
        <h3 className="font-semibold text-base">
          {isDragOver ? "松开即可上传" : "拖拽文件到这里上传"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          或点击此处选择文件 · 支持 JPG / PNG / WebP / GIF / MP4 / WebM
        </p>
        <p className="text-xs text-muted-foreground/70 mt-3">
          图片单文件 &le; 5MB · 视频 &le; 100MB
        </p>
      </div>

      {/* ── 4/5. Content Area ─────────────────────────────────────────── */}
      {loading && page === 1 ? (
        viewMode === "grid" ? (
          <SkeletonGrid />
        ) : (
          <SkeletonList />
        )
      ) : isEmpty ? (
        /* ── 10. Empty State ──────────────────────────────────────────── */
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-brand-soft flex items-center justify-center mb-4 animate-float">
            <FolderOpen className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="font-semibold gradient-text-brand">素材库还空着</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            上传你的第一份素材，开始构建创作弹药库。所有素材都会在 AI 创作笔记时供你选择插入。
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              上传文件
            </Button>
            <Button
              size="sm"
              className="gap-1.5 btn-gradient-brand text-white border-0"
              onClick={() => setAiGenDialogOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 生成图片
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ── 4. Asset Grid View ──────────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sortedAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => openDetail(asset)}
              onDelete={() => confirmDelete(asset)}
              batchMode={batchMode}
              isSelected={selectedIds.has(asset.id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(asset.id)) {
                    next.delete(asset.id);
                  } else {
                    next.add(asset.id);
                  }
                  return next;
                });
              }}
            />
          ))}
        </div>
      ) : (
        /* ── 5. Asset List View ──────────────────────────────────────── */
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {/* Table header */}
          <div className={cn(
            "grid gap-2 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border/60",
            batchMode ? "grid-cols-[32px_32px_1fr_60px_80px_80px_80px_60px_80px]" : "grid-cols-[40px_1fr_60px_80px_80px_80px_60px_80px]"
          )}>
            {batchMode && <span />}
            <span />
            <span>名称</span>
            <span>类型</span>
            <span>大小</span>
            <span>分类</span>
            <span>来源</span>
            <span>日期</span>
            <span className="text-right">操作</span>
          </div>
          {sortedAssets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              onClick={() => openDetail(asset)}
              onDelete={() => confirmDelete(asset)}
              batchMode={batchMode}
              isSelected={selectedIds.has(asset.id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(asset.id)) {
                    next.delete(asset.id);
                  } else {
                    next.add(asset.id);
                  }
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}

      {/* ── 11. Pagination ─────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            显示 {Math.min((page - 1) * PAGE_SIZE + 1, total)} -{" "}
            {Math.min(page * PAGE_SIZE, total)} / 共 {total} 个
          </span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="w-3.5 h-3.5" />
              )}
              加载更多
            </Button>
          )}
        </div>
      )}

      {/* ── 6. Asset Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAsset.type === "image" && <ImageIcon className="w-5 h-5 text-rose-500" />}
                  {selectedAsset.type === "video" && <Video className="w-5 h-5 text-rose-500" />}
                  {selectedAsset.type === "text" && <FileText className="w-5 h-5 text-rose-500" />}
                  {selectedAsset.originalName || selectedAsset.fileName}
                </DialogTitle>
                <DialogDescription>
                  {typeLabel(selectedAsset.type)} · {formatFileSize(selectedAsset.fileSize)} ·{" "}
                  {formatRelativeDate(selectedAsset.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Preview */}
              <div className="rounded-lg overflow-hidden bg-muted/30 border border-border/60">
                {selectedAsset.type === "image" && (
                  <img
                    src={getMediaUrl(selectedAsset.url || selectedAsset.thumbnail)}
                    alt={selectedAsset.originalName}
                    className="w-full max-h-[400px] object-contain"
                  />
                )}
                {selectedAsset.type === "video" && (
                  <video
                    src={getMediaUrl(selectedAsset.url)}
                    controls
                    className="w-full max-h-[400px]"
                    poster={selectedAsset.thumbnail ? getMediaUrl(selectedAsset.thumbnail) : undefined}
                  />
                )}
                {selectedAsset.type === "text" && (
                  <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedAsset.textContent}
                    </p>
                  </div>
                )}
              </div>

              {/* AI section */}
              {selectedAsset.aiAnalyzed && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-rose-500" />
                    AI 分析结果
                  </h4>
                  {selectedAsset.aiDescription && (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                      {selectedAsset.aiDescription}
                    </p>
                  )}
                  {selectedAsset.aiTags && selectedAsset.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAsset.aiTags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-0 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Metadata editing */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  编辑信息
                </h4>

                {/* Source badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">来源</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border-0",
                      selectedAsset.source === "upload" && "badge-source-upload",
                      selectedAsset.source === "ai-generated" && "badge-source-ai",
                      selectedAsset.source === "scraped" && "badge-source-scraped"
                    )}
                  >
                    {sourceLabel(selectedAsset.source)}
                  </Badge>
                  {selectedAsset.aiAnalyzed && (
                    <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-0 text-xs gap-1">
                      <Wand2 className="w-3 h-3" />
                      AI已分析
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                  <span className="text-xs text-muted-foreground w-14">分类</span>
                  <Input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="输入分类"
                    className="h-8 text-sm"
                  />

                  <span className="text-xs text-muted-foreground">标签</span>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="逗号分隔，如：美食,探店"
                    className="h-8 text-sm"
                  />

                  <span className="text-xs text-muted-foreground">描述</span>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="添加描述..."
                    className="min-h-[60px] text-sm"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={saveMetadata}
                  disabled={editSaving}
                  className="gap-1.5"
                >
                  {editSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                  保存修改
                </Button>
              </div>

              <Separator />

              {/* Actions */}
              <DialogFooter className="flex-row gap-2 sm:justify-start">
                {selectedAsset.type === "image" && !selectedAsset.aiAnalyzed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={analyzeAsset}
                    disabled={analyzing}
                    className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    {analyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ScanSearch className="w-3.5 h-3.5" />
                    )}
                    AI 分析
                  </Button>
                )}
                {selectedAsset.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const a = document.createElement("a");
                      // Use the API route URL for downloading (works in standalone mode)
                      a.href = getMediaUrl(selectedAsset.url);
                      a.download = selectedAsset.originalName || selectedAsset.fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => {
                    setDetailOpen(false);
                    confirmDelete(selectedAsset);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 7. Text Snippet Creation Dialog ────────────────────────────── */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Type className="w-5 h-5 text-rose-500" />
              创建文字片段
            </DialogTitle>
            <DialogDescription>保存常用文案、金句、段落，写笔记时一键插入</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                内容 <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="输入文字内容..."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">分类</label>
                <Input
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  placeholder="如：金句、开头"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">标签</label>
                <Input
                  value={textTags}
                  onChange={(e) => setTextTags(e.target.value)}
                  placeholder="逗号分隔"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">描述</label>
              <Input
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                placeholder="可选描述"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTextDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={submitText}
              disabled={textSubmitting || !textContent.trim()}
              className="btn-gradient-brand text-white border-0 gap-1.5"
            >
              {textSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. AI Generate Image Dialog ────────────────────────────────── */}
      <Dialog open={aiGenDialogOpen} onOpenChange={setAiGenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              AI 生成图片
            </DialogTitle>
            <DialogDescription>输入描述，AI 为你生成创作素材</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                生成描述 <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="描述你想要的图片，如：一杯咖啡旁边放着笔记本电脑，温馨的咖啡馆氛围，暖色调..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">尺寸</label>
                <Select value={aiSize} onValueChange={setAiSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                    <SelectItem value="1344x768">1344 × 768</SelectItem>
                    <SelectItem value="768x1344">768 × 1344</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">分类</label>
                <Input
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value)}
                  placeholder="可选分类"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGenDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={generateAiImage}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="btn-gradient-brand text-white border-0 gap-1.5"
            >
              {aiGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {aiGenerating ? "生成中..." : "生成图片"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 12. Delete Confirmation ────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除素材{" "}
              <span className="font-medium text-foreground">
                {assetToDelete?.originalName || assetToDelete?.fileName}
              </span>{" "}
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 13. Batch Action Toolbar ───────────────────────────────────── */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-rose-200 bg-background/95 backdrop-blur-md shadow-xl px-5 py-3 dark:border-rose-800">
          <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
            已选择 {selectedIds.size} 项
          </span>
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              if (selectedIds.size === sortedAssets.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(sortedAssets.map((a) => a.id)));
              }
            }}
          >
            {selectedIds.size === sortedAssets.length ? (
              <>
                <Square className="w-3.5 h-3.5" />
                取消全选
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                全选
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setBatchDeleteDialogOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            批量删除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              setBatchMode(false);
              setSelectedIds(new Set());
            }}
          >
            取消
          </Button>
        </div>
      )}

      {/* ── 14. Batch Delete Confirmation ──────────────────────────────── */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的{" "}
              <span className="font-medium text-foreground">{selectedIds.size}</span>{" "}
              个素材吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setBatchDeleting(true);
                let successCount = 0;
                let failCount = 0;
                const ids = Array.from(selectedIds);
                for (const id of ids) {
                  try {
                    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error();
                    successCount++;
                  } catch {
                    failCount++;
                  }
                }
                setBatchDeleting(false);
                setBatchDeleteDialogOpen(false);
                setBatchMode(false);
                setSelectedIds(new Set());
                if (failCount === 0) {
                  toast.success(`成功删除 ${successCount} 个素材`);
                } else {
                  toast.error(`${successCount} 个删除成功，${failCount} 个删除失败`);
                }
                fetchAssets();
              }}
              disabled={batchDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {batchDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  删除中...
                </span>
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Asset Card (Grid View) ────────────────────────────────────────────────

function AssetCard({
  asset,
  onClick,
  onDelete,
  batchMode,
  isSelected,
  onToggleSelect,
}: {
  asset: MediaAssetInfo;
  onClick: () => void;
  onDelete: () => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <div
      className={cn(
        "card-elevated group cursor-pointer relative overflow-hidden transition-all",
        batchMode && isSelected && "ring-2 ring-rose-500 border-rose-500 shadow-md"
      )}
      onClick={() => {
        if (batchMode) {
          onToggleSelect?.();
        } else {
          onClick();
        }
      }}
    >
      {/* Batch checkbox overlay */}
      {batchMode && (
        <div className="absolute top-2 right-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "h-5 w-5 rounded-md border-2 transition-all",
              isSelected
                ? "bg-rose-500 border-rose-500 text-white"
                : "bg-white/80 border-white/80 hover:border-rose-400 dark:bg-black/50 dark:border-white/30"
            )}
          />
        </div>
      )}

      {/* Thumbnail area */}
      <div className="aspect-square rounded-t-xl bg-muted overflow-hidden relative">
        {asset.type === "image" && (asset.thumbnail || asset.url) && (
          <img
            src={getMediaUrl(asset.thumbnail || asset.url)}
            alt={asset.originalName || asset.fileName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
        {asset.type === "video" && (asset.thumbnail || asset.url) && (
          <div className="relative w-full h-full">
            <img
              src={getMediaUrl(asset.thumbnail || asset.url)}
              alt={asset.originalName || asset.fileName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-rose-600 ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
        )}
        {asset.type === "text" && (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-brand-soft">
            <FileText className="w-8 h-8 text-rose-400 mb-2" />
            <p className="text-xs text-muted-foreground line-clamp-3 text-center leading-relaxed">
              {asset.textContent?.slice(0, 100) || asset.description || "文字片段"}
            </p>
          </div>
        )}
        {!(asset.thumbnail || asset.url) && asset.type !== "text" && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {asset.type === "video" ? (
              <Video className="w-8 h-8" />
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge
            className={cn(
              "text-[10px] border-0 px-1.5 py-0 h-5",
              asset.source === "upload" && "bg-blue-500/80 text-white",
              asset.source === "ai-generated" && "bg-purple-500/80 text-white",
              asset.source === "scraped" && "bg-amber-500/80 text-white"
            )}
          >
            {sourceLabel(asset.source)}
          </Badge>
          {asset.aiAnalyzed && (
            <Badge className="text-[10px] border-0 px-1.5 py-0 h-5 bg-rose-500/80 text-white gap-0.5">
              <Wand2 className="w-2.5 h-2.5" />
              AI
            </Badge>
          )}
        </div>

        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-1.5 pb-3">
            {asset.type === "image" && !asset.aiAnalyzed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Quick analyze — handled via detail dialog flow
                  onClick();
                }}
                className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
                title="AI 分析"
              >
                <ScanSearch className="w-4 h-4 text-rose-600" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs truncate font-medium">
          {asset.originalName || asset.fileName}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {asset.type === "text"
            ? `${asset.textContent?.length || 0} 字`
            : formatFileSize(asset.fileSize)}
        </p>
      </div>
    </div>
  );
}

// ─── Asset Row (List View) ─────────────────────────────────────────────────

function AssetRow({
  asset,
  onClick,
  onDelete,
  batchMode,
  isSelected,
  onToggleSelect,
}: {
  asset: MediaAssetInfo;
  onClick: () => void;
  onDelete: () => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 px-4 py-2.5 items-center border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group",
        batchMode && isSelected && "bg-rose-50/60 dark:bg-rose-950/20 border-l-2 border-l-rose-500",
        batchMode ? "grid-cols-[32px_32px_1fr_60px_80px_80px_80px_60px_80px]" : "grid-cols-[40px_1fr_60px_80px_80px_80px_60px_80px]"
      )}
      onClick={() => {
        if (batchMode) {
          onToggleSelect?.();
        } else {
          onClick();
        }
      }}
    >
      {/* Batch checkbox */}
      {batchMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect?.()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "h-4 w-4 rounded transition-all",
            isSelected && "bg-rose-500 border-rose-500 text-white"
          )}
        />
      )}

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0">
        {asset.type === "image" && (asset.thumbnail || asset.url) && (
          <img
            src={getMediaUrl(asset.thumbnail || asset.url)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {asset.type === "video" && (
          <div className="w-full h-full relative">
            {asset.thumbnail ? (
              <img
                src={getMediaUrl(asset.thumbnail)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Video className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
        {asset.type === "text" && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-brand-soft">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm truncate font-medium">
        {asset.originalName || asset.fileName}
      </span>

      {/* Type */}
      <Badge variant="outline" className="text-[10px] h-5 w-fit border-0 bg-muted/60">
        {typeLabel(asset.type)}
      </Badge>

      {/* Size */}
      <span className="text-xs text-muted-foreground">
        {asset.type === "text"
          ? `${asset.textContent?.length || 0} 字`
          : formatFileSize(asset.fileSize)}
      </span>

      {/* Category */}
      <span className="text-xs text-muted-foreground truncate">
        {asset.category || "-"}
      </span>

      {/* Source */}
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] h-5 w-fit border-0",
          asset.source === "upload" && "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
          asset.source === "ai-generated" && "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
          asset.source === "scraped" && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
        )}
      >
        {sourceLabel(asset.source)}
      </Badge>

      {/* Date */}
      <span className="text-xs text-muted-foreground">
        {formatRelativeDate(asset.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}
