import { NextRequest, NextResponse } from 'next/server';
import { tryGetAIClient } from '@/lib/ai/router';

interface StrategyRecommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  priority: '高' | '中' | '低';
}

function fallbackRecommendations(): StrategyRecommendation[] {
  const t = Date.now();
  return [
    { id: `strategy-${t}-0`, icon: 'TrendingUp', title: '提升内容互动率', description: '增加提问式结尾和互动引导，提升评论区活跃度', priority: '高' },
    { id: `strategy-${t}-1`, icon: 'Calendar', title: '优化发布时间', description: '晚间19-21点发布笔记，覆盖用户活跃高峰', priority: '中' },
    { id: `strategy-${t}-2`, icon: 'Sparkles', title: '打造爆款标题', description: '使用数字+emoji+疑问句式，提高点击率', priority: '中' },
    { id: `strategy-${t}-3`, icon: 'Heart', title: '加强粉丝互动', description: '回复每条评论，建立亲密粉丝关系', priority: '低' },
  ];
}

// GET /api/ai/strategy - Generate AI content strategy recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountCount = searchParams.get('accountCount') || '0';
    const avgEngagement = searchParams.get('avgEngagement') || '0';
    const engagementRate = searchParams.get('engagementRate') || '0';
    const totalPosts = searchParams.get('totalPosts') || '0';

    const ai = await tryGetAIClient();
    if (!ai) {
      // No provider configured — return static fallback gracefully
      return NextResponse.json({ success: true, data: fallbackRecommendations() });
    }

    const prompt = `你是一位小红书运营策略专家。请根据以下账号运营数据，生成4条具体的运营建议。

当前数据：
- 管理账号数：${accountCount}
- 采集笔记数：${totalPosts}
- 平均互动量：${avgEngagement}
- 互动率：${engagementRate}%

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "recommendations": [
    {
      "icon": "TrendingUp",
      "title": "建议标题，8字以内",
      "description": "具体建议描述，30字以内，可执行",
      "priority": "高"
    }
  ]
}

要求：
- icon必须是以下之一：TrendingUp, Target, Zap, Lightbulb, Calendar, Users, Sparkles, BarChart3, Rocket, Heart
- priority必须是"高"、"中"、"低"之一
- 每条建议要针对小红书平台特点，具体可执行
- 至少1条高优先级，1条低优先级
- 建议应涵盖：内容策略、互动优化、发布时间、粉丝增长等不同方面`;

    const result = await ai.chat({
      messages: [
        {
          role: 'system',
          content:
            '你是一位资深的小红书运营策略顾问，擅长根据数据分析给出精准的运营建议。你的建议总是具体、可执行、有数据支撑。请始终返回纯JSON格式，不要包含markdown代码块标记。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    });

    const responseText = result.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          const recommendations: StrategyRecommendation[] = parsed.recommendations.map(
            (rec: Record<string, string>, index: number) => ({
              id: `strategy-${Date.now()}-${index}`,
              icon: rec.icon || 'Sparkles',
              title: rec.title || '运营建议',
              description: rec.description || '请关注账号数据变化',
              priority: ['高', '中', '低'].includes(rec.priority) ? (rec.priority as '高' | '中' | '低') : '中',
            })
          );
          return NextResponse.json({ success: true, data: recommendations });
        }
      } catch {
        // fall through to fallback
      }
    }

    return NextResponse.json({ success: true, data: fallbackRecommendations() });
  } catch (error) {
    console.error('AI strategy generation failed:', error);
    return NextResponse.json({ success: true, data: fallbackRecommendations() });
  }
}
