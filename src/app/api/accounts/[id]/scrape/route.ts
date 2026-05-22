/**
 * Account Scrape API (v4.0 — in-process)
 *
 * Scraping logic now runs directly inside the Next.js process
 * via @/lib/xhs-scraper, eliminating the dependency on the
 * external micro-service that was killed by the sandbox.
 *
 * Body: { cookies: string }   ← required for new flow
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";
import { scrapeProfileWithDetails } from "@/lib/xhs-scraper";
import type { ProfileResult } from "@/lib/xhs-scraper";

function mergeField<T extends string | number>(
  fresh: T | undefined,
  fallback: T | undefined,
  emptyVal: T
): T {
  if (fresh === undefined || fresh === null) return fallback ?? emptyVal;
  if (typeof fresh === "string" && fresh.trim() === "") return fallback ?? emptyVal;
  if (typeof fresh === "number" && fresh === 0 && fallback) return fallback;
  return fresh;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await withDb(() => db.xhsAccount.findUnique({ where: { id } }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: "账号不存在" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let cookies = String((body as { cookies?: string }).cookies || "");
    
    // If no cookies provided in request, try using stored cookies from account record
    if (!cookies && account.cookies) {
      cookies = account.cookies;
    }
    
    if (!cookies) {
      return NextResponse.json(
        {
          success: false,
          error:
            "需要提供 Cookie 才能采集。请使用浏览器扩展导出，或在「Cookie 采集」对话框中粘贴。",
        },
        { status: 400 }
      );
    }

    await withDb(() => db.xhsAccount.update({
      where: { id },
      data: { status: "scraping", errorMessage: "" },
    }));

    // Call scraper directly — runs in-process, no external service needed
    let result: ProfileResult | null = null;
    try {
      result = await scrapeProfileWithDetails(account.xhsUrl, cookies);
    } catch (err) {
      console.error("[scrape] in-process scraper error:", err);
    }

    if (!result) {
      await withDb(() => db.xhsAccount.update({
        where: { id },
        data: {
          status: "error",
          errorMessage:
            "采集服务出错，请检查 Cookie 是否有效或稍后重试",
        },
      }));
      return NextResponse.json(
        { success: false, error: "采集服务出错" },
        { status: 503 }
      );
    }

    const accountStatus = result.partialData ? "partial" : "success";
    const errorMessage =
      result.warnings.length > 0
        ? `[${result.scrapeMethod}] ${result.warnings.join("; ")}`
        : "";

    const updatedAccount = await withDb(() => db.xhsAccount.update({
      where: { id },
      data: {
        nickname: mergeField(result.account.nickname, account.nickname, ""),
        xhsId: mergeField(result.account.xhsId, account.xhsId, ""),
        avatarUrl: mergeField(result.account.avatarUrl, account.avatarUrl, ""),
        bio: mergeField(result.account.bio, account.bio, ""),
        location: mergeField(result.account.location, account.location, ""),
        gender: mergeField(result.account.gender, account.gender, ""),
        followers: mergeField(result.account.followers, account.followers, 0),
        following: mergeField(result.account.following, account.following, 0),
        likedCollected: mergeField(
          result.account.likedCollected,
          account.likedCollected,
          0
        ),
        notesCount: mergeField(
          result.account.notesCount,
          account.notesCount,
          0
        ),
        status: accountStatus,
        lastScrapedAt: new Date(),
        errorMessage,
      },
    }));

    // Upsert posts and their comments
    const postsCreated: string[] = [];
    const commentsCreated: number[] = [0]; // Use array for mutability in closure
    for (const p of result.posts) {
      if (!p.xhsPostId && !p.title) continue;
      const existing = p.xhsPostId
        ? await withDb(() => db.xhsPost.findFirst({
            where: { accountId: id, xhsPostId: p.xhsPostId },
          }))
        : null;
      const data = {
        xhsPostId: p.xhsPostId || "",
        title: p.title || "",
        content: p.content || "",
        coverUrl: p.coverUrl || "",
        imageUrls: JSON.stringify(p.imageUrls || []),
        videoUrl: p.videoUrl || "",
        postType: p.postType || "normal",
        likes: p.likes || 0,
        comments: p.comments || 0,
        collects: p.collects || 0,
        shares: p.shares || 0,
        tags: JSON.stringify(p.tags || []),
        category: "",
        publishDate: p.publishDate || "",
      };
      let postId: string;
      if (existing) {
        await withDb(() => db.xhsPost.update({ where: { id: existing.id }, data }));
        postId = existing.id;
      } else {
        const np = await withDb(() => db.xhsPost.create({ data: { accountId: id, ...data } }));
        postId = np.id;
      }
      postsCreated.push(postId);

      // Save comments for this post
      if (p.commentList && p.commentList.length > 0) {
        for (const comment of p.commentList) {
          if (!comment.content) continue;
          // Check if comment already exists
          const existingComment = comment.xhsCommentId
            ? await withDb(() => db.xhsComment.findFirst({
                where: { postId, xhsCommentId: comment.xhsCommentId },
              }))
            : null;
          if (existingComment) {
            await withDb(() => db.xhsComment.update({
              where: { id: existingComment.id },
              data: {
                content: comment.content,
                userName: comment.userName,
                userAvatar: comment.userAvatar,
                likes: comment.likes,
                subCommentCount: comment.subCommentCount,
                commentDate: comment.commentDate,
              },
            }));
          } else {
            await withDb(() => db.xhsComment.create({
              data: {
                postId,
                xhsCommentId: comment.xhsCommentId || "",
                content: comment.content,
                userName: comment.userName,
                userAvatar: comment.userAvatar,
                likes: comment.likes,
                subCommentCount: comment.subCommentCount,
                commentDate: comment.commentDate,
              },
            }));
            commentsCreated[0]++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        account: updatedAccount,
        postsFound: result.totalFound,
        postsSynced: postsCreated.length,
        commentsSynced: commentsCreated[0],
        warnings: result.warnings,
        partialData: result.partialData,
        scrapeMethod: result.scrapeMethod,
      },
    });
  } catch (error) {
    console.error("Scraping failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "采集失败，请重试",
      },
      { status: 500 }
    );
  }
}
