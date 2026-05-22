import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import ZAI from 'z-ai-web-dev-sdk';

const UPLOAD_DIR = path.join('/home/z/my-project', 'public', 'uploads');

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入封面图描述提示词' },
        { status: 400 }
      );
    }

    console.log(`[generate-image] Generating cover image: prompt="${prompt.trim().slice(0, 50)}..."`);

    // Generate image using z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt: prompt.trim(),
      size: '864x1152', // portrait for XHS
    });

    const imageBase64 = response.data?.[0]?.base64;
    if (!imageBase64) {
      console.error('[generate-image] No base64 data in response');
      return NextResponse.json(
        { success: false, error: 'AI 生成封面图失败，未返回图片数据' },
        { status: 500 }
      );
    }

    // Save the generated image to disk
    await ensureDir();

    const uniqueName = `cover_${crypto.randomUUID()}.png`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    await writeFile(filePath, imageBuffer);

    // Build URL for accessing the file
    const imageUrl = `/uploads/${uniqueName}`;

    console.log(`[generate-image] Cover image saved: ${uniqueName} (${imageBuffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      data: {
        url: imageUrl,
        fileName: uniqueName,
        fileSize: imageBuffer.length,
      },
    });
  } catch (error) {
    console.error('[generate-image] POST error:', error);
    const message =
      error instanceof Error ? error.message : 'AI 生成封面图失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
