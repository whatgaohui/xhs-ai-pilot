import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// GET /api/accounts - List all accounts
export async function GET() {
  try {
    const accounts = await withDb(() => db.xhsAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { posts: true, drafts: true } },
      },
    }));

    return NextResponse.json({
      success: true,
      data: accounts.map((a) => ({
        ...a,
        postsCount: a._count.posts,
        draftsCount: a._count.drafts,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error('Failed to list accounts:', error);
    return NextResponse.json(
      { success: false, error: '获取账号列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Add new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xhsUrl } = body;

    if (!xhsUrl || typeof xhsUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供小红书主页链接' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (
      !xhsUrl.includes('xiaohongshu.com') &&
      !xhsUrl.includes('xhslink.com')
    ) {
      return NextResponse.json(
        { success: false, error: '请提供有效的小红书链接' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await withDb(() => db.xhsAccount.findUnique({ where: { xhsUrl } }));
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该账号已存在' },
        { status: 409 }
      );
    }

    // Create account with idle status (scraping will be triggered separately)
    const account = await withDb(() => db.xhsAccount.create({
      data: {
        xhsUrl,
        status: 'idle',
      },
    }));

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    console.error('Failed to create account:', error);
    return NextResponse.json(
      { success: false, error: '创建账号失败' },
      { status: 500 }
    );
  }
}
