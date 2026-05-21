import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// PUT /api/drafts/[id] - Update draft
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, coverPrompt, tags, status, aiModel, aiSuggestions } = body;

    const existing = await withDb(() => db.contentDraft.findUnique({ where: { id } }));
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '草稿不存在' },
        { status: 404 }
      );
    }

    const draft = await withDb(() => db.contentDraft.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(coverPrompt !== undefined && { coverPrompt }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(status !== undefined && { status }),
        ...(aiModel !== undefined && { aiModel }),
        ...(aiSuggestions !== undefined && { aiSuggestions }),
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...draft,
        tags: JSON.parse(draft.tags || '[]'),
      },
    });
  } catch (error) {
    console.error('Failed to update draft:', error);
    return NextResponse.json(
      { success: false, error: '更新草稿失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/drafts/[id] - Delete draft
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await withDb(() => db.contentDraft.findUnique({ where: { id } }));
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '草稿不存在' },
        { status: 404 }
      );
    }

    await withDb(() => db.contentDraft.delete({ where: { id } }));

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return NextResponse.json(
      { success: false, error: '删除草稿失败' },
      { status: 500 }
    );
  }
}
