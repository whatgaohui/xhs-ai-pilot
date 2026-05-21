import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ─── Helper: DB row → MediaAssetInfo ────────────────────────────────────

function toMediaAssetInfo(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    type: (row.type as string) || 'image',
    fileName: (row.fileName as string) || '',
    originalName: (row.originalName as string) || '',
    url: (row.url as string) || '',
    thumbnail: (row.thumbnail as string) || '',
    fileSize: (row.fileSize as number) || 0,
    mimeType: (row.mimeType as string) || '',
    width: (row.width as number) || 0,
    height: (row.height as number) || 0,
    category: (row.category as string) || '',
    tags: JSON.parse((row.tags as string) || '[]'),
    description: (row.description as string) || '',
    aiDescription: (row.aiDescription as string) || '',
    aiTags: JSON.parse((row.aiTags as string) || '[]'),
    aiAnalyzed: (row.aiAnalyzed as boolean) || false,
    source: (row.source as string) || 'upload',
    accountId: (row.accountId as string) || '',
    textContent: (row.textContent as string) || '',
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
  };
}

// ─── Helper: delete file from disk ──────────────────────────────────────

async function deleteFileFromDisk(urlPath: string) {
  if (!urlPath) return;
  try {
    // urlPath is like /uploads/xxx.jpg or /uploads/thumbs/thumb_xxx.jpg
    // (legacy: /api/uploads/xxx.jpg — strip /api prefix)
    const fsPath = urlPath.replace(/^\/api/, '');
    const filePath = path.join(process.cwd(), 'public', fsPath);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (err) {
    console.warn('[media] Failed to delete file:', urlPath, err);
  }
}

// ─── PATCH /api/media/[id] — Update asset metadata ─────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, tags, description, textContent } = body as {
      category?: string;
      tags?: string[];
      description?: string;
      textContent?: string;
    };

    // Check if asset exists
    const existing = await withDb(() => db.mediaAsset.findUnique({ where: { id } }));
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '素材不存在' },
        { status: 404 }
      );
    }

    // Build update data (only include fields that are provided)
    const updateData: Record<string, any> = {};
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (description !== undefined) updateData.description = description;
    if (textContent !== undefined) updateData.textContent = textContent;

    const asset = await withDb(() => db.mediaAsset.update({
      where: { id },
      data: updateData,
    }));

    return NextResponse.json({
      success: true,
      data: toMediaAssetInfo(asset as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[media] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: '更新素材失败' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/media/[id] — Delete asset ──────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if asset exists
    const existing = await withDb(() => db.mediaAsset.findUnique({ where: { id } }));
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '素材不存在' },
        { status: 404 }
      );
    }

    // Delete files from disk
    const existingAsset = existing as Record<string, unknown>;
    const url = (existingAsset.url as string) || '';
    const thumbnail = (existingAsset.thumbnail as string) || '';

    if (url) {
      await deleteFileFromDisk(url);
    }
    if (thumbnail) {
      await deleteFileFromDisk(thumbnail);
    }

    // Delete from database
    await withDb(() => db.mediaAsset.delete({ where: { id } }));

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('[media] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: '删除素材失败' },
      { status: 500 }
    );
  }
}
