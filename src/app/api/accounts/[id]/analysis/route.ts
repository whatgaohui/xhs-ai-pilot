import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';
import type { XhsPostInfo, AccountAnalysis } from '@/types';

// GET /api/accounts/[id]/analysis - Get comprehensive analysis for an account
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await withDb(() => db.xhsAccount.findUnique({
      where: { id },
      include: { posts: { orderBy: { publishDate: 'desc' } } },
    }));

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const posts = account.posts;
    const totalPosts = posts.length;

    if (totalPosts === 0) {
      const emptyAnalysis: AccountAnalysis = {
        totalPosts: 0,
        avgLikes: 0,
        avgComments: 0,
        avgCollects: 0,
        avgShares: 0,
        topPosts: [],
        contentCategories: [],
        postingFrequency: [],
        engagementTrend: [],
        bestPostingTimes: [],
        contentThemes: [],
        aiInsights: '暂无笔记数据，请先采集账号数据。',
      };
      return NextResponse.json({ success: true, data: emptyAnalysis });
    }

    // Calculate averages
    const avgLikes = Math.round(
      posts.reduce((sum, p) => sum + p.likes, 0) / totalPosts
    );
    const avgComments = Math.round(
      posts.reduce((sum, p) => sum + p.comments, 0) / totalPosts
    );
    const avgCollects = Math.round(
      posts.reduce((sum, p) => sum + p.collects, 0) / totalPosts
    );
    const avgShares = Math.round(
      posts.reduce((sum, p) => sum + p.shares, 0) / totalPosts
    );

    // Top posts by engagement (likes + comments * 2 + collects * 3)
    const topPosts: XhsPostInfo[] = [...posts]
      .sort(
        (a, b) =>
          b.likes +
          b.comments * 2 +
          b.collects * 3 -
          (a.likes + a.comments * 2 + a.collects * 3)
      )
      .slice(0, 10)
      .map((p) => ({
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

    // Content categories
    const categoryMap = new Map<
      string,
      { count: number; totalEngagement: number }
    >();
    for (const p of posts) {
      const cat = p.category || '未分类';
      const engagement = p.likes + p.comments + p.collects + p.shares;
      const existing = categoryMap.get(cat) || {
        count: 0,
        totalEngagement: 0,
      };
      categoryMap.set(cat, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + engagement,
      });
    }
    const contentCategories = Array.from(categoryMap.entries()).map(
      ([name, { count, totalEngagement }]) => ({
        name,
        count,
        avgEngagement: Math.round(totalEngagement / count),
      })
    );

    // Posting frequency by date
    const dateMap = new Map<string, number>();
    for (const p of posts) {
      if (p.publishDate) {
        const date = p.publishDate.slice(0, 10); // YYYY-MM-DD
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    }
    const postingFrequency = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Engagement trend by date
    const trendMap = new Map<
      string,
      { likes: number; comments: number; collects: number }
    >();
    for (const p of posts) {
      if (p.publishDate) {
        const date = p.publishDate.slice(0, 10);
        const existing = trendMap.get(date) || {
          likes: 0,
          comments: 0,
          collects: 0,
        };
        trendMap.set(date, {
          likes: existing.likes + p.likes,
          comments: existing.comments + p.comments,
          collects: existing.collects + p.collects,
        });
      }
    }
    const engagementTrend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Best posting times (extract hour from publishDate if available)
    // Since XHS doesn't always expose exact time, we'll use a heuristic
    // If publishDate has time info, use it; otherwise skip
    const hourMap = new Map<number, { totalEngagement: number; count: number }>();
    for (const p of posts) {
      if (p.publishDate) {
        // Try to extract hour from publishDate
        const hourMatch = p.publishDate.match(/(\d{1,2}):\d{2}/);
        if (hourMatch) {
          const hour = parseInt(hourMatch[1], 10);
          const engagement = p.likes + p.comments + p.collects;
          const existing = hourMap.get(hour) || {
            totalEngagement: 0,
            count: 0,
          };
          hourMap.set(hour, {
            totalEngagement: existing.totalEngagement + engagement,
            count: existing.count + 1,
          });
        }
      }
    }
    // If no hour data, provide default best times based on XHS conventions
    const bestPostingTimes =
      hourMap.size > 0
        ? Array.from(hourMap.entries())
            .map(([hour, { totalEngagement, count }]) => ({
              hour,
              avgEngagement: Math.round(totalEngagement / count),
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 5)
        : [
            { hour: 8, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 12, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 18, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 21, avgEngagement: avgLikes + avgComments + avgCollects },
          ];

    // Content themes from tags
    const themeMap = new Map<string, number>();
    for (const p of posts) {
      const tags: string[] = JSON.parse(p.tags || '[]');
      for (const tag of tags) {
        themeMap.set(tag, (themeMap.get(tag) || 0) + 1);
      }
    }
    const contentThemes = Array.from(themeMap.entries())
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const analysisWithoutInsights: Omit<AccountAnalysis, 'aiInsights'> = {
      totalPosts,
      avgLikes,
      avgComments,
      avgCollects,
      avgShares,
      topPosts,
      contentCategories,
      postingFrequency,
      engagementTrend,
      bestPostingTimes,
      contentThemes,
    };

    // Return analysis data immediately with a placeholder for AI insights
    // AI insights will be generated separately to avoid blocking the response
    const analysis: AccountAnalysis = {
      ...analysisWithoutInsights,
      aiInsights: 'AI洞察正在生成中...',
    };

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { success: false, error: '分析失败，请重试' },
      { status: 500 }
    );
  }
}
