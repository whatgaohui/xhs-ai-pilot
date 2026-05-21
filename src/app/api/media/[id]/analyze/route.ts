import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ZAI from 'z-ai-web-dev-sdk';

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

// ─── POST /api/media/[id]/analyze — AI analyze image using VLM ─────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the asset
    const asset = await withDb(() => db.mediaAsset.findUnique({ where: { id } }));
    if (!asset) {
      return NextResponse.json(
        { success: false, error: '素材不存在' },
        { status: 404 }
      );
    }

    const assetData = asset as Record<string, unknown>;
    const assetType = assetData.type as string;

    if (assetType !== 'image') {
      return NextResponse.json(
        { success: false, error: '仅支持分析图片类型素材' },
        { status: 400 }
      );
    }

    const url = (assetData.url as string) || '';
    if (!url) {
      return NextResponse.json(
        { success: false, error: '图片文件路径不存在' },
        { status: 400 }
      );
    }

    // Read the image file from disk
    const filePath = path.join(process.cwd(), 'public', url);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: '图片文件不存在，可能已被删除' },
        { status: 400 }
      );
    }

    const fileBuffer = await readFile(filePath);
    const mimeType = (assetData.mimeType as string) || 'image/jpeg';
    const base64Image = fileBuffer.toString('base64');

    // Create VLM client
    const zai = await ZAI.create();

    const prompt = `请分析这张图片，为小红书(社交媒体)帖子提供以下信息：
1. 图片内容描述（详细描述图片中的主体、场景、风格、色调等）
2. 适合的小红书标签（5-10个，适合获得流量）

请严格按照以下JSON格式回复，不要添加任何其他文字：
{
  "description": "图片内容的详细描述",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`;

    // Call VLM
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const result = response.choices[0]?.message?.content || '';

    // Parse the VLM response
    let aiDescription = '';
    let aiTags: string[] = [];

    try {
      // Try to extract JSON from the response
      // The VLM might return markdown-wrapped JSON or plain JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiDescription = parsed.description || '';
        aiTags = parsed.tags || [];
      } else {
        // If no JSON found, use the raw text as description
        aiDescription = result;
      }
    } catch {
      // If JSON parsing fails, use the raw text as description
      aiDescription = result;
    }

    // Update the database record
    const updated = await withDb(() => db.mediaAsset.update({
      where: { id },
      data: {
        aiDescription,
        aiTags: JSON.stringify(aiTags),
        aiAnalyzed: true,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        asset: toMediaAssetInfo(updated as Record<string, unknown>),
        aiDescription,
        aiTags,
        rawResponse: result,
      },
    });
  } catch (error) {
    console.error('[media/analyze] POST error:', error);
    const message =
      error instanceof Error ? error.message : 'AI 分析图片失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
