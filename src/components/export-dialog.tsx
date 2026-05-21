"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Database,
  FileText,
  UserCircle,
  BarChart3,
  Calendar,
} from "lucide-react";

type ExportFormat = "json" | "csv";
type DateRange = 7 | 30 | 90;
type DataScope = "accounts" | "posts" | "personas" | "engagement";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const scopeConfig: Record<DataScope, { label: string; icon: typeof Database; description: string }> = {
  accounts: { label: "账号数据", icon: UserCircle, description: "账号信息、粉丝数等" },
  posts: { label: "笔记数据", icon: FileText, description: "笔记内容、互动数据" },
  personas: { label: "人设数据", icon: Database, description: "人设配置、写作风格" },
  engagement: { label: "互动数据", icon: BarChart3, description: "点赞、评论、收藏等" },
};

const dateRangeLabels: Record<DateRange, string> = {
  7: "近7天",
  30: "近30天",
  90: "近90天",
};

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [scopes, setScopes] = useState<DataScope[]>(["accounts", "posts"]);
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [itemCounts, setItemCounts] = useState<Record<DataScope, number>>({
    accounts: 0,
    posts: 0,
    personas: 0,
    engagement: 0,
  });

  const totalItems = useMemo(
    () => scopes.reduce((sum, s) => sum + itemCounts[s], 0),
    [scopes, itemCounts]
  );

  const toggleScope = (scope: DataScope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleExport = async () => {
    if (scopes.length === 0) {
      toast.error("请至少选择一种数据类型");
      return;
    }

    setExporting(true);
    setProgress(0);
    setExportComplete(false);
    setDownloadUrl(null);

    try {
      // Simulate progress steps
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      const scopeParam = scopes.join(",");
      const res = await fetch(
        `/api/export?format=${format}&scope=${scopeParam}&dateRange=${dateRange}`,
        { method: "GET" }
      );

      clearInterval(progressInterval);
      setProgress(95);

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const contentType = res.headers.get("content-type") || "";
      const dateStr = new Date().toISOString().slice(0, 10);

      let blob: Blob;
      let filename: string;

      if (format === "csv") {
        blob = await res.blob();
        filename = `xhs-data-export-${dateStr}.csv`;
      } else {
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "导出失败");
        }
        blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        filename = `xhs-data-export-${dateStr}.json`;

        // Update item counts from response
        if (data.data) {
          setItemCounts({
            accounts: data.data.accounts?.length || 0,
            posts: data.data.accounts?.reduce((s: number, a: Record<string, unknown>) => s + ((a.posts as unknown[]) || []).length, 0) || 0,
            personas: data.data.accounts?.filter((a: Record<string, unknown>) => a.persona).length || 0,
            engagement: data.data.accounts?.reduce((s: number, a: Record<string, unknown>) => s + ((a.posts as unknown[]) || []).length, 0) || 0,
          });
        }
      }

      setProgress(100);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadFilename(filename);
      setExportComplete(true);
      toast.success("数据导出成功！");
    } catch {
      toast.error("导出失败，请重试");
      setExporting(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClose = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setExporting(false);
    setProgress(0);
    setExportComplete(false);
    setDownloadUrl(null);
    setDownloadFilename("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg glass-card border-gradient flex flex-col max-h-[90vh]">
        {/* Gradient border top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-xhs via-rose-400 to-amber-400 shrink-0" />

        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-xhs" />
            导出数据
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            选择导出格式、数据范围和日期范围
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
        {!exportComplete ? (
          <div className="space-y-5 py-2">
            {/* Format Selection */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium">导出格式</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat("json")}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200",
                    format === "json"
                      ? "border-xhs bg-xhs-light/20 shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      format === "json"
                        ? "bg-xhs text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        format === "json" ? "text-xhs" : "text-foreground"
                      )}
                    >
                      JSON
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      完整结构化数据
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setFormat("csv")}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200",
                    format === "csv"
                      ? "border-xhs bg-xhs-light/20 shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      format === "csv"
                        ? "bg-xhs text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        format === "csv" ? "text-xhs" : "text-foreground"
                      )}
                    >
                      CSV
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      表格格式，便于分析
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Data Scope Selection */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium">数据范围</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(scopeConfig) as [DataScope, typeof scopeConfig[DataScope]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon;
                    const isChecked = scopes.includes(key);
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                          isChecked
                            ? "border-xhs/40 bg-xhs-light/10"
                            : "border-border hover:border-border/80 hover:bg-muted/30"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleScope(key)}
                          className="data-[state=checked]:bg-xhs data-[state=checked]:border-xhs"
                        />
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isChecked ? "text-xhs" : "text-muted-foreground"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {config.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {config.description}
                          </p>
                        </div>
                      </label>
                    );
                  }
                )}
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                时间范围
              </Label>
              <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50">
                {([7, 30, 90] as DateRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={cn(
                      "flex-1 h-8 rounded-md text-xs font-medium transition-all duration-200",
                      dateRange === range
                        ? "bg-xhs text-white shadow-sm shadow-xhs/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    {dateRangeLabels[range]}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {scopes.length > 0 && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">导出预览</p>
                <div className="flex flex-wrap gap-1.5">
                  {scopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      className="text-[11px] border-0 bg-xhs-light/40 text-xhs/80"
                    >
                      {scopeConfig[scope].label}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className="text-[11px] border-border"
                  >
                    {dateRangeLabels[dateRange]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] border-border"
                  >
                    {format.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}

            {/* Progress bar during export */}
            {exporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    正在导出...
                  </span>
                  <span className="text-xs font-semibold text-xhs">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={exporting}
                className="flex-1 text-xs"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={exporting || scopes.length === 0}
                className="flex-1 bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 text-xs"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    开始导出
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="space-y-5 py-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">导出完成</p>
                <p className="text-sm text-muted-foreground mt-1">
                  已导出 {totalItems} 条数据 · {format.toUpperCase()} 格式
                </p>
              </div>
            </div>

            {/* Export summary */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
              {scopes.map((scope) => {
                const config = scopeConfig[scope];
                const Icon = config.icon;
                return (
                  <div
                    key={scope}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/60"
                  >
                    <Icon className="w-4 h-4 text-xhs shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {config.label}
                      </p>
                      <p className="text-sm font-semibold">
                        {itemCounts[scope]} 条
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="flex-1 text-xs"
              >
                关闭
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="flex-1 bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                下载文件
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
