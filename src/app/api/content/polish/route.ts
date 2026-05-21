import { NextRequest, NextResponse } from 'next/server';
import { polishContent } from '@/lib/ai-service';
import { db, withDb } from '@/lib/db';

// POST /api/content/polish - Polish existing content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, accountId, polishGoal } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: '请提供要润色的内容' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId' },
        { status: 400 }
      );
    }

    // Get persona if exists
    const personaRecord = await withDb(() => db.xhsPersona.findUnique({
      where: { accountId },
    }));

    const persona = personaRecord
      ? {
          ...personaRecord,
          contentThemes: JSON.parse(personaRecord.contentThemes || '[]'),
          keywords: JSON.parse(personaRecord.keywords || '[]'),
          avoidTopics: JSON.parse(personaRecord.avoidTopics || '[]'),
        }
      : null;

    // Polish content
    const result = await polishContent({
      content,
      accountId,
      persona,
      polishGoal,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Content polishing failed:', error);
    return NextResponse.json(
      { success: false, error: '内容润色失败，请重试' },
      { status: 500 }
    );
  }
}
