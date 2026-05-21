import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// GET /api/drafts - List drafts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (status) where.status = status;

    const drafts = await withDb(() => db.contentDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        account: {
          select: { nickname: true, avatarUrl: true },
        },
      },
    }));

    const data = drafts.map((d) => ({
      ...d,
      tags: JSON.parse(d.tags || '[]'),
      accountNickname: d.account.nickname,
      accountAvatar: d.account.avatarUrl,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to list drafts:', error);
    return NextResponse.json(
      { success: false, error: '获取草稿列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/drafts - Create new draft
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, title, content, coverPrompt, tags, status } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId' },
        { status: 400 }
      );
    }

    // Check account exists
    const account = await withDb(() => db.xhsAccount.findUnique({
      where: { id: accountId },
    }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const draft = await withDb(() => db.contentDraft.create({
      data: {
        accountId,
        title: title || '',
        content: content || '',
        coverPrompt: coverPrompt || '',
        tags: JSON.stringify(tags || []),
        status: status || 'draft',
        aiModel: '',
        aiSuggestions: '',
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          ...draft,
          tags: JSON.parse(draft.tags || '[]'),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create draft:', error);
    return NextResponse.json(
      { success: false, error: '创建草稿失败' },
      { status: 500 }
    );
  }
}
