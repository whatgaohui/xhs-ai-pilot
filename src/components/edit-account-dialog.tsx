"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { XhsAccountInfo } from "@/types";

interface EditAccountDialogProps {
  account: XhsAccountInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onSuccess,
}: EditAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    location: "",
    followers: 0,
    following: 0,
    likedCollected: 0,
    notesCount: 0,
  });

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
    }
  }, [account, open]);

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

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑账号信息</DialogTitle>
          <DialogDescription>
            手动补充或修改小红书账号的基本信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

        <DialogFooter>
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
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
