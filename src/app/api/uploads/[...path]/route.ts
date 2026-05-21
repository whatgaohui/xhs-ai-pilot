import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

/**
 * /api/uploads/[...path] — Serves uploaded files directly from disk
 *
 * Reads files from the uploads directory and serves them with proper
 * Content-Type headers. Avoids proxying to file-server to prevent
 * stream-based crashes in Next.js standalone mode.
 */

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams.path;
    if (!segments || segments.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Prevent path traversal
    const filePath = segments.join('/');
    if (filePath.includes('..')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const fullPath = join(UPLOAD_DIR, filePath);
    const ext = getExt(fullPath);
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    // Check file exists and get size
    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Read file into buffer (safe for small files, avoids stream crashes)
    const buffer = await readFile(fullPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('[uploads] Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
