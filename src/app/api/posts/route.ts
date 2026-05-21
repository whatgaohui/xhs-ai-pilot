import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// POST /api/posts - Create a new post manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, title, content, tags, likes, comments, collects, shares, category } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '缺少accountId' },
        { status: 400 }
      );
    }

    const account = await withDb(() => db.xhsAccount.findUnique({ where: { id: accountId } }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const post = await withDb(() => db.xhsPost.create({
      data: {
        id: uuidv4(),
        accountId,
        xhsPostId: `manual_${Date.now()}`,
        title: title || '',
        content: content || '',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: Number(likes) || 0,
        comments: Number(comments) || 0,
        collects: Number(collects) || 0,
        shares: Number(shares) || 0,
        tags: JSON.stringify(tags || []),
        category: category || '',
        publishDate: new Date().toISOString().split('T')[0],
      },
    }));

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Failed to create post:', error);
    return NextResponse.json(
      { success: false, error: '创建笔记失败' },
      { status: 500 }
    );
  }
}

// GET /api/posts - List posts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const sortBy = searchParams.get('sortBy') || 'date';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const where = accountId ? { accountId } : {};

    // Determine sort order
    let orderBy: Record<string, string> = {};
    switch (sortBy) {
      case 'likes':
        orderBy = { likes: 'desc' };
        break;
      case 'comments':
        orderBy = { comments: 'desc' };
        break;
      case 'collects':
        orderBy = { collects: 'desc' };
        break;
      case 'shares':
        orderBy = { shares: 'desc' };
        break;
      case 'aiScore':
        orderBy = { aiScore: 'desc' };
        break;
      case 'date':
      default:
        orderBy = { publishDate: 'desc' };
        break;
    }

    const posts = await withDb(() => db.xhsPost.findMany({
      where,
      orderBy,
      take: Math.min(limit, 200),
      include: {
        account: {
          select: { nickname: true, avatarUrl: true },
        },
      },
    }));

    const data = posts.map((p) => ({
      id: p.id,
      accountId: p.accountId,
      accountNickname: p.account.nickname,
      accountAvatar: p.account.avatarUrl,
      xhsPostId: p.xhsPostId,
      title: p.title,
      content: p.content,
      coverUrl: p.coverUrl,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      videoUrl: p.videoUrl,
      postType: p.postType,
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      tags: JSON.parse(p.tags || '[]'),
      category: p.category,
      aiScore: p.aiScore,
      aiAnalysis: p.aiAnalysis,
      publishDate: p.publishDate,
      scrapedAt: p.scrapedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to list posts:', error);
    return NextResponse.json(
      { success: false, error: '获取笔记列表失败' },
      { status: 500 }
    );
  }
}
