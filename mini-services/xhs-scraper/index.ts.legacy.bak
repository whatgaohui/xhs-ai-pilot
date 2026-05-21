/**
 * XHS Scraper Micro-Service
 *
 * A dedicated scraping proxy service with multiple strategies for
 * extracting data from Xiaohongshu (小红书).
 *
 * Strategies:
 *   1. Cookie-Based API (PRIMARY) - Uses user's browser cookies to call XHS internal APIs
 *   2. Web Search + LLM (FALLBACK) - Searches third-party sites + LLM extraction
 *
 * Port: 3002
 */

import { createServer, IncomingMessage, ServerResponse, request as httpRequestFn } from 'http';
import { request as httpsRequestFn } from 'https';
import ZAI from 'z-ai-web-dev-sdk';

// ─── Constants ────────────────────────────────────────────────────────────

const PORT = 3002;
const XHS_EDITH_BASE = 'https://edith.xiaohongshu.com';
const RATE_LIMIT_DELAY_MS = 1500; // 1.5s between XHS API calls

// ─── Types ────────────────────────────────────────────────────────────────

type ScrapeMethod = 'cookie_api' | 'web_search' | 'llm_fallback';

interface ProfileScrapeRequest {
  url: string;
  cookies: string;
  userId?: string;
}

interface PostsScrapeRequest {
  userId: string;
  cookies: string;
  cursor?: string;
}

interface NoteScrapeRequest {
  noteId: string;
  cookies: string;
}

interface SearchProfileRequest {
  url: string;
}

interface SearchNotesRequest {
  userId: string;
  nickname?: string;
}

interface ScrapeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AccountData {
  nickname: string;
  xhsId: string;
  avatarUrl: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  likedCollected: number;
  notesCount: number;
}

interface PostData {
  xhsPostId: string;
  title: string;
  content: string;
  coverUrl: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  tags: string[];
  postType: string;
  publishDate: string;
}

interface ProfileScrapeData {
  account: AccountData;
  posts: PostData[];
  totalFound: number;
  scrapeMethod: ScrapeMethod;
  warnings: string[];
  partialData: boolean;
}

interface PostsScrapeData {
  posts: PostData[];
  cursor: string;
  hasMore: boolean;
  scrapeMethod: ScrapeMethod;
  warnings: string[];
}

interface NoteScrapeData {
  note: {
    noteId: string;
    title: string;
    content: string;
    coverUrl: string;
    imageUrls: string[];
    likes: number;
    comments: number;
    collects: number;
    shares: number;
    tags: string[];
    postType: string;
    publishDate: string;
    authorNickname: string;
    authorAvatar: string;
    commentCount: number;
  };
  scrapeMethod: ScrapeMethod;
  warnings: string[];
}

// ─── Utility Helpers ──────────────────────────────────────────────────────

/** Extract user ID from a XHS profile URL */
function extractUserIdFromUrl(url: string): string {
  const profileMatch = url.match(
    /xiaohongshu\.com\/user\/profile\/([a-f0-9]{24}|[A-Za-z0-9_-]+)/
  );
  if (profileMatch) return profileMatch[1];

  const shortMatch = url.match(/xhslink\.com\/([A-Za-z0-9]+)/);
  if (shortMatch) return shortMatch[1];

  const genericMatch = url.match(/\/([a-f0-9]{24})(?:\?|$|\/)/);
  if (genericMatch) return genericMatch[1];

  return '';
}

/** Extract Chinese characters that might indicate a username */
function extractChineseUsername(text: string): string {
  const match = text.match(/[\u4e00-\u9fff]{2,20}/);
  return match ? match[0] : '';
}

/** Rate-limiting delay */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse JSON body from an HTTP request */
function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/** Send a JSON response with CORS headers */
function sendJson<T>(res: ServerResponse, statusCode: number, data: ScrapeResponse<T>): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

/** Send CORS preflight response */
function sendCorsPreflight(res: ServerResponse): void {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

/** Build headers for XHS internal API requests */
function buildXhsApiHeaders(cookies: string): Record<string, string> {
  return {
    'Cookie': cookies,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.xiaohongshu.com/',
    'Origin': 'https://www.xiaohongshu.com',
    'X-s': '',
    'X-t': String(Date.now()),
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
  };
}

/** Make an HTTP request with the given options */
async function fetchUrl(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ statusCode: number; body: string }> {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const requestFn = isHttps ? httpsRequestFn : httpRequestFn;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = requestFn(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body: data });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// ─── ZAI SDK Singleton ────────────────────────────────────────────────────

let zaiInstance: any = null;

async function getZAI(): Promise<any> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ─── Strategy 1: Cookie-Based XHS API ─────────────────────────────────────

/**
 * Scrape user profile using XHS's internal API with cookies.
 * Falls back to web_search if the API call fails.
 */
async function scrapeProfileWithCookies(
  body: ProfileScrapeRequest
): Promise<ScrapeResponse<ProfileScrapeData>> {
  const warnings: string[] = [];
  const { url, cookies, userId } = body;

  // Determine the target user ID
  const targetUserId = userId || extractUserIdFromUrl(url);
  if (!targetUserId) {
    return {
      success: false,
      error: '无法从URL中提取用户ID，请提供userId参数',
    };
  }

  console.log(`[CookieAPI] Scraping profile for userId: ${targetUserId}`);

  try {
    const headers = buildXhsApiHeaders(cookies);
    const apiUrl = `${XHS_EDITH_BASE}/api/sns/web/v1/user/otherinfo?target_user_id=${targetUserId}`;

    const response = await fetchUrl(apiUrl, {
      method: 'GET',
      headers,
    });

    await delay(RATE_LIMIT_DELAY_MS);

    if (response.statusCode === 200) {
      try {
        const jsonBody = JSON.parse(response.body);

        // Check for XHS API error codes
        if (jsonBody.success === false || jsonBody.code !== 0) {
          const errorCode = jsonBody.code;
          const errorMsg = jsonBody.msg || jsonBody.message || '未知错误';

          // Common error codes
          if (errorCode === 300012) {
            warnings.push('Cookie已失效或IP被标记为风险，Cookie策略失败');
          } else if (errorCode === -1) {
            warnings.push(`XHS API返回错误: ${errorMsg}`);
          } else {
            warnings.push(`XHS API返回错误(code=${errorCode}): ${errorMsg}`);
          }

          console.log(`[CookieAPI] API error: code=${errorCode}, msg=${errorMsg}`);
          // Fall back to web search
          return await scrapeProfileViaSearch({ url });
        }

        const userData = jsonBody.data || jsonBody.result || {};
        const userInfo = userData.user || userData;

        // Extract account info from API response
        const account: AccountData = {
          nickname: userInfo.nickname || userInfo.nickName || '',
          xhsId: userInfo.userId || userInfo.xhsId || userInfo.redId || targetUserId,
          avatarUrl: userInfo.image || userInfo.avatar || '',
          bio: userInfo.desc || userInfo.description || '',
          location: userInfo.location || userInfo.ipLocation || '',
          followers: Number(userInfo.follows || userInfo.fans || userInfo.followers) || 0,
          following: Number(userInfo.following || userInfo.follows) || 0,
          likedCollected:
            Number(userInfo.liked || userInfo.likeCount || userInfo.likedCollected) || 0,
          notesCount:
            Number(userInfo.notes || userInfo.noteCount || userInfo.notesCount) || 0,
        };

        const partialData = !account.nickname || !account.followers;
        if (partialData) {
          warnings.push('Cookie API返回的数据不完整，部分字段缺失');
        }

        console.log(`[CookieAPI] Profile scraped: ${account.nickname}`);

        // Try to also get posts using cookies
        let posts: PostData[] = [];
        try {
          const postsResult = await scrapePostsWithCookiesInternal(targetUserId, cookies, '');
          if (postsResult.success && postsResult.data) {
            posts = postsResult.data.posts;
          }
        } catch (e) {
          warnings.push('获取笔记列表失败，仅返回用户资料');
        }

        return {
          success: true,
          data: {
            account,
            posts,
            totalFound: posts.length,
            scrapeMethod: 'cookie_api',
            warnings,
            partialData,
          },
        };
      } catch (parseErr) {
        warnings.push('Cookie API返回了非JSON响应，Cookie策略失败');
        console.log('[CookieAPI] Response parse error, falling back to web_search');
        return await scrapeProfileViaSearch({ url });
      }
    } else if (response.statusCode === 403) {
      warnings.push('Cookie API返回403，Cookie可能已过期或被限流');
      console.log('[CookieAPI] 403 Forbidden, falling back to web_search');
      return await scrapeProfileViaSearch({ url });
    } else {
      warnings.push(`Cookie API返回状态码${response.statusCode}，Cookie策略失败`);
      console.log(`[CookieAPI] Status ${response.statusCode}, falling back to web_search`);
      return await scrapeProfileViaSearch({ url });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cookie API调用异常';
    warnings.push(`Cookie策略异常: ${msg}`);
    console.error('[CookieAPI] Error:', msg);
    return await scrapeProfileViaSearch({ url });
  }
}

/**
 * Internal function to scrape posts with cookies.
 * Used by both the /posts endpoint and internally by profile scraping.
 */
async function scrapePostsWithCookiesInternal(
  userId: string,
  cookies: string,
  cursor: string
): Promise<ScrapeResponse<PostsScrapeData>> {
  const warnings: string[] = [];

  try {
    const headers = buildXhsApiHeaders(cookies);
    const params = new URLSearchParams({
      num: '30',
      cursor: cursor || '',
      user_id: userId,
      image_scenes: 'CRD_WM_WEBP',
    });
    const apiUrl = `${XHS_EDITH_BASE}/api/sns/web/v1/user_posted?${params.toString()}`;

    const response = await fetchUrl(apiUrl, {
      method: 'GET',
      headers,
    });

    await delay(RATE_LIMIT_DELAY_MS);

    if (response.statusCode === 200) {
      try {
        const jsonBody = JSON.parse(response.body);

        if (jsonBody.success === false || jsonBody.code !== 0) {
          const errorCode = jsonBody.code;
          const errorMsg = jsonBody.msg || jsonBody.message || '未知错误';
          warnings.push(`XHS笔记API返回错误(code=${errorCode}): ${errorMsg}`);

          return {
            success: false,
            error: `获取笔记列表失败: ${errorMsg}`,
            data: {
              posts: [],
              cursor: '',
              hasMore: false,
              scrapeMethod: 'cookie_api',
              warnings,
            },
          };
        }

        const data = jsonBody.data || {};
        const notes = data.notes || data.list || [];
        const hasMore = data.has_more || false;
        const nextCursor = data.cursor || '';

        const posts: PostData[] = notes.map((note: any) => ({
          xhsPostId: note.note_id || note.noteId || note.id || '',
          title: note.display_title || note.title || '',
          content: note.desc || note.content || '',
          coverUrl:
            note.cover?.url ||
            note.cover?.url_default ||
            note.coverUrl ||
            (note.image_list && note.image_list[0]?.url) ||
            '',
          likes: Number(note.interact_info?.liked_count || note.likeCount || note.likes) || 0,
          comments:
            Number(note.interact_info?.comment_count || note.commentCount || note.comments) || 0,
          collects:
            Number(note.interact_info?.collect_count || note.collectCount || note.collects) || 0,
          shares:
            Number(note.interact_info?.share_count || note.shareCount || note.shares) || 0,
          tags: (note.tag_list || note.tags || []).map((t: any) =>
            typeof t === 'string' ? t : t.name || t.tag_name || ''
          ),
          postType: note.type === 'video' ? 'video' : 'normal',
          publishDate: note.last_update_time || note.time || note.publishTime || '',
        }));

        console.log(`[CookieAPI] Got ${posts.length} posts for userId: ${userId}`);

        return {
          success: true,
          data: {
            posts,
            cursor: nextCursor,
            hasMore,
            scrapeMethod: 'cookie_api',
            warnings,
          },
        };
      } catch {
        warnings.push('Cookie API笔记列表返回了非JSON响应');
        return {
          success: false,
          error: 'Cookie API笔记列表解析失败',
          data: {
            posts: [],
            cursor: '',
            hasMore: false,
            scrapeMethod: 'cookie_api',
            warnings,
          },
        };
      }
    } else {
      warnings.push(`Cookie API笔记列表返回状态码${response.statusCode}`);
      return {
        success: false,
        error: `Cookie API返回${response.statusCode}`,
        data: {
          posts: [],
          cursor: '',
          hasMore: false,
          scrapeMethod: 'cookie_api',
          warnings,
        },
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cookie API笔记列表异常';
    warnings.push(`Cookie策略异常: ${msg}`);
    return {
      success: false,
      error: msg,
      data: {
        posts: [],
        cursor: '',
        hasMore: false,
        scrapeMethod: 'cookie_api',
        warnings,
      },
    };
  }
}

/**
 * Scrape a single note detail using cookies.
 */
async function scrapeNoteWithCookies(
  body: NoteScrapeRequest
): Promise<ScrapeResponse<NoteScrapeData>> {
  const warnings: string[] = [];
  const { noteId, cookies } = body;

  if (!noteId) {
    return { success: false, error: '缺少noteId参数' };
  }

  console.log(`[CookieAPI] Scraping note: ${noteId}`);

  try {
    const headers = buildXhsApiHeaders(cookies);
    const apiUrl = `${XHS_EDITH_BASE}/api/sns/web/v1/feed`;

    const requestBody = JSON.stringify({
      source_note_id: noteId,
      image_scenes: 'CRD_WM_WEBP',
    });

    const response = await fetchUrl(apiUrl, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    await delay(RATE_LIMIT_DELAY_MS);

    if (response.statusCode === 200) {
      try {
        const jsonBody = JSON.parse(response.body);

        if (jsonBody.success === false || jsonBody.code !== 0) {
          const errorCode = jsonBody.code;
          const errorMsg = jsonBody.msg || jsonBody.message || '未知错误';
          warnings.push(`XHS笔记详情API返回错误(code=${errorCode}): ${errorMsg}`);

          // Fall back to web search
          return await scrapeNoteViaSearch(noteId);
        }

        const data = jsonBody.data || {};
        const items = data.items || [data];
        const noteItem = items[0] || data;
        const noteData = noteItem.note_card || noteItem.note || noteItem;

        // Extract image URLs
        const imageUrls: string[] = (noteData.image_list || noteData.imageList || []).map(
          (img: any) => img.url_default || img.url || img.info_list?.[0]?.url || ''
        ).filter(Boolean);

        // Extract tags
        const tags: string[] = (noteData.tag_list || noteData.tags || []).map((t: any) =>
          typeof t === 'string' ? t : t.name || t.tag_name || ''
        );

        const result: NoteScrapeData = {
          note: {
            noteId: noteData.note_id || noteData.noteId || noteId,
            title: noteData.title || noteData.display_title || '',
            content: noteData.desc || noteData.content || '',
            coverUrl:
              noteData.cover?.url ||
              noteData.cover?.url_default ||
              noteData.coverUrl ||
              imageUrls[0] ||
              '',
            imageUrls,
            likes:
              Number(noteData.interact_info?.liked_count || noteData.likeCount || noteData.likes) ||
              0,
            comments:
              Number(
                noteData.interact_info?.comment_count || noteData.commentCount || noteData.comments
              ) || 0,
            collects:
              Number(
                noteData.interact_info?.collect_count || noteData.collectCount || noteData.collects
              ) || 0,
            shares:
              Number(
                noteData.interact_info?.share_count || noteData.shareCount || noteData.shares
              ) || 0,
            tags,
            postType: noteData.type === 'video' ? 'video' : 'normal',
            publishDate: noteData.last_update_time || noteData.time || noteData.publishTime || '',
            authorNickname:
              noteData.user?.nickname || noteData.user?.nickName || '',
            authorAvatar: noteData.user?.avatar || noteData.user?.image || '',
            commentCount:
              Number(
                noteData.interact_info?.comment_count || noteData.commentCount || 0
              ) || 0,
          },
          scrapeMethod: 'cookie_api',
          warnings,
        };

        console.log(`[CookieAPI] Note scraped: ${result.note.title || noteId}`);

        return { success: true, data: result };
      } catch {
        warnings.push('Cookie API笔记详情返回了非JSON响应');
        return await scrapeNoteViaSearch(noteId);
      }
    } else if (response.statusCode === 403) {
      warnings.push('Cookie API返回403，Cookie可能已过期');
      return await scrapeNoteViaSearch(noteId);
    } else {
      warnings.push(`Cookie API返回状态码${response.statusCode}`);
      return await scrapeNoteViaSearch(noteId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cookie API笔记详情异常';
    warnings.push(`Cookie策略异常: ${msg}`);
    console.error('[CookieAPI] Note error:', msg);
    return await scrapeNoteViaSearch(noteId);
  }
}

// ─── Strategy 2: Web Search + Third-Party Pages + LLM ────────────────────

/**
 * Read a third-party page (not XHS) using z-ai-web-dev-sdk page_reader.
 */
async function readThirdPartyPage(url: string): Promise<string> {
  try {
    // Skip XHS URLs - they'll be blocked
    if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
      return '';
    }

    const zai = await getZAI();
    const result = await zai.functions.invoke('page_reader', { url });

    const html: string = result.data?.html || '';
    const pageTitle: string = result.data?.title || '';

    if (html && html.length > 100) {
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);

      return `页面标题: ${pageTitle}\n页面内容: ${textContent}`;
    }
  } catch {
    // Silently fail
  }
  return '';
}

/**
 * Read multiple third-party pages in parallel.
 */
async function readThirdPartyPages(urls: string[]): Promise<string> {
  if (urls.length === 0) return '';
  const urlsToRead = urls.slice(0, 3);
  const results = await Promise.all(urlsToRead.map((u) => readThirdPartyPage(u)));
  return results
    .filter(Boolean)
    .map((r, i) => `\n--- 第三方页面 ${i + 1}: ${urlsToRead[i]} ---\n${r}`)
    .join('\n\n');
}

/**
 * Search for profile data via web search (no cookies needed).
 * Targets third-party analytics platforms for richer data.
 */
async function scrapeProfileViaSearch(
  body: SearchProfileRequest
): Promise<ScrapeResponse<ProfileScrapeData>> {
  const warnings: string[] = [];
  const { url } = body;
  const userId = extractUserIdFromUrl(url);
  const chineseName = extractChineseUsername(url);

  console.log(`[WebSearch] Searching profile for URL: ${url}`);

  try {
    const zai = await getZAI();

    // Build enhanced search queries targeting third-party platforms
    const queries: string[] = [];

    // Query 1: Third-party analytics platforms
    if (chineseName) {
      queries.push(`${chineseName} 小红书 博主 新红 千瓜 灰豚 蝉妈妈 数据`);
    }

    // Query 2: Direct URL search
    queries.push(`"${url.split('?')[0]}"`);

    // Query 3: User ID + 小红书
    if (userId) {
      queries.push(`小红书 ${userId} 博主数据`);
    }

    // Query 4: Name + analytics
    if (chineseName) {
      queries.push(`${chineseName} 小红书 粉丝 笔记 分析`);
    }

    // Execute searches sequentially to avoid rate limiting
    interface SearchResult {
      title?: string;
      snippet?: string;
      url?: string;
    }

    const allResults: SearchResult[] = [];
    const thirdPartyUrls: string[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries.slice(0, 3)) {
      try {
        console.log(`[WebSearch] Searching: ${query}`);
        const result = await zai.functions.invoke('web_search', { query, num: 8 });
        const results = result?.data?.results || [];

        for (const r of results) {
          const rUrl = r.url || '';
          if (rUrl && !seenUrls.has(rUrl)) {
            seenUrls.add(rUrl);
            allResults.push({
              title: r.title || '',
              snippet: r.snippet || '',
              url: rUrl,
            });

            // Collect non-XHS URLs for deeper reading
            if (!rUrl.includes('xiaohongshu.com') && !rUrl.includes('xhslink.com')) {
              thirdPartyUrls.push(rUrl);
            }
          }
        }

        // If we got results from this query, that's enough
        if (results.length > 0) break;
      } catch (searchErr) {
        console.log(
          `[WebSearch] Query failed: ${searchErr instanceof Error ? searchErr.message : 'unknown'}`
        );
      }
    }

    if (allResults.length === 0) {
      warnings.push('搜索引擎未返回相关结果');
      // Fall through to LLM fallback
      return await llmFallbackProfile(url, warnings);
    }

    // Read third-party pages for richer data
    console.log(`[WebSearch] Found ${thirdPartyUrls.length} third-party URLs to read`);
    const thirdPartyData = await readThirdPartyPages(thirdPartyUrls);

    // Build search summary
    const searchSummary = allResults
      .slice(0, 10)
      .map(
        (r, i) =>
          `[${i + 1}] 标题: ${r.title || ''}\n    摘要: ${r.snippet || ''}\n    链接: ${r.url || ''}`
      )
      .join('\n\n');

    const combinedData = thirdPartyData
      ? `${searchSummary.slice(0, 4000)}\n\n=== 第三方网站详细内容 ===\n${thirdPartyData.slice(0, 4000)}`
      : searchSummary.slice(0, 6000);

    if (thirdPartyData) {
      console.log('[WebSearch] Successfully read third-party pages');
      warnings.push('通过第三方网页获取了更多数据');
    }

    // Use LLM to extract structured data
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的小红书数据提取助手。根据搜索引擎返回的结果和第三方网页内容，提取小红书用户的个人资料信息。

重要规则：
1. 仔细阅读所有搜索结果和第三方网页内容，从中提取尽可能多的用户信息
2. 即使信息不完整，也请尽力提取每个可用的字段
3. 如果搜索结果中提到了粉丝数的范围（如"万粉博主"、"10万+粉丝"），请估算一个合理的数值
4. 如果提到了用户的笔记内容，请在posts数组中列出
5. 如果无法确定精确数值，根据上下文估算合理数值
6. 特别关注第三方数据分析平台（新红、千瓜、灰豚data、蝉妈妈等）的数据

请返回 ONLY 合法的 JSON，格式如下：
{
  "nickname": "用户昵称",
  "xhsId": "小红书用户ID",
  "bio": "个人简介",
  "location": "所在地",
  "followers": 0,
  "following": 0,
  "likedCollected": 0,
  "notesCount": 0,
  "posts": [
    {
      "xhsPostId": "笔记ID",
      "title": "笔记标题",
      "content": "笔记内容摘要",
      "coverUrl": "",
      "likes": 0,
      "comments": 0,
      "collects": 0,
      "shares": 0,
      "tags": ["标签1"],
      "postType": "normal",
      "publishDate": ""
    }
  ]
}

如果某个字段无法从搜索结果中获取，使用空字符串或0。
已知URL中的用户ID: ${userId || '未知'}`,
        },
        {
          role: 'user',
          content: `请从以下搜索结果和第三方网页内容中提取小红书用户信息:\n\n${combinedData}`,
        },
      ],
      temperature: 0.1,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const { posts: extractedPosts, ...userInfo } = parsed;

        const account: AccountData = {
          nickname: userInfo.nickname || '',
          xhsId: userInfo.xhsId || userId || '',
          avatarUrl: userInfo.avatarUrl || '',
          bio: userInfo.bio || '',
          location: userInfo.location || '',
          followers: Number(userInfo.followers) || 0,
          following: Number(userInfo.following) || 0,
          likedCollected: Number(userInfo.likedCollected) || 0,
          notesCount: Number(userInfo.notesCount) || 0,
        };

        const posts: PostData[] = Array.isArray(extractedPosts)
          ? extractedPosts.map((p: any) => ({
              xhsPostId: p.xhsPostId || '',
              title: p.title || '',
              content: p.content || '',
              coverUrl: p.coverUrl || '',
              likes: Number(p.likes) || 0,
              comments: Number(p.comments) || 0,
              collects: Number(p.collects) || 0,
              shares: Number(p.shares) || 0,
              tags: Array.isArray(p.tags) ? p.tags : [],
              postType: p.postType || 'normal',
              publishDate: p.publishDate || '',
            }))
          : [];

        const partialData = !account.nickname || !account.followers || !account.bio;
        if (partialData) {
          warnings.push('搜索引擎获取的数据可能不完整，建议手动补充');
        }
        warnings.push('小红书网站屏蔽了直接访问，使用了搜索引擎和第三方网页数据');

        console.log(`[WebSearch] Profile extracted: ${account.nickname}`);

        return {
          success: true,
          data: {
            account,
            posts,
            totalFound: posts.length,
            scrapeMethod: 'web_search',
            warnings,
            partialData,
          },
        };
      } catch (parseErr) {
        warnings.push('LLM返回的JSON解析失败');
      }
    }

    warnings.push('搜索引擎返回了结果但LLM无法提取有效用户信息');
    return await llmFallbackProfile(url, warnings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'web_search调用失败';
    warnings.push(`web_search策略异常: ${msg}`);
    console.error('[WebSearch] Error:', msg);
    return await llmFallbackProfile(url, warnings);
  }
}

/**
 * Search for notes via web search (no cookies needed).
 */
async function scrapeNotesViaSearch(
  body: SearchNotesRequest
): Promise<ScrapeResponse<PostsScrapeData>> {
  const warnings: string[] = [];
  const { userId, nickname } = body;

  if (!userId && !nickname) {
    return { success: false, error: '请提供userId或nickname参数' };
  }

  console.log(`[WebSearch] Searching notes for: ${nickname || userId}`);

  try {
    const zai = await getZAI();

    // Build search queries targeting user's notes
    const queries: string[] = [];

    if (nickname) {
      queries.push(`${nickname} 小红书 笔记 内容`);
      queries.push(`${nickname} 小红书 博主 笔记 最新`);
    }
    if (userId) {
      queries.push(`小红书 ${userId} 笔记`);
    }

    interface SearchResult {
      title?: string;
      snippet?: string;
      url?: string;
    }

    const allResults: SearchResult[] = [];
    const thirdPartyUrls: string[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries.slice(0, 2)) {
      try {
        console.log(`[WebSearch] Searching notes: ${query}`);
        const result = await zai.functions.invoke('web_search', { query, num: 8 });
        const results = result?.data?.results || [];

        for (const r of results) {
          const rUrl = r.url || '';
          if (rUrl && !seenUrls.has(rUrl)) {
            seenUrls.add(rUrl);
            allResults.push({
              title: r.title || '',
              snippet: r.snippet || '',
              url: rUrl,
            });

            if (!rUrl.includes('xiaohongshu.com') && !rUrl.includes('xhslink.com')) {
              thirdPartyUrls.push(rUrl);
            }
          }
        }

        if (results.length > 0) break;
      } catch {
        // Continue
      }
    }

    if (allResults.length === 0) {
      return {
        success: false,
        error: '搜索引擎未返回相关笔记结果',
        data: {
          posts: [],
          cursor: '',
          hasMore: false,
          scrapeMethod: 'web_search',
          warnings: ['搜索引擎未返回相关结果'],
        },
      };
    }

    // Read third-party pages for richer data
    const thirdPartyData = await readThirdPartyPages(thirdPartyUrls);

    const searchSummary = allResults
      .slice(0, 10)
      .map(
        (r, i) =>
          `[${i + 1}] 标题: ${r.title || ''}\n    摘要: ${r.snippet || ''}\n    链接: ${r.url || ''}`
      )
      .join('\n\n');

    const combinedData = thirdPartyData
      ? `${searchSummary.slice(0, 4000)}\n\n=== 第三方网站详细内容 ===\n${thirdPartyData.slice(0, 4000)}`
      : searchSummary.slice(0, 6000);

    // Use LLM to extract note data
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个数据提取助手。根据搜索引擎返回的结果和第三方网页内容，提取小红书用户发布的笔记/帖子列表。

请返回 ONLY 合法的 JSON，格式如下：
{
  "posts": [
    {
      "xhsPostId": "笔记ID",
      "title": "笔记标题",
      "content": "笔记内容摘要",
      "coverUrl": "",
      "likes": 0,
      "comments": 0,
      "collects": 0,
      "shares": 0,
      "tags": ["标签1"],
      "postType": "normal",
      "publishDate": ""
    }
  ]
}

如果某个字段无法从搜索结果中获取，使用空字符串、0或空数组。
${nickname ? `博主昵称: ${nickname}` : ''}
${userId ? `博主ID: ${userId}` : ''}`,
        },
        {
          role: 'user',
          content: `请从以下搜索结果和网页内容中提取小红书笔记信息:\n\n${combinedData}`,
        },
      ],
      temperature: 0.1,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const posts: PostData[] = Array.isArray(parsed.posts)
          ? parsed.posts.map((p: any) => ({
              xhsPostId: p.xhsPostId || '',
              title: p.title || '',
              content: p.content || '',
              coverUrl: p.coverUrl || '',
              likes: Number(p.likes) || 0,
              comments: Number(p.comments) || 0,
              collects: Number(p.collects) || 0,
              shares: Number(p.shares) || 0,
              tags: Array.isArray(p.tags) ? p.tags : [],
              postType: p.postType || 'normal',
              publishDate: p.publishDate || '',
            }))
          : [];

        console.log(`[WebSearch] Extracted ${posts.length} notes`);

        return {
          success: true,
          data: {
            posts,
            cursor: '',
            hasMore: false,
            scrapeMethod: 'web_search',
            warnings,
          },
        };
      } catch {
        warnings.push('LLM返回的JSON解析失败');
      }
    }

    return {
      success: false,
      error: '无法从搜索结果中提取笔记数据',
      data: {
        posts: [],
        cursor: '',
        hasMore: false,
        scrapeMethod: 'web_search',
        warnings,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'web_search调用失败';
    warnings.push(`web_search策略异常: ${msg}`);
    return {
      success: false,
      error: msg,
      data: {
        posts: [],
        cursor: '',
        hasMore: false,
        scrapeMethod: 'web_search',
        warnings,
      },
    };
  }
}

/**
 * Scrape a single note via web search (no cookies needed).
 */
async function scrapeNoteViaSearch(
  noteId: string
): Promise<ScrapeResponse<NoteScrapeData>> {
  const warnings: string[] = [];

  console.log(`[WebSearch] Searching note: ${noteId}`);

  try {
    const zai = await getZAI();

    const queries = [
      `小红书 笔记 ${noteId}`,
      `小红书 探索 ${noteId}`,
    ];

    interface SearchResult {
      title?: string;
      snippet?: string;
      url?: string;
    }

    const allResults: SearchResult[] = [];
    const thirdPartyUrls: string[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const result = await zai.functions.invoke('web_search', { query, num: 5 });
        const results = result?.data?.results || [];
        for (const r of results) {
          const rUrl = r.url || '';
          if (rUrl && !seenUrls.has(rUrl)) {
            seenUrls.add(rUrl);
            allResults.push({
              title: r.title || '',
              snippet: r.snippet || '',
              url: rUrl,
            });
            if (!rUrl.includes('xiaohongshu.com') && !rUrl.includes('xhslink.com')) {
              thirdPartyUrls.push(rUrl);
            }
          }
        }
        if (results.length > 0) break;
      } catch {
        // Continue
      }
    }

    if (allResults.length === 0) {
      warnings.push('搜索引擎未返回相关笔记结果');
      return {
        success: false,
        error: '无法通过搜索引擎找到该笔记',
        data: {
          note: {
            noteId,
            title: '',
            content: '',
            coverUrl: '',
            imageUrls: [],
            likes: 0,
            comments: 0,
            collects: 0,
            shares: 0,
            tags: [],
            postType: 'normal',
            publishDate: '',
            authorNickname: '',
            authorAvatar: '',
            commentCount: 0,
          },
          scrapeMethod: 'web_search',
          warnings,
        },
      };
    }

    const thirdPartyData = await readThirdPartyPages(thirdPartyUrls);

    const searchSummary = allResults
      .slice(0, 5)
      .map(
        (r, i) =>
          `[${i + 1}] 标题: ${r.title || ''}\n    摘要: ${r.snippet || ''}\n    链接: ${r.url || ''}`
      )
      .join('\n\n');

    const combinedData = thirdPartyData
      ? `${searchSummary.slice(0, 3000)}\n\n=== 第三方网页内容 ===\n${thirdPartyData.slice(0, 3000)}`
      : searchSummary.slice(0, 4000);

    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个数据提取助手。根据搜索引擎返回的结果和第三方网页内容，提取小红书笔记的详细信息。

请返回 ONLY 合法的 JSON，格式如下：
{
  "noteId": "笔记ID",
  "title": "笔记标题",
  "content": "笔记内容",
  "coverUrl": "",
  "imageUrls": [],
  "likes": 0,
  "comments": 0,
  "collects": 0,
  "shares": 0,
  "tags": ["标签1"],
  "postType": "normal",
  "publishDate": "",
  "authorNickname": "作者昵称",
  "authorAvatar": "",
  "commentCount": 0
}

已知笔记ID: ${noteId}`,
        },
        {
          role: 'user',
          content: `请从以下搜索结果和网页内容中提取小红书笔记信息:\n\n${combinedData}`,
        },
      ],
      temperature: 0.1,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: {
            note: {
              noteId: parsed.noteId || noteId,
              title: parsed.title || '',
              content: parsed.content || '',
              coverUrl: parsed.coverUrl || '',
              imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls : [],
              likes: Number(parsed.likes) || 0,
              comments: Number(parsed.comments) || 0,
              collects: Number(parsed.collects) || 0,
              shares: Number(parsed.shares) || 0,
              tags: Array.isArray(parsed.tags) ? parsed.tags : [],
              postType: parsed.postType || 'normal',
              publishDate: parsed.publishDate || '',
              authorNickname: parsed.authorNickname || '',
              authorAvatar: parsed.authorAvatar || '',
              commentCount: Number(parsed.commentCount) || 0,
            },
            scrapeMethod: 'web_search',
            warnings,
          },
        };
      } catch {
        warnings.push('LLM返回的JSON解析失败');
      }
    }

    return {
      success: false,
      error: '无法从搜索结果中提取笔记数据',
      data: {
        note: {
          noteId,
          title: '',
          content: '',
          coverUrl: '',
          imageUrls: [],
          likes: 0,
          comments: 0,
          collects: 0,
          shares: 0,
          tags: [],
          postType: 'normal',
          publishDate: '',
          authorNickname: '',
          authorAvatar: '',
          commentCount: 0,
        },
        scrapeMethod: 'web_search',
        warnings,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '搜索失败';
    warnings.push(`搜索策略异常: ${msg}`);
    return {
      success: false,
      error: msg,
      data: {
        note: {
          noteId,
          title: '',
          content: '',
          coverUrl: '',
          imageUrls: [],
          likes: 0,
          comments: 0,
          collects: 0,
          shares: 0,
          tags: [],
          postType: 'normal',
          publishDate: '',
          authorNickname: '',
          authorAvatar: '',
          commentCount: 0,
        },
        scrapeMethod: 'web_search',
        warnings,
      },
    };
  }
}

// ─── Strategy 3: LLM Fallback ─────────────────────────────────────────────

/**
 * Last-resort LLM-only analysis when all other strategies fail.
 */
async function llmFallbackProfile(
  url: string,
  existingWarnings: string[]
): Promise<ScrapeResponse<ProfileScrapeData>> {
  const warnings = [
    ...existingWarnings,
    '无法通过搜索引擎获取数据，使用LLM进行基础分析',
  ];
  const userId = extractUserIdFromUrl(url);
  const chineseName = extractChineseUsername(url);

  console.log(`[LLMFallback] Analyzing URL: ${url}`);

  try {
    const zai = await getZAI();
    const llmResult = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个小红书数据分析助手。用户提供了小红书个人主页的URL，但无法直接访问该页面，也无法通过搜索引擎找到相关信息。

请根据URL中的信息进行合理推断和基础分析，并返回 ONLY 合法的 JSON，格式如下：
{
  "nickname": "",
  "xhsId": "从URL提取的用户ID",
  "bio": "",
  "location": "",
  "followers": 0,
  "following": 0,
  "likedCollected": 0,
  "notesCount": 0,
  "suggestions": ["建议1", "建议2", "建议3"]
}

分析要点：
1. 从URL推断用户来源
2. 如果URL中有用户ID，将其填入xhsId
3. 不要编造具体数据，所有数值字段保持为0
4. 不要编造内容方向，bio留空
5. 在suggestions中，提供用户可以手动补充的具体信息建议`,
        },
        {
          role: 'user',
          content: `请分析以下小红书URL:\n${url}\n\nURL中的用户ID: ${userId || '未知'}\nURL中可能的用户名: ${chineseName || '未知'}`,
        },
      ],
      temperature: 0.3,
    });

    const content = llmResult.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const { suggestions, ...userInfo } = parsed;

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        warnings.push(`手动补充建议: ${suggestions.join('; ')}`);
      }

      const account: AccountData = {
        nickname: userInfo.nickname || '',
        xhsId: userInfo.xhsId || userId || '',
        avatarUrl: '',
        bio: userInfo.bio || '',
        location: userInfo.location || '',
        followers: Number(userInfo.followers) || 0,
        following: Number(userInfo.following) || 0,
        likedCollected: Number(userInfo.likedCollected) || 0,
        notesCount: Number(userInfo.notesCount) || 0,
      };

      return {
        success: true,
        data: {
          account,
          posts: [],
          totalFound: 0,
          scrapeMethod: 'llm_fallback',
          warnings,
          partialData: true,
        },
      };
    }
  } catch (e) {
    console.error('[LLMFallback] Error:', e);
    warnings.push('LLM分析也失败了，返回最基础的数据');
  }

  // Ultimate fallback
  return {
    success: true,
    data: {
      account: {
        nickname: chineseName || '',
        xhsId: userId || '',
        avatarUrl: '',
        bio: '',
        location: '',
        followers: 0,
        following: 0,
        likedCollected: 0,
        notesCount: 0,
      },
      posts: [],
      totalFound: 0,
      scrapeMethod: 'llm_fallback',
      warnings,
      partialData: true,
    },
  };
}

// ─── HTTP Server & Router ─────────────────────────────────────────────────

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const { method, url } = req;
  const pathname = url?.split('?')[0] || '';

  // Set timeout for long-running scraping requests (2 minutes)
  req.setTimeout(120000);
  res.setTimeout(120000);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    sendCorsPreflight(res);
    return;
  }

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

  try {
    // ── Health Check ────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, {
        success: true,
        data: {
          status: 'ok',
          service: 'xhs-scraper',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // ── POST /api/scrape/profile ────────────────────────────────────
    if (method === 'POST' && pathname === '/api/scrape/profile') {
      const body = await parseBody<ProfileScrapeRequest>(req);

      if (!body.url) {
        sendJson(res, 400, { success: false, error: '缺少url参数' });
        return;
      }

      // If cookies provided, use cookie-based strategy; otherwise web search
      if (body.cookies && body.cookies.trim()) {
        const result = await scrapeProfileWithCookies(body);
        sendJson(res, result.success ? 200 : 502, result);
      } else {
        const result = await scrapeProfileViaSearch({ url: body.url });
        sendJson(res, result.success ? 200 : 502, result);
      }
      return;
    }

    // ── POST /api/scrape/posts ──────────────────────────────────────
    if (method === 'POST' && pathname === '/api/scrape/posts') {
      const body = await parseBody<PostsScrapeRequest>(req);

      if (!body.userId) {
        sendJson(res, 400, { success: false, error: '缺少userId参数' });
        return;
      }

      if (!body.cookies || !body.cookies.trim()) {
        sendJson(res, 400, { success: false, error: '获取笔记列表需要提供cookies参数' });
        return;
      }

      const result = await scrapePostsWithCookiesInternal(body.userId, body.cookies, body.cursor || '');
      sendJson(res, result.success ? 200 : 502, result);
      return;
    }

    // ── POST /api/scrape/note ───────────────────────────────────────
    if (method === 'POST' && pathname === '/api/scrape/note') {
      const body = await parseBody<NoteScrapeRequest>(req);

      if (!body.noteId) {
        sendJson(res, 400, { success: false, error: '缺少noteId参数' });
        return;
      }

      // If cookies provided, use cookie-based strategy; otherwise web search
      if (body.cookies && body.cookies.trim()) {
        const result = await scrapeNoteWithCookies(body);
        sendJson(res, result.success ? 200 : 502, result);
      } else {
        const result = await scrapeNoteViaSearch(body.noteId);
        sendJson(res, result.success ? 200 : 502, result);
      }
      return;
    }

    // ── POST /api/scrape/search-profile ─────────────────────────────
    if (method === 'POST' && pathname === '/api/scrape/search-profile') {
      const body = await parseBody<SearchProfileRequest>(req);

      if (!body.url) {
        sendJson(res, 400, { success: false, error: '缺少url参数' });
        return;
      }

      const result = await scrapeProfileViaSearch(body);
      sendJson(res, result.success ? 200 : 502, result);
      return;
    }

    // ── POST /api/scrape/search-notes ───────────────────────────────
    if (method === 'POST' && pathname === '/api/scrape/search-notes') {
      const body = await parseBody<SearchNotesRequest>(req);

      if (!body.userId && !body.nickname) {
        sendJson(res, 400, { success: false, error: '请提供userId或nickname参数' });
        return;
      }

      const result = await scrapeNotesViaSearch(body);
      sendJson(res, result.success ? 200 : 502, result);
      return;
    }

    // ── 404 ─────────────────────────────────────────────────────────
    sendJson(res, 404, {
      success: false,
      error: `未找到路径: ${pathname}`,
    });
  } catch (err) {
    console.error('[Server] Unhandled error:', err);
    sendJson(res, 500, {
      success: false,
      error: err instanceof Error ? err.message : '服务器内部错误',
    });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`✅ XHS Scraper Service running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Endpoints:`);
  console.log(`     POST /api/scrape/profile       - Cookie-based profile scraping`);
  console.log(`     POST /api/scrape/posts          - Cookie-based posts listing`);
  console.log(`     POST /api/scrape/note           - Cookie-based note detail`);
  console.log(`     POST /api/scrape/search-profile - Web search profile fallback`);
  console.log(`     POST /api/scrape/search-notes   - Web search notes fallback`);
  console.log(`     GET  /api/health                - Health check`);
});

// Keep server alive - prevent process from exiting due to timeouts
server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;
server.requestTimeout = 120000;

// Keep the process alive with a persistent timer
// This prevents bun from exiting when there are no active handles
setInterval(() => {
  // heartbeat
}, 30000);

// ── Graceful Shutdown ─────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  // Don't exit - keep the service running
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  // Don't exit - keep the service running
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('XHS Scraper Service closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  server.close(() => {
    console.log('XHS Scraper Service closed');
    process.exit(0);
  });
});
