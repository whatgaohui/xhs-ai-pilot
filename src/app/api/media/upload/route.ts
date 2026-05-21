import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbs');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm']);

const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

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

// ─── POST /api/media/upload — Upload file ──────────────────────────────

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未选择文件' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `不支持的文件格式: ${file.type}` },
        { status: 400 }
      );
    }

    // Ensure upload directories exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    if (!existsSync(THUMB_DIR)) {
      await mkdir(THUMB_DIR, { recursive: true });
    }

    // Generate unique filename
    const ext = EXT_MAP[file.type] || path.extname(file.name) || '.bin';
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Determine type
    const isImage = IMAGE_MIME.has(file.type);
    const isVideo = VIDEO_MIME.has(file.type);
    const assetType = isImage ? 'image' : isVideo ? 'video' : 'image';

    // Get image dimensions and create thumbnail
    let width = 0;
    let height = 0;
    let thumbnailUrl = '';

    if (isImage) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;

        // Create thumbnail
        const thumbName = `thumb_${uniqueName}`;
        const thumbPath = path.join(THUMB_DIR, thumbName);
        await sharp(buffer)
          .resize(200, 200, { fit: 'cover', withoutEnlargement: true })
          .toFile(thumbPath);
        thumbnailUrl = `/uploads/thumbs/${thumbName}`;
      } catch (err) {
        console.warn('[media/upload] Thumbnail generation failed:', err);
      }
    }

    // Build URL (served via file-server through Caddy gateway)
    const url = `/uploads/${uniqueName}`;

    // Save to database
    const asset = await withDb(() => db.mediaAsset.create({
      data: {
        type: assetType,
        fileName: uniqueName,
        originalName: file.name,
        url,
        thumbnail: thumbnailUrl,
        fileSize: buffer.length,
        mimeType: file.type,
        width,
        height,
        category: category || '',
        tags: JSON.stringify([]),
        description: '',
        source: 'upload',
      },
    }));

    return NextResponse.json({
      success: true,
      data: toMediaAssetInfo(asset as Record<string, unknown>),
    });
  } catch (error) {
    console.error('[media/upload] Error:', error);
    return NextResponse.json(
      { success: false, error: '上传失败' },
      { status: 500 }
    );
  }
}
