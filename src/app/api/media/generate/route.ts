import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import ZAI from 'z-ai-web-dev-sdk';

// ─── Constants ──────────────────────────────────────────────────────────

// Use source project's public/uploads for consistent file access across dev/prod
const UPLOAD_DIR = path.join('/home/z/my-project', 'public', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbs');

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

// ─── Helper: ensure directories exist ───────────────────────────────────

async function ensureDirectories() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(THUMB_DIR)) {
    await mkdir(THUMB_DIR, { recursive: true });
  }
}

// ─── POST /api/media/generate — AI generate image ──────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size, category } = body as {
      prompt?: string;
      size?: string;
      category?: string;
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入图片描述提示词' },
        { status: 400 }
      );
    }

    // Generate image using z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: size || '1024x1024',
    });

    const imageBase64 = response.data[0]?.base64;
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'AI 生成图片失败，未返回图片数据' },
        { status: 500 }
      );
    }

    // Save the generated image
    await ensureDirectories();

    const uniqueName = `${crypto.randomUUID()}.png`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    await writeFile(filePath, imageBuffer);

    // Build URL
    const url = `/uploads/${uniqueName}`;

    // Get image dimensions and create thumbnail
    let width = 0;
    let height = 0;
    let thumbnail = '';

    try {
      const metadata = await sharp(filePath).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;

      // Create thumbnail
      const thumbName = `thumb_${uniqueName}`;
      const thumbPath = path.join(THUMB_DIR, thumbName);
      await sharp(filePath)
        .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
        .toFile(thumbPath);
      thumbnail = `/uploads/thumbs/${thumbName}`;
    } catch (err) {
      console.warn('[media/generate] Thumbnail generation failed:', err);
    }

    // Create DB record
    const asset = await withDb(() => db.mediaAsset.create({
      data: {
        type: 'image',
        fileName: uniqueName,
        originalName: '',
        url,
        thumbnail,
        fileSize: imageBuffer.length,
        mimeType: 'image/png',
        width,
        height,
        category: category || '',
        tags: '[]',
        description: prompt.trim(),
        source: 'ai-generated',
      },
    }));

    return NextResponse.json({
      success: true,
      data: toMediaAssetInfo(asset as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[media/generate] POST error:', error);
    const message =
      error instanceof Error ? error.message : 'AI 生成图片失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
