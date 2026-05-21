import { NextRequest, NextResponse } from "next/server";
import { tryGetAIClient } from "@/lib/ai/router";
import type { TrendingTopic, ContentSuggestion } from "@/types";

// ─── Helper: safely extract JSON from LLM response ──────────────────────

function extractJSON<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ─── GET /api/trending - Fetch trending topics ──────────────────────────

export async function GET() {
  try {
    const ai = await tryGetAIClient();
    if (!ai) {
      return NextResponse.json({ success: true, data: getDefaultTrendingTopics() });
    }

    // Optional: try web search if provider supports it
    let searchContext: Array<{ title: string; snippet: string }> = [];
    if (ai.webSearch) {
      try {
        const searchResults = await ai.webSearch({
          query: "小红书 热门话题 热搜榜 2025",
          num: 8,
        });
        searchContext = (searchResults.items || []).slice(0, 8).map((item) => ({
          title: item.title || "",
          snippet: item.snippet || "",
        }));
      } catch {
        // Web search failed — proceed without context
      }
    }

    const result = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            '你是小红书运营专家，擅长追踪平台热点和趋势。请根据搜索结果（如果有）或你的知识，生成当前小红书平台的热门话题。返回纯JSON格式，不要包含markdown代码块标记。',
        },
        {
          role: "user",
          content: `请生成8个当前小红书平台的热门话题。${searchContext.length > 0 ? `\n\n搜索结果参考：\n${JSON.stringify(searchContext, null, 2)}` : ""}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "topics": [
    {
      "name": "话题名称",
      "heat": 5,
      "category": "分类",
      "description": "话题简短描述",
      "suggestedAngles": ["创作角度1", "创作角度2", "创作角度3"],
      "exampleTitles": ["示例标题1", "示例标题2"]
    }
  ]
}

要求：
- heat: 1-5的热度等级（5最热）
- category: 话题分类，如"生活方式"、"美妆护肤"、"美食探店"、"旅行攻略"、"穿搭时尚"、"家居装修"、"职场成长"、"学习干货"等
- description: 15字以内的简短描述
- suggestedAngles: 3个不同的创作角度
- exampleTitles: 2个吸引人的示例标题
- 话题应该涵盖不同领域，贴近真实热点`,
        },
      ],
      temperature: 0.8,
    });

    const responseText = result.content;
    const parsed = extractJSON<{ topics: TrendingTopic[] }>(responseText);

    if (parsed?.topics && Array.isArray(parsed.topics)) {
      const topics = parsed.topics.map((topic, index) => ({
        ...topic,
        id: `trending-${Date.now()}-${index}`,
        heat: Math.min(Math.max(Math.round(topic.heat), 1), 5),
      }));
      return NextResponse.json({ success: true, data: topics });
    }

    return NextResponse.json({ success: true, data: getDefaultTrendingTopics() });
  } catch (error) {
    console.error("Failed to fetch trending topics:", error);
    return NextResponse.json({ success: true, data: getDefaultTrendingTopics() });
  }
}

// ─── POST /api/trending - Generate content suggestions for a topic ──────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic } = body as { topic: string };

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供话题名称" },
        { status: 400 }
      );
    }

    const ai = await tryGetAIClient();
    if (!ai) {
      return NextResponse.json({ success: true, data: defaultSuggestion(topic) });
    }

    let searchContext: Array<{ title: string; snippet: string }> = [];
    if (ai.webSearch) {
      try {
        const searchResults = await ai.webSearch({
          query: `小红书 ${topic} 爆款笔记 创作技巧`,
          num: 5,
        });
        searchContext = (searchResults.items || []).slice(0, 5).map((item) => ({
          title: item.title || "",
          snippet: item.snippet || "",
        }));
      } catch {
        // ignore
      }
    }

    const result = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            '你是小红书爆款内容策划师，擅长为热门话题设计差异化的内容方案。请返回纯JSON格式，不要包含markdown代码块标记。',
        },
        {
          role: "user",
          content: `为以下小红书热门话题生成详细的内容创作建议。

话题：${topic}

${searchContext.length > 0 ? `相关搜索参考：\n${JSON.stringify(searchContext, null, 2)}` : ""}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "topic": "${topic}",
  "angles": ["创作角度1", "创作角度2", "创作角度3", "创作角度4"],
  "titles": ["吸引人的标题1", "吸引人的标题2", "吸引人的标题3", "吸引人的标题4", "吸引人的标题5"],
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5", "标签6", "标签7", "标签8"],
  "contentOutline": "内容大纲，包含开头钩子、主体结构和结尾引导",
  "tips": ["创作技巧1", "创作技巧2", "创作技巧3", "创作技巧4"]
}

要求：
- angles: 4个差异化的创作角度（避免同质化）
- titles: 5个极具吸引力的标题（含emoji，15字以内）
- tags: 8个标签（4个热门+4个精准长尾）
- contentOutline: 100字以内的结构化大纲
- tips: 4个实用创作技巧`,
        },
      ],
      temperature: 0.8,
    });

    const parsed = extractJSON<ContentSuggestion>(result.content);
    if (parsed && parsed.angles && parsed.titles) {
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ success: true, data: defaultSuggestion(topic) });
  } catch (error) {
    console.error("Failed to generate content suggestions:", error);
    return NextResponse.json({ success: true, data: defaultSuggestion(request.body ? "" : "") }, { status: 200 });
  }
}

function defaultSuggestion(topic: string): ContentSuggestion {
  return {
    topic,
    angles: ["个人体验分享", "干货教程", "对比测评", "避坑指南"],
    titles: [
      `${topic}必看攻略！收藏这一篇就够了✨`,
      `亲测有效的${topic}方法，效果绝了🔥`,
      `${topic}新手入门，看这一篇就够了💡`,
      `别再踩坑了！${topic}避雷指南⚠️`,
      `${topic}的正确打开方式，后悔没早知道😱`,
    ],
    tags: [topic, "小红书", "干货分享", "生活攻略", "热门话题", "必看攻略", "实用技巧", "种草推荐"],
    contentOutline: "开头用疑问句或场景引入→分享个人真实经历→给出具体可执行的建议→总结要点→引导互动",
    tips: [
      "标题加数字和emoji提升点击率",
      "正文分段清晰，重点用【】标注",
      "配图选择明亮色调的实拍图",
      "发布时间选在晚间7-9点高峰期",
    ],
  };
}

// ─── Default trending topics fallback ───────────────────────────────────

function getDefaultTrendingTopics(): TrendingTopic[] {
  const now = Date.now();
  return [
    {
      id: `default-${now}-0`,
      name: "春日穿搭灵感",
      heat: 5,
      category: "穿搭时尚",
      description: "换季穿搭必看指南",
      suggestedAngles: ["通勤OL风", "周末休闲风", "约会甜美风"],
      exampleTitles: ["春日OOTD｜温柔到骨子里🌸", "换季不会穿？这几套照着穿就对了✨"],
    },
    {
      id: `default-${now}-1`,
      name: "居家好物推荐",
      heat: 4,
      category: "家居装修",
      description: "提升幸福感的好物",
      suggestedAngles: ["平价好物", "颜值神器", "实用工具"],
      exampleTitles: ["百元以内提升幸福感的好物🏠", "居家好物分享，每件都舍不得离手💛"],
    },
    {
      id: `default-${now}-2`,
      name: "减脂餐食谱",
      heat: 5,
      category: "美食探店",
      description: "好吃不胖的健康食谱",
      suggestedAngles: ["懒人快手菜", "上班族便当", "饱腹感强"],
      exampleTitles: ["减脂期也能吃得超满足🥗", "一周减脂餐不重样，好吃到哭😭"],
    },
    {
      id: `default-${now}-3`,
      name: "旅行攻略分享",
      heat: 4,
      category: "旅行攻略",
      description: "说走就走的旅行灵感",
      suggestedAngles: ["周末短途游", "拍照打卡点", "省钱攻略"],
      exampleTitles: ["人少景美的小众旅行地🗺️", "人均500的周末游，美到窒息🌊"],
    },
    {
      id: `default-${now}-4`,
      name: "职场成长心得",
      heat: 3,
      category: "职场成长",
      description: "打工人进阶指南",
      suggestedAngles: ["升职加薪", "副业变现", "时间管理"],
      exampleTitles: ["工作3年悟出的职场真相💼", "副业收入超过主业，我是怎么做到的📈"],
    },
    {
      id: `default-${now}-5`,
      name: "平价护肤好物",
      heat: 4,
      category: "美妆护肤",
      description: "学生党也买得起",
      suggestedAngles: ["敏感肌适用", "成分分析", "平替推荐"],
      exampleTitles: ["百元内护肤好物，大牌平替来了💆‍♀️", "敏感肌亲测！这几款平价好物太绝了✨"],
    },
    {
      id: `default-${now}-6`,
      name: "学习方法论",
      heat: 3,
      category: "学习干货",
      description: "高效学习不费力",
      suggestedAngles: ["备考攻略", "自律习惯", "笔记技巧"],
      exampleTitles: ["学霸都在用的学习方法📚", "从学渣到学霸，我用了这3个方法🎯"],
    },
    {
      id: `default-${now}-7`,
      name: "一人食料理",
      heat: 4,
      category: "美食探店",
      description: "独居也要好好吃饭",
      suggestedAngles: ["10分钟快手菜", "治愈系料理", "小家电美食"],
      exampleTitles: ["独居女孩的一人食🍳", "微波炉也能做出大厨味道🔥"],
    },
  ];
}
