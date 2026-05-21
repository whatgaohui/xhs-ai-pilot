import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// GET /api/accounts/[id] - Get account details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await withDb(() => db.xhsAccount.findUnique({
      where: { id },
      include: {
        persona: true,
        _count: { select: { posts: true, drafts: true } },
      },
    }));

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        postsCount: account._count.posts,
        draftsCount: account._count.drafts,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Failed to get account:', error);
    return NextResponse.json(
      { success: false, error: '获取账号详情失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/accounts/[id] - Update account fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'nickname',
      'bio',
      'location',
      'followers',
      'following',
      'likedCollected',
      'notesCount',
      'xhsId',
      'avatarUrl',
      'status',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可更新的字段' },
        { status: 400 }
      );
    }

    // If user manually edits, upgrade status from partial/error to success
    if (
      updateData.status !== 'scraping' &&
      (await withDb(() => db.xhsAccount.findUnique({ where: { id } })))
    ) {
      const current = await withDb(() => db.xhsAccount.findUnique({ where: { id } }));
      if (current && (current.status === 'partial' || current.status === 'error')) {
        updateData.status = 'success';
        updateData.errorMessage = '';
      }
    }

    const account = await withDb(() => db.xhsAccount.update({
      where: { id },
      data: updateData,
    }));

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('Failed to update account:', error);
    return NextResponse.json(
      { success: false, error: '更新账号失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await withDb(() => db.xhsAccount.findUnique({ where: { id } }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Cascade delete will handle posts, persona, drafts
    await withDb(() => db.xhsAccount.delete({ where: { id } }));

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}
