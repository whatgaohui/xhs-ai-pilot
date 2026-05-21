import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import type { MediaAssetInfo } from '@/types';

// ─── Helper: DB row → MediaAssetInfo ────────────────────────────────────

function toMediaAssetInfo(row: Record<string, unknown>): MediaAssetInfo {
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

// ─── GET /api/media — List media assets ─────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Build where clause
    const where: Record<string, any> = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (source) {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { originalName: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
        { textContent: { contains: search } },
      ];
    }

    const [assets, total] = await withDb(() => Promise.all([
      db.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.mediaAsset.count({ where }),
    ]));

    return NextResponse.json({
      success: true,
      data: {
        items: assets.map((a) => toMediaAssetInfo(a as Record<string, unknown>)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[media] GET error:', error);
    return NextResponse.json(
      { success: false, error: '获取素材列表失败' },
      { status: 500 }
    );
  }
}

// ─── POST /api/media — Create text snippet ──────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, category, tags, description } = body as {
      content?: string;
      category?: string;
      tags?: string[];
      description?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '文本内容不能为空' },
        { status: 400 }
      );
    }

    const asset = await withDb(() => db.mediaAsset.create({
      data: {
        type: 'text',
        fileName: `text_${Date.now()}`,
        originalName: '',
        url: '',
        textContent: content.trim(),
        category: category || '',
        tags: JSON.stringify(tags || []),
        description: description || '',
        mimeType: 'text/plain',
        fileSize: new TextEncoder().encode(content.trim()).length,
        source: 'upload',
      },
    }));

    return NextResponse.json({
      success: true,
      data: toMediaAssetInfo(asset as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[media] POST text error:', error);
    return NextResponse.json(
      { success: false, error: '创建文本素材失败' },
      { status: 500 }
    );
  }
}
