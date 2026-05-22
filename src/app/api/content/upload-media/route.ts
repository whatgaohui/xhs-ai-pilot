import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join('/home/z/my-project', 'public', 'uploads');

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', // images
  '.mp4', '.mov', // videos
]);

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    const ext = getExt(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式，仅支持 PNG/JPG/WebP/MP4/MOV' },
        { status: 400 }
      );
    }

    await ensureDir();

    const uniqueName = `media_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const mediaUrl = `/uploads/${uniqueName}`;
    const isVideo = ext === '.mp4' || ext === '.mov';

    console.log(`[upload-media] File saved: ${uniqueName} (${buffer.length} bytes, ${isVideo ? 'video' : 'image'})`);

    return NextResponse.json({
      success: true,
      data: {
        url: mediaUrl,
        fileName: uniqueName,
        originalName: file.name,
        fileSize: buffer.length,
        mimeType: MIME_MAP[ext] || 'application/octet-stream',
        type: isVideo ? 'video' : 'image',
      },
    });
  } catch (error) {
    console.error('[upload-media] POST error:', error);
    const message =
      error instanceof Error ? error.message : '文件上传失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
