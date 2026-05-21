/**
 * AI Service — high-level AI tasks for the app.
 *
 * Migrated from z-ai-web-dev-sdk hardcoded to the new abstraction layer
 * in `src/lib/ai/*`. All functions now route through `getAIClient()` and
 * gracefully fall back when no provider is configured.
 */

import { getAIClient, tryGetAIClient } from "@/lib/ai/router";
import type {
  XhsAccountInfo,
  XhsPostInfo,
  XhsPersonaInfo,
  AccountAnalysis,
} from "@/types";

// ─── Helper: safely parse JSON from LLM response ───────────────────────

function extractJSON<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ─── Analyze Account ───────────────────────────────────────────────────

export async function analyzeAccount(
  account: XhsAccountInfo,
  posts: XhsPostInfo[]
): Promise<string> {
  const ai = await tryGetAIClient();
  if (!ai) return "尚未配置 AI 模型，请先到「设置」中添加。";

  const postSummaries = posts.slice(0, 20).map((p) => ({
    title: p.title,
    likes: p.likes,
    comments: p.comments,
    collects: p.collects,
    shares: p.shares,
    category: p.category,
    tags: p.tags,
    publishDate: p.publishDate,
  }));

  const prompt = `你是一位专业的小红书账号分析师。请根据以下账号信息和笔记数据，给出深度分析报告。

账号信息：
- 昵称：${account.nickname}
- 粉丝数：${account.followers}
- 关注数：${account.following}
- 获赞与收藏：${account.likedCollected}
- 笔记数：${account.notesCount}
- 简介：${account.bio}
- 地区：${account.location}

笔记数据（最近${postSummaries.length}条）：
${JSON.stringify(postSummaries, null, 2)}

请从以下维度分析：
1. 账号定位与人设一致性
2. 内容质量评估（标题吸引力、内容深度、视觉呈现）
3. 互动数据表现（点赞、评论、收藏、分享的比例和趋势）
4. 内容选题建议（基于热门话题和受众偏好）
5. 发布策略建议（发布时间、频率）
6. 粉丝增长潜力评估
7. 具体改进建议（至少3条可执行建议）

请用中文回复，条理清晰。`;

  const result = await ai.chat({
    messages: [
      {
        role: "system",
        content:
          "你是一位资深的小红书运营专家，擅长账号分析、内容策略制定和爆款预测。你的分析总是数据驱动、具体可执行。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return result.content || "分析生成失败，请重试。";
}

// ─── Generate Content ──────────────────────────────────────────────────

export interface GenerateContentParams {
  accountId: string;
  topic: string;
  style?: string;
  tone?: string;
  persona?: XhsPersonaInfo | null;
  referencePosts?: XhsPostInfo[];
}

export interface GeneratedContent {
  title: string;
  content: string;
  tags: string[];
  coverPrompt: string;
}

export async function generateContent(
  params: GenerateContentParams
): Promise<GeneratedContent> {
  const ai = await getAIClient(); // throws if not configured
  const { topic, style, tone, persona, referencePosts } = params;

  const personaContext = persona
    ? `
人设信息：
- 名称/定位：${persona.name}
- 语气风格：${persona.tone}
- 写作风格：${persona.writingStyle}
- 目标受众：${persona.targetAudience}
- 内容主题：${persona.contentThemes.join("、")}
- 核心关键词：${persona.keywords.join("、")}
- 避免话题：${persona.avoidTopics.join("、")}
- 标志性用语：${persona.signaturePhrase}
- 参考描述：${persona.referenceDesc}`
    : "";

  const referenceContext =
    referencePosts && referencePosts.length > 0
      ? `\n\n参考笔记（高互动笔记）：\n${referencePosts
          .slice(0, 5)
          .map(
            (p) =>
              `- 标题：${p.title} | 点赞：${p.likes} | 收藏：${p.collects} | 标签：${p.tags.join(",")}`
          )
          .join("\n")}`
      : "";

  const prompt = `你是一位顶级小红书内容创作者。请根据以下要求创作一篇小红书笔记。

主题：${topic}
${style ? `风格：${style}` : ""}
${tone ? `语气：${tone}` : ""}
${personaContext}
${referenceContext}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "title": "吸引人的标题，包含emoji和关键词，15字以内",
  "content": "笔记正文，包含emoji、分段、重点标注，200-500字，符合小红书风格",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "coverPrompt": "封面图的AI生成提示词，英文，描述一个适合该笔记的视觉封面"
}

注意：
- 标题要吸引眼球，可使用数字、问号、感叹号
- 正文要自然，适当使用emoji但不泛滥
- 段落之间空行，重要内容用【】标注
- 标签5-8个，包含热门标签和精准标签
- 封面提示词要具象、有美感、适合小红书风格`;

  const result = await ai.chat({
    messages: [
      {
        role: "system",
        content:
          "你是一位小红书爆款内容创作专家，深谙平台算法和用户偏好。你创作的每篇笔记都追求高互动率和传播力。请始终返回纯JSON格式，不要包含markdown代码块标记。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
  });

  const content = result.content;
  const parsed = extractJSON<GeneratedContent>(content);

  if (parsed && parsed.title && parsed.content) {
    return parsed;
  }

  return {
    title: content.slice(0, 20) || "生成失败",
    content: content || "内容生成失败，请重试",
    tags: [],
    coverPrompt: "",
  };
}

// ─── Polish Content ────────────────────────────────────────────────────

export interface PolishContentParams {
  content: string;
  accountId: string;
  persona?: XhsPersonaInfo | null;
  polishGoal?: "engagement" | "clarity" | "emotion" | "seo";
}

export interface PolishedContent {
  title: string;
  content: string;
  tags: string[];
  changes: string[];
}

export async function polishContent(
  params: PolishContentParams
): Promise<PolishedContent> {
  const ai = await getAIClient();
  const { content, persona, polishGoal } = params;

  const personaContext = persona
    ? `
人设信息：
- 语气风格：${persona.tone}
- 写作风格：${persona.writingStyle}
- 目标受众：${persona.targetAudience}
- 核心关键词：${persona.keywords.join("、")}
- 标志性用语：${persona.signaturePhrase}`
    : "";

  const goalDesc: Record<string, string> = {
    engagement: "提高互动率，增加评论和收藏",
    clarity: "让表达更清晰、逻辑更顺畅",
    emotion: "增强情感共鸣，让读者更有代入感",
    seo: "优化关键词和标签，提高搜索曝光",
  };

  const prompt = `你是一位小红书内容优化专家。请润色以下笔记内容。

${personaContext}
优化目标：${polishGoal ? goalDesc[polishGoal] || "全面提升" : "全面提升"}

原始内容：
${content}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "title": "优化后的标题",
  "content": "优化后的完整正文",
  "tags": ["优化后的标签1", "标签2", "标签3", "标签4", "标签5"],
  "changes": ["修改说明1", "修改说明2", "修改说明3"]
}

优化原则：
- 保持原意不变，提升表达力
- 增加吸引力但不标题党
- 优化emoji使用和排版
- 强化行动号召（引导互动）
- 标签组合兼顾热度与精准度`;

  const result = await ai.chat({
    messages: [
      {
        role: "system",
        content:
          "你是一位小红书内容优化专家，擅长将普通内容打磨成爆款。你的优化总是保留作者原意的同时最大化互动潜力。请始终返回纯JSON格式，不要包含markdown代码块标记。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
  });

  const parsed = extractJSON<PolishedContent>(result.content);
  if (parsed && parsed.content) return parsed;

  return {
    title: "",
    content: result.content || content,
    tags: [],
    changes: ["优化失败，返回原始内容"],
  };
}

// ─── Generate Tags ─────────────────────────────────────────────────────

export async function generateTags(
  content: string,
  count: number = 8
): Promise<string[]> {
  const ai = await tryGetAIClient();
  if (!ai) return [];

  const prompt = `请为以下小红书笔记内容生成${count}个标签。标签应包含热门标签和精准标签的组合，有助于提高笔记的搜索曝光和推荐。

内容：
${content.slice(0, 500)}

请只返回一个JSON数组，例如：["标签1", "标签2", "标签3"]。不要包含任何其他文字。`;

  const result = await ai.chat({
    messages: [
      {
        role: "system",
        content:
          "你是一位小红书SEO专家，精通标签策略。请只返回JSON数组格式的标签列表，不要包含其他文字。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
  });

  try {
    const arrMatch = result.content.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const tags = JSON.parse(arrMatch[0]);
      if (Array.isArray(tags)) return tags.slice(0, count);
    }
  } catch {
    // ignore
  }
  return [];
}

// ─── Analyze Single Post ───────────────────────────────────────────────

export interface PostAnalysis {
  score: number;
  titleScore: number;
  contentScore: number;
  tagScore: number;
  engagementPrediction: "low" | "medium" | "high" | "viral";
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export async function analyzePost(post: {
  title: string;
  content: string;
  tags: string[];
}): Promise<PostAnalysis> {
  const fallback: PostAnalysis = {
    score: 50,
    titleScore: 50,
    contentScore: 50,
    tagScore: 50,
    engagementPrediction: "medium",
    strengths: ["未配置 AI 模型"],
    weaknesses: [],
    suggestions: ["请到设置中配置 AI 模型后重试"],
  };

  const ai = await tryGetAIClient();
  if (!ai) return fallback;

  const prompt = `你是一位小红书笔记质量评估专家。请对以下笔记进行全面评分和分析。

标题：${post.title}
正文：${post.content}
标签：${post.tags.join("、")}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "score": 85,
  "titleScore": 90,
  "contentScore": 80,
  "tagScore": 85,
  "engagementPrediction": "high",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2", "建议3"]
}

评分标准（0-100）：
- score: 综合评分
- titleScore: 标题吸引力
- contentScore: 内容质量
- tagScore: 标签优化度
- engagementPrediction: 互动预测 (low/medium/high/viral)`;

  try {
    const result = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "你是一位小红书笔记质量评估专家，你的评分客观准确，建议具体可执行。请始终返回纯JSON格式，不要包含markdown代码块标记。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const parsed = extractJSON<PostAnalysis>(result.content);
    if (parsed && typeof parsed.score === "number") return parsed;
  } catch (err) {
    console.error("analyzePost failed:", err);
  }
  return fallback;
}

// ─── Generate AI Insights for Account Analysis ─────────────────────────

export async function generateAccountInsights(
  account: XhsAccountInfo,
  analysis: Omit<AccountAnalysis, "aiInsights">
): Promise<string> {
  const ai = await tryGetAIClient();
  if (!ai) return "尚未配置 AI 模型，请先到「设置」中添加。";

  const prompt = `基于以下小红书账号数据分析，请给出专业的AI洞察和运营建议。

账号：${account.nickname} | 粉丝：${account.followers} | 笔记：${analysis.totalPosts}篇
平均互动：点赞${analysis.avgLikes} | 评论${analysis.avgComments} | 收藏${analysis.avgCollects} | 分享${analysis.avgShares}

内容分类分布：${analysis.contentCategories.map((c) => `${c.name}(${c.count}篇,均互动${Math.round(c.avgEngagement)})`).join("、")}

内容主题：${analysis.contentThemes.map((t) => `${t.theme}(${t.count}篇)`).join("、")}

最佳发布时段：${analysis.bestPostingTimes.map((t) => `${t.hour}:00(均互动${Math.round(t.avgEngagement)})`).join("、")}

请从以下角度给出洞察（中文，300-500字）：
1. 核心优势总结
2. 主要问题诊断
3. 关键增长策略
4. 下一步行动建议`;

  const result = await ai.chat({
    messages: [
      {
        role: "system",
        content:
          "你是小红书AI运营顾问，擅长从数据中发现机会，给出可落地的运营建议。",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return result.content || "洞察生成失败，请重试。";
}