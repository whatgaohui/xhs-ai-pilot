// ─── Account Types ──────────────────────────────────────────────────────

export interface XhsAccountInfo {
  id: string;
  xhsUrl: string;
  xhsId: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  likedCollected: number;
  notesCount: number;
  cookies?: string;
  status: 'idle' | 'scraping' | 'success' | 'partial' | 'error';
  lastScrapedAt: string | null;
  errorMessage?: string;
}

// ─── Post Types ────────────────────────────────────────────────────────

export interface XhsPostInfo {
  id: string;
  accountId: string;
  xhsPostId: string;
  title: string;
  content: string;
  coverUrl: string;
  imageUrls: string[];
  postType: 'normal' | 'video';
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  tags: string[];
  category: string;
  aiScore: number;
  aiAnalysis: string;
  publishDate: string;
}

// ─── Persona Types ─────────────────────────────────────────────────────

export interface XhsPersonaInfo {
  id: string;
  accountId: string;
  name: string;
  tone: 'warm' | 'professional' | 'witty' | 'casual' | 'elegant';
  writingStyle: 'concise' | 'detailed' | 'emotional' | 'balanced';
  targetAudience: string;
  contentThemes: string[];
  keywords: string[];
  avoidTopics: string[];
  referenceDesc: string;
  signaturePhrase: string;
}

// ─── Draft Types ───────────────────────────────────────────────────────

export interface ContentDraftInfo {
  id: string;
  accountId: string;
  title: string;
  content: string;
  coverPrompt: string;
  tags: string[];
  status: 'draft' | 'polishing' | 'ready' | 'published';
  aiModel: string;
  aiSuggestions: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Scraping Types ────────────────────────────────────────────────────

export interface ScrapeResult {
  account: Partial<XhsAccountInfo>;
  posts: Partial<XhsPostInfo>[];
  totalFound: number;
  scrapeMethod: 'page_reader' | 'web_search' | 'llm_fallback';
  warnings: string[];
  partialData: boolean;
}

// ─── Analysis Types ────────────────────────────────────────────────────

export interface ContentCategoryStat {
  name: string;
  count: number;
  avgEngagement: number;
}

export interface PostingFrequency {
  date: string;
  count: number;
}

export interface EngagementTrend {
  date: string;
  likes: number;
  comments: number;
  collects: number;
}

export interface BestPostingTime {
  hour: number;
  avgEngagement: number;
}

export interface ContentThemeStat {
  theme: string;
  count: number;
}

export interface AccountAnalysis {
  totalPosts: number;
  avgLikes: number;
  avgComments: number;
  avgCollects: number;
  avgShares: number;
  topPosts: XhsPostInfo[];
  contentCategories: ContentCategoryStat[];
  postingFrequency: PostingFrequency[];
  engagementTrend: EngagementTrend[];
  bestPostingTimes: BestPostingTime[];
  contentThemes: ContentThemeStat[];
  aiInsights: string;
}

// ─── Media Asset Types ────────────────────────────────────────────────

export interface MediaAssetInfo {
  id: string;
  type: 'image' | 'video' | 'text';
  fileName: string;
  originalName: string;
  url: string;
  thumbnail: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  category: string;
  tags: string[];
  description: string;
  aiDescription: string;
  aiTags: string[];
  aiAnalyzed: boolean;
  source: 'upload' | 'ai-generated' | 'scraped';
  accountId: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Trending Topic Types ───────────────────────────────────────────────

export interface TrendingTopic {
  id: string;
  name: string;
  heat: number; // 1-5 scale
  category: string;
  description: string;
  suggestedAngles: string[];
  exampleTitles: string[];
}

export interface ContentSuggestion {
  topic: string;
  angles: string[];
  titles: string[];
  tags: string[];
  contentOutline: string;
  tips: string[];
}
