/**
 * Scrape Comments for a Post
 *
 * Re-scrapes a single post's detail page to collect its comments.
 * Uses the stored xsecToken and the account's cookies.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";
import { scrapeNoteViaHTML } from "@/lib/xhs-scraper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the post
    const post = await withDb(() => db.xhsPost.findUnique({
      where: { id },
      include: { account: true },
    }));

    if (!post) {
      return NextResponse.json(
        { success: false, error: "笔记不存在" },
        { status: 404 }
      );
    }

    if (!post.xhsPostId) {
      return NextResponse.json(
        { success: false, error: "笔记缺少小红书ID" },
        { status: 400 }
      );
    }

    // Get cookies from the account
    const cookies = post.account?.cookies;
    if (!cookies) {
      return NextResponse.json(
        { success: false, error: "请先添加 Cookie 才能采集评论" },
        { status: 400 }
      );
    }

    // Scrape the note detail page
    const detail = await scrapeNoteViaHTML(
      post.xhsPostId,
      post.xsecToken || "",
      cookies
    );

    if (!detail) {
      return NextResponse.json(
        { success: false, error: "采集笔记详情失败，Cookie 可能已失效" },
        { status: 503 }
      );
    }

    // Update post data
    await withDb(() => db.xhsPost.update({
      where: { id },
      data: {
        likes: detail.likes || post.likes,
        comments: detail.comments || post.comments,
        collects: detail.collects || post.collects,
        shares: detail.shares || post.shares,
        xsecToken: detail.xsecToken || post.xsecToken,
      },
    }));

    // Upsert comments
    let commentsSynced = 0;
    if (detail.commentList && detail.commentList.length > 0) {
      for (const comment of detail.commentList) {
        if (!comment.content) continue;
        const existingComment = comment.xhsCommentId
          ? await withDb(() => db.xhsComment.findFirst({
              where: { postId: id, xhsCommentId: comment.xhsCommentId },
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
              postId: id,
              xhsCommentId: comment.xhsCommentId || "",
              content: comment.content,
              userName: comment.userName,
              userAvatar: comment.userAvatar,
              likes: comment.likes,
              subCommentCount: comment.subCommentCount,
              commentDate: comment.commentDate,
            },
          }));
          commentsSynced++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        commentsSynced,
        totalComments: detail.commentList?.length || 0,
        postLikes: detail.likes,
        postComments: detail.comments,
      },
    });
  } catch (error) {
    console.error("Scrape comments failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "采集评论失败" },
      { status: 500 }
    );
  }
}
