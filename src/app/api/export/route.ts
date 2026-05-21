import { NextRequest, NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

type ExportFormat = 'json' | 'csv';
type DataScope = 'accounts' | 'posts' | 'personas' | 'engagement';
type DateRange = 7 | 30 | 90;

// GET /api/export?format=json&scope=accounts,posts&dateRange=30
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format: ExportFormat = (searchParams.get('format') as ExportFormat) || 'json';
    const scopeParam = searchParams.get('scope') || 'accounts,posts';
    const dateRangeParam = searchParams.get('dateRange') || '30';
    const dateRange = parseInt(dateRangeParam, 10) as DateRange;
    const scopes = scopeParam.split(',').filter(Boolean) as DataScope[];

    // Calculate date cutoff
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);

    // Fetch all accounts with their related data
    const accounts = await withDb(() => db.xhsAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        posts: {
          orderBy: { publishDate: 'desc' },
          where: {
            publishDate: { gte: cutoffDate.toISOString() },
          },
        },
        persona: true,
        drafts: { orderBy: { updatedAt: 'desc' } },
      },
    }));

    // Filter data based on scopes
    const exportAccounts = accounts.map((account) => {
      const accData: Record<string, unknown> = {
        id: account.id,
        xhsUrl: account.xhsUrl,
        xhsId: account.xhsId,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
        bio: account.bio,
        location: account.location,
        followers: account.followers,
        following: account.following,
        likedCollected: account.likedCollected,
        notesCount: account.notesCount,
        status: account.status,
        lastScrapedAt: account.lastScrapedAt?.toISOString() || null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };

      if (scopes.includes('posts')) {
        accData.posts = account.posts.map((post) => ({
          id: post.id,
          xhsPostId: post.xhsPostId,
          title: post.title,
          content: post.content,
          coverUrl: post.coverUrl,
          imageUrls: JSON.parse(post.imageUrls || '[]'),
          postType: post.postType,
          likes: post.likes,
          comments: post.comments,
          collects: post.collects,
          shares: post.shares,
          tags: JSON.parse(post.tags || '[]'),
          category: post.category,
          aiScore: post.aiScore,
          aiAnalysis: post.aiAnalysis,
          publishDate: post.publishDate,
        }));
      }

      if (scopes.includes('personas') && account.persona) {
        accData.persona = {
          id: account.persona.id,
          name: account.persona.name,
          tone: account.persona.tone,
          writingStyle: account.persona.writingStyle,
          targetAudience: account.persona.targetAudience,
          contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
          keywords: JSON.parse(account.persona.keywords || '[]'),
          avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
          referenceDesc: account.persona.referenceDesc,
          signaturePhrase: account.persona.signaturePhrase,
        };
      }

      if (scopes.includes('engagement')) {
        const posts = account.posts;
        const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
        const totalComments = posts.reduce((s, p) => s + p.comments, 0);
        const totalCollects = posts.reduce((s, p) => s + p.collects, 0);
        const totalShares = posts.reduce((s, p) => s + p.shares, 0);
        accData.engagement = {
          totalLikes,
          totalComments,
          totalCollects,
          totalShares,
          avgLikes: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
          avgComments: posts.length > 0 ? Math.round(totalComments / posts.length) : 0,
          avgCollects: posts.length > 0 ? Math.round(totalCollects / posts.length) : 0,
          avgShares: posts.length > 0 ? Math.round(totalShares / posts.length) : 0,
          engagementRate:
            account.followers > 0 && posts.length > 0
              ? (((totalLikes + totalComments + totalCollects) / posts.length / account.followers) * 100).toFixed(2)
              : '0',
        };
      }

      return accData;
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      dateRange: `${dateRange}天`,
      scopes,
      accounts: exportAccounts,
    };

    if (format === 'csv') {
      const csv = generateCSV(exportAccounts, scopes);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="xhs-data-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json(
      { success: false, error: '导出数据失败' },
      { status: 500 }
    );
  }
}

// POST /api/export - Legacy endpoint, exports all data as JSON
export async function POST() {
  try {
    const accounts = await withDb(() => db.xhsAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        posts: { orderBy: { publishDate: 'desc' } },
        persona: true,
        drafts: { orderBy: { updatedAt: 'desc' } },
      },
    }));

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      accounts: accounts.map((account) => ({
        id: account.id,
        xhsUrl: account.xhsUrl,
        xhsId: account.xhsId,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
        bio: account.bio,
        location: account.location,
        followers: account.followers,
        following: account.following,
        likedCollected: account.likedCollected,
        notesCount: account.notesCount,
        status: account.status,
        lastScrapedAt: account.lastScrapedAt?.toISOString() || null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        posts: account.posts.map((post) => ({
          id: post.id,
          xhsPostId: post.xhsPostId,
          title: post.title,
          content: post.content,
          coverUrl: post.coverUrl,
          imageUrls: JSON.parse(post.imageUrls || '[]'),
          postType: post.postType,
          likes: post.likes,
          comments: post.comments,
          collects: post.collects,
          shares: post.shares,
          tags: JSON.parse(post.tags || '[]'),
          category: post.category,
          aiScore: post.aiScore,
          aiAnalysis: post.aiAnalysis,
          publishDate: post.publishDate,
        })),
        persona: account.persona
          ? {
              id: account.persona.id,
              name: account.persona.name,
              tone: account.persona.tone,
              writingStyle: account.persona.writingStyle,
              targetAudience: account.persona.targetAudience,
              contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
              keywords: JSON.parse(account.persona.keywords || '[]'),
              avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
              referenceDesc: account.persona.referenceDesc,
              signaturePhrase: account.persona.signaturePhrase,
            }
          : null,
        drafts: account.drafts.map((draft) => ({
          id: draft.id,
          title: draft.title,
          content: draft.content,
          coverPrompt: draft.coverPrompt,
          tags: JSON.parse(draft.tags || '[]'),
          status: draft.status,
          aiModel: draft.aiModel,
          aiSuggestions: draft.aiSuggestions,
          createdAt: draft.createdAt.toISOString(),
          updatedAt: draft.updatedAt.toISOString(),
        })),
      })),
    };

    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json(
      { success: false, error: '导出数据失败' },
      { status: 500 }
    );
  }
}

/** Generate CSV content from export data */
function generateCSV(accounts: Record<string, unknown>[], scopes: DataScope[]): string {
  const rows: string[][] = [];
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  if (scopes.includes('accounts')) {
    // Account headers
    rows.push(['=== 账号数据 ===']);
    rows.push(['账号ID', '昵称', '小红书ID', '简介', '地区', '粉丝数', '关注数', '获赞收藏', '笔记数', '状态', '最后采集时间']);
    accounts.forEach((acc) => {
      rows.push([
        String(acc.id || ''),
        String(acc.nickname || ''),
        String(acc.xhsId || ''),
        String(acc.bio || ''),
        String(acc.location || ''),
        String(acc.followers || 0),
        String(acc.following || 0),
        String(acc.likedCollected || 0),
        String(acc.notesCount || 0),
        String(acc.status || ''),
        String(acc.lastScrapedAt || ''),
      ]);
    });
    rows.push([]); // Empty row separator
  }

  if (scopes.includes('posts')) {
    rows.push(['=== 笔记数据 ===']);
    rows.push(['账号昵称', '笔记ID', '标题', '内容摘要', '类型', '点赞', '评论', '收藏', '分享', '标签', '分类', 'AI评分', '发布日期']);
    accounts.forEach((acc) => {
      const posts = (acc.posts as Record<string, unknown>[]) || [];
      posts.forEach((post) => {
        const tags = Array.isArray(post.tags) ? post.tags.join('|') : String(post.tags || '');
        const contentSummary = String(post.content || '').slice(0, 100);
        rows.push([
          String(acc.nickname || ''),
          String(post.xhsPostId || post.id || ''),
          String(post.title || ''),
          contentSummary,
          String(post.postType || ''),
          String(post.likes || 0),
          String(post.comments || 0),
          String(post.collects || 0),
          String(post.shares || 0),
          tags,
          String(post.category || ''),
          String(post.aiScore || 0),
          String(post.publishDate || ''),
        ]);
      });
    });
    rows.push([]);
  }

  if (scopes.includes('personas')) {
    rows.push(['=== 人设数据 ===']);
    rows.push(['账号昵称', '人设名称', '语气', '写作风格', '目标受众', '内容主题', '关键词', '回避话题']);
    accounts.forEach((acc) => {
      const persona = acc.persona as Record<string, unknown> | null;
      if (persona) {
        rows.push([
          String(acc.nickname || ''),
          String(persona.name || ''),
          String(persona.tone || ''),
          String(persona.writingStyle || ''),
          String(persona.targetAudience || ''),
          Array.isArray(persona.contentThemes) ? persona.contentThemes.join('|') : String(persona.contentThemes || ''),
          Array.isArray(persona.keywords) ? persona.keywords.join('|') : String(persona.keywords || ''),
          Array.isArray(persona.avoidTopics) ? persona.avoidTopics.join('|') : String(persona.avoidTopics || ''),
        ]);
      }
    });
    rows.push([]);
  }

  if (scopes.includes('engagement')) {
    rows.push(['=== 互动数据 ===']);
    rows.push(['账号昵称', '粉丝数', '总点赞', '总评论', '总收藏', '总分享', '平均点赞', '平均评论', '平均收藏', '互动率']);
    accounts.forEach((acc) => {
      const engagement = acc.engagement as Record<string, unknown> | null;
      if (engagement) {
        rows.push([
          String(acc.nickname || ''),
          String(acc.followers || 0),
          String(engagement.totalLikes || 0),
          String(engagement.totalComments || 0),
          String(engagement.totalCollects || 0),
          String(engagement.totalShares || 0),
          String(engagement.avgLikes || 0),
          String(engagement.avgComments || 0),
          String(engagement.avgCollects || 0),
          String(engagement.engagementRate || '0'),
        ]);
      }
    });
    rows.push([]);
  }

  // Convert to CSV string with proper escaping
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          // Escape cells that contain commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  return BOM + csvContent;
}
