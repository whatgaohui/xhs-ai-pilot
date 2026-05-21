import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// GET /api/persona - Get persona for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId参数' },
        { status: 400 }
      );
    }

    const persona = await withDb(() => db.xhsPersona.findUnique({
      where: { accountId },
    }));

    if (!persona) {
      return NextResponse.json({ success: true, data: null });
    }

    const data = {
      ...persona,
      contentThemes: safeJsonParse(persona.contentThemes),
      keywords: safeJsonParse(persona.keywords),
      avoidTopics: safeJsonParse(persona.avoidTopics),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to get persona:', error);
    return NextResponse.json(
      { success: false, error: '获取人设信息失败' },
      { status: 500 }
    );
  }
}

/** Safely parse JSON string, returning empty array on failure */
function safeJsonParse(str: string | null | undefined): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// POST /api/persona - Create persona for an account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      name,
      tone,
      writingStyle,
      targetAudience,
      contentThemes,
      keywords,
      avoidTopics,
      referenceDesc,
      signaturePhrase,
    } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId' },
        { status: 400 }
      );
    }

    // Check account exists
    const account = await withDb(() => db.xhsAccount.findUnique({
      where: { id: accountId },
    }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Check if persona already exists
    const existing = await withDb(() => db.xhsPersona.findUnique({
      where: { accountId },
    }));
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该账号已有人设，请使用PUT更新' },
        { status: 409 }
      );
    }

    const persona = await withDb(() => db.xhsPersona.create({
      data: {
        accountId,
        name: name || '',
        tone: tone || 'warm',
        writingStyle: writingStyle || 'balanced',
        targetAudience: targetAudience || '',
        contentThemes: JSON.stringify(contentThemes || []),
        keywords: JSON.stringify(keywords || []),
        avoidTopics: JSON.stringify(avoidTopics || []),
        referenceDesc: referenceDesc || '',
        signaturePhrase: signaturePhrase || '',
      },
    }));

    const data = {
      ...persona,
      contentThemes: safeJsonParse(persona.contentThemes),
      keywords: safeJsonParse(persona.keywords),
      avoidTopics: safeJsonParse(persona.avoidTopics),
    };

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create persona:', error);
    return NextResponse.json(
      { success: false, error: '创建人设失败' },
      { status: 500 }
    );
  }
}

// PUT /api/persona - Update persona
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, name, tone, writingStyle, targetAudience, contentThemes, keywords, avoidTopics, referenceDesc, signaturePhrase } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId' },
        { status: 400 }
      );
    }

    const existing = await withDb(() => db.xhsPersona.findUnique({
      where: { accountId },
    }));
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '人设不存在，请先创建' },
        { status: 404 }
      );
    }

    const persona = await withDb(() => db.xhsPersona.update({
      where: { accountId },
      data: {
        ...(name !== undefined && { name }),
        ...(tone !== undefined && { tone }),
        ...(writingStyle !== undefined && { writingStyle }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(contentThemes !== undefined && {
          contentThemes: JSON.stringify(contentThemes),
        }),
        ...(keywords !== undefined && { keywords: JSON.stringify(keywords) }),
        ...(avoidTopics !== undefined && {
          avoidTopics: JSON.stringify(avoidTopics),
        }),
        ...(referenceDesc !== undefined && { referenceDesc }),
        ...(signaturePhrase !== undefined && { signaturePhrase }),
      },
    }));

    const data = {
      ...persona,
      contentThemes: safeJsonParse(persona.contentThemes),
      keywords: safeJsonParse(persona.keywords),
      avoidTopics: safeJsonParse(persona.avoidTopics),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update persona:', error);
    return NextResponse.json(
      { success: false, error: '更新人设失败' },
      { status: 500 }
    );
  }
}
