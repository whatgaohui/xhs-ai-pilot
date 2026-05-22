import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const comments = await withDb(() => db.xhsComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'desc' },
    }));

    const data = comments.map((c) => ({
      id: c.id,
      xhsCommentId: c.xhsCommentId,
      content: c.content,
      userName: c.userName,
      userAvatar: c.userAvatar,
      likes: c.likes,
      subCommentCount: c.subCommentCount,
      commentDate: c.commentDate,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json(
      { success: false, error: '获取评论失败' },
      { status: 500 }
    );
  }
}
