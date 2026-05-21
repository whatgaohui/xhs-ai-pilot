import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/ai-service';
import { db, withDb } from '@/lib/db';

// POST /api/content/generate - Generate new content using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, topic, style, tone } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '请提供accountId' },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { success: false, error: '请提供创作主题' },
        { status: 400 }
      );
    }

    // Check account exists
    const account = await withDb(() => db.xhsAccount.findUnique({
      where: { id: accountId },
      include: { persona: true, posts: { orderBy: { likes: 'desc' }, take: 5 } },
    }));

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Get persona if exists
    const persona = account.persona
      ? {
          ...account.persona,
          contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
          keywords: JSON.parse(account.persona.keywords || '[]'),
          avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
        }
      : null;

    // Get reference posts (top performing)
    const referencePosts = account.posts.map((p) => ({
      id: p.id,
      accountId: p.accountId,
      xhsPostId: p.xhsPostId,
      title: p.title,
      content: p.content,
      coverUrl: p.coverUrl,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      postType: p.postType as 'normal' | 'video',
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      tags: JSON.parse(p.tags || '[]'),
      category: p.category,
      aiScore: p.aiScore,
      aiAnalysis: p.aiAnalysis,
      publishDate: p.publishDate,
    }));

    // Generate content
    const generated = await generateContent({
      accountId,
      topic,
      style,
      tone,
      persona,
      referencePosts,
    });

    // Auto-save as draft
    const draft = await withDb(() => db.contentDraft.create({
      data: {
        accountId,
        title: generated.title,
        content: generated.content,
        coverPrompt: generated.coverPrompt,
        tags: JSON.stringify(generated.tags),
        status: 'draft',
        aiModel: 'glm-4-flash',
        aiSuggestions: JSON.stringify({
          topic,
          style,
          tone,
          generatedAt: new Date().toISOString(),
        }),
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        draft: {
          ...draft,
          tags: JSON.parse(draft.tags || '[]'),
        },
        generated,
      },
    });
  } catch (error) {
    console.error('Content generation failed:', error);
    return NextResponse.json(
      { success: false, error: '内容生成失败，请重试' },
      { status: 500 }
    );
  }
}
