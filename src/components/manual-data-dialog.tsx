"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PenLine,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Heart,
  MessageCircle,
  Bookmark,
  Tag,
  User,
} from "lucide-react";

interface ManualNote {
  title: string;
  content: string;
  tags: string;
  likes: string;
  comments: string;
  collects: string;
}

interface ManualDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  existingData?: { nickname?: string; followers?: number; following?: number; likedCollected?: number; notesCount?: number; bio?: string; [key: string]: unknown };
  onSuccess: () => void;
}

const emptyNote: ManualNote = {
  title: "",
  content: "",
  tags: "",
  likes: "",
  comments: "",
  collects: "",
};

export function ManualDataDialog({
  open,
  onOpenChange,
  accountId,
  existingData,
  onSuccess,
}: ManualDataDialogProps) {
  // Profile fields
  const [nickname, setNickname] = useState(existingData?.nickname as string || "");
  const [followers, setFollowers] = useState(
    existingData?.followers ? String(existingData.followers) : ""
  );
  const [following, setFollowing] = useState(
    existingData?.following ? String(existingData.following) : ""
  );
  const [likedCollected, setLikedCollected] = useState(
    existingData?.likedCollected ? String(existingData.likedCollected) : ""
  );
  const [notesCount, setNotesCount] = useState(
    existingData?.notesCount ? String(existingData.notesCount) : ""
  );
  const [bio, setBio] = useState(existingData?.bio as string || "");

  // Notes
  const [notes, setNotes] = useState<ManualNote[]>([{ ...emptyNote }]);

  const [saving, setSaving] = useState(false);

  const addNote = () => {
    setNotes([...notes, { ...emptyNote }]);
  };

  const removeNote = (index: number) => {
    if (notes.length <= 1) return;
    setNotes(notes.filter((_, i) => i !== index));
  };

  const updateNote = (index: number, field: keyof ManualNote, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = { ...newNotes[index], [field]: value };
    setNotes(newNotes);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save profile data
      const profileRes = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          followers: Number(followers) || 0,
          following: Number(following) || 0,
          likedCollected: Number(likedCollected) || 0,
          notesCount: Number(notesCount) || 0,
          bio,
        }),
      });
      const profileData = await profileRes.json();

      if (!profileData.success) {
        toast.error(profileData.error || "保存账号信息失败");
        setSaving(false);
        return;
      }

      // Save notes that have at least a title
      const notesWithContent = notes.filter((n) => n.title.trim());
      if (notesWithContent.length > 0) {
        for (const note of notesWithContent) {
          await fetch(`/api/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId,
              title: note.title,
              content: note.content,
              tags: note.tags.split(",").map((t) => t.trim()).filter(Boolean),
              likes: Number(note.likes) || 0,
              comments: Number(note.comments) || 0,
              collects: Number(note.collects) || 0,
            }),
          });
        }
      }

      toast.success("数据已保存");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <PenLine className="w-5 h-5 text-xhs" />
            手动补充数据
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            手动输入账号信息和笔记数据
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5">
            {/* Profile Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-xhs" />
                <p className="text-sm font-semibold">账号信息</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">昵称</label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="小红书昵称"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">粉丝数</label>
                  <Input
                    type="number"
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">关注数</label>
                  <Input
                    type="number"
                    value={following}
                    onChange={(e) => setFollowing(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">获赞与收藏</label>
                  <Input
                    type="number"
                    value={likedCollected}
                    onChange={(e) => setLikedCollected(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">笔记数</label>
                  <Input
                    type="number"
                    value={notesCount}
                    onChange={(e) => setNotesCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">简介</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="账号简介..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-xhs" />
                  <p className="text-sm font-semibold">笔记数据</p>
                  <Badge variant="secondary" className="text-[10px]">{notes.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNote}
                  className="text-xs h-7"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  添加笔记
                </Button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="relative border border-border/60 rounded-xl p-3 space-y-2.5 bg-muted/20"
                  >
                    {/* Note header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        笔记 {idx + 1}
                      </span>
                      {notes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeNote(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Note fields */}
                    <div className="space-y-2">
                      <Input
                        value={note.title}
                        onChange={(e) => updateNote(idx, "title", e.target.value)}
                        placeholder="笔记标题"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={note.content}
                        onChange={(e) => updateNote(idx, "content", e.target.value)}
                        placeholder="笔记内容..."
                        className="min-h-[50px] text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={note.tags}
                          onChange={(e) => updateNote(idx, "tags", e.target.value)}
                          placeholder="标签(逗号分隔)"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <Heart className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-red-400" />
                          <Input
                            type="number"
                            value={note.likes}
                            onChange={(e) => updateNote(idx, "likes", e.target.value)}
                            placeholder="赞"
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                        <div className="relative">
                          <MessageCircle className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" />
                          <Input
                            type="number"
                            value={note.comments}
                            onChange={(e) => updateNote(idx, "comments", e.target.value)}
                            placeholder="评论"
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                        <div className="relative">
                          <Bookmark className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400" />
                          <Input
                            type="number"
                            value={note.collects}
                            onChange={(e) => updateNote(idx, "collects", e.target.value)}
                            placeholder="收藏"
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <DialogFooter className="shrink-0 border-t border-border/40 pt-4 -mx-6 px-6">
          <Button
            className="w-full bg-gradient-to-r from-xhs to-xhs-dark text-white"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 保存中
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
