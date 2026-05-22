/**
 * XHS Scraper — Shared Utility (v4.0 in-process)
 *
 * Reliable HTML-based scraping for Xiaohongshu profiles.
 *
 * Strategy: HTML SSR Extraction (no signature needed)
 * ----------------------------------------------------
 * Instead of calling edith.xiaohongshu.com APIs (which require X-s/X-t
 * signatures that are heavily obfuscated), we fetch the profile page HTML
 * directly. Xiaohongshu's SSR embeds the full user data and recent notes
 * in `window.__INITIAL_STATE__` JSON. This works with just Cookie + UA.
 *
 * Migrated from the standalone micro-service (port 3002) so the scraping
 * logic runs inside the Next.js process and is not killed by the sandbox.
 */

// ─── Constants ────────────────────────────────────────────────────────────

export const XHS_WEB_BASE = "https://www.xiaohongshu.com";
export const REQUEST_TIMEOUT_MS = 30_000;
export const RATE_LIMIT_DELAY_MS = 1500;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AccountData {
  nickname: string;
  xhsId: string;
  avatarUrl: string;
  bio: string;
  location: string;
  gender: string;
  followers: number;
  following: number;
  likedCollected: number;
  notesCount: number;
}

export interface PostData {
  xhsPostId: string;
  title: string;
  content: string;
  coverUrl: string;
  imageUrls: string[];
  videoUrl: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  tags: string[];
  publishDate: string;
  xsecToken: string;
  postType: string;
  commentList: CommentData[];
}

export interface CommentData {
  xhsCommentId: string;
  content: string;
  userName: string;
  userAvatar: string;
  likes: number;
  subCommentCount: number;
  commentDate: string;
}

export interface ProfileResult {
  account: AccountData;
  posts: PostData[];
  totalFound: number;
  scrapeMethod: "html_ssr";
  warnings: string[];
  partialData: boolean;
}

// ─── Internal Types (not exported) ────────────────────────────────────────

interface InitialState {
  user?: {
    userPageData?: {
      basicInfo?: {
        nickname?: string;
        redId?: string;
        gender?: number;
        ipLocation?: string;
        desc?: string;
        images?: string;
        imageb?: string;
      };
      interactions?: Array<{ type: string; count: string }>;
      tags?: Array<{ tagType: string; name: string }>;
    };
    notes?: Record<string, NoteCardWrapper[]>;
  };
}

interface NoteCardWrapper {
  id: string;
  noteCard?: {
    displayTitle?: string;
    type?: string;
    user?: { nickname?: string; userId?: string };
    interactInfo?: { likedCount?: string };
    cover?: { urlDefault?: string; urlPre?: string; url?: string };
    noteId?: string;
    xsecToken?: string;
  };
}

interface NoteDetailInitialState {
  note?: {
    noteDetailMap?: Record<
      string,
      {
        note?: {
          title?: string;
          desc?: string;
          type?: string;
          interactInfo?: {
            likedCount?: string;
            collectCount?: string;
            commentCount?: string;
            shareCount?: string;
          };
          tagList?: Array<{ name?: string; type?: string }>;
          imageList?: Array<{
            urlDefault?: string;
            urlPre?: string;
            url?: string;
            infoList?: Array<{ width?: number; height?: number }>;
          }>;
          video?: {
            consumer?: {
              originVideoKey?: string;
            };
          };
          time?: number;
          lastUpdateTime?: number;
          xsecToken?: string;
          noteId?: string;
        };
        commentList?: Array<{
          id?: string;
          content?: string;
          userInfo?: {
            nickname?: string;
            image?: string;
          };
          likedCount?: string | number;
          subCommentCount?: number;
          createTime?: number;
          ipLocation?: string;
        }>;
      }
    >;
  };
}

// ─── URL Helpers ──────────────────────────────────────────────────────────

export function extractUserIdFromUrl(url: string): string {
  const m = url.match(/\/user\/profile\/([a-f0-9]{24})/i);
  return m ? m[1] : "";
}

export function extractXsecToken(url: string): string {
  const m = url.match(/[?&]xsec_token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────

export async function fetchUrl(
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<{ statusCode: number; body: string }> {
  const timeout = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: options.headers || {},
      signal: controller.signal,
    });
    const body = await res.text();
    return { statusCode: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Cookie + Header Builder ──────────────────────────────────────────────

export function buildXhsWebHeaders(cookies: string): Record<string, string> {
  return {
    "User-Agent": DEFAULT_UA,
    Cookie: cookies,
    Referer: "https://www.xiaohongshu.com/",
    Origin: "https://www.xiaohongshu.com",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
  };
}

// ─── HTML __INITIAL_STATE__ Extractor ─────────────────────────────────────

function extractInitialState(html: string): InitialState | null {
  // Match `window.__INITIAL_STATE__={...}</script>` or `=...;</script>`
  const m = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/
  );
  if (!m) return null;
  let raw = m[1];
  // The JSON may contain `undefined` (invalid JSON). Replace with null.
  raw = raw.replace(/:\s*undefined/g, ": null").replace(/\bundefined\b/g, "null");
  try {
    return JSON.parse(raw) as InitialState;
  } catch {
    return null;
  }
}

function parseInteractionCount(s: string | undefined): number {
  if (!s) return 0;
  // Could be "1.2K", "1.5万", or pure number
  const t = s.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (/万/.test(t)) {
    const n = parseFloat(t.replace(/万.*$/, ""));
    return Math.round(n * 10_000);
  }
  if (/k$/i.test(t)) {
    const n = parseFloat(t.replace(/k.*$/i, ""));
    return Math.round(n * 1000);
  }
  const n = parseInt(t.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function genderToString(g: number | undefined): string {
  if (g === 0) return "male";
  if (g === 1) return "female";
  return "";
}

function pickCoverUrl(cover: NoteCardWrapper["noteCard"]["cover"] | undefined): string {
  if (!cover) return "";
  return cover.urlDefault || cover.urlPre || cover.url || "";
}

function formatTimestamp(ms: number | undefined): string {
  if (!ms || typeof ms !== "number") return "";
  try {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

export function emptyAccount(): AccountData {
  return {
    nickname: "",
    xhsId: "",
    avatarUrl: "",
    bio: "",
    location: "",
    gender: "",
    followers: 0,
    following: 0,
    likedCollected: 0,
    notesCount: 0,
  };
}

// ─── Main: Scrape Profile via HTML ────────────────────────────────────────

export async function scrapeProfileViaHTML(
  url: string,
  cookies: string
): Promise<ProfileResult> {
  const warnings: string[] = [];
  const userId = extractUserIdFromUrl(url);
  const xsecToken = extractXsecToken(url);

  if (!userId) {
    return {
      account: emptyAccount(),
      posts: [],
      totalFound: 0,
      scrapeMethod: "html_ssr",
      warnings: ["无法从 URL 中提取用户 ID"],
      partialData: true,
    };
  }

  // Build full URL: include xsec_token if present
  let fullUrl = `${XHS_WEB_BASE}/user/profile/${userId}`;
  if (xsecToken) {
    fullUrl += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
  }

  console.log(`[scrape] GET ${fullUrl}`);

  let res: { statusCode: number; body: string };
  try {
    res = await fetchUrl(fullUrl, {
      headers: buildXhsWebHeaders(cookies),
    });
  } catch (err) {
    return {
      account: emptyAccount(),
      posts: [],
      totalFound: 0,
      scrapeMethod: "html_ssr",
      warnings: [`网络请求失败: ${err instanceof Error ? err.message : String(err)}`],
      partialData: true,
    };
  }

  if (res.statusCode !== 200) {
    return {
      account: emptyAccount(),
      posts: [],
      totalFound: 0,
      scrapeMethod: "html_ssr",
      warnings: [`HTTP ${res.statusCode}：可能是 Cookie 失效或被风控`],
      partialData: true,
    };
  }

  const state = extractInitialState(res.body);
  if (!state) {
    return {
      account: emptyAccount(),
      posts: [],
      totalFound: 0,
      scrapeMethod: "html_ssr",
      warnings: ["未找到页面数据（__INITIAL_STATE__），可能页面结构变更"],
      partialData: true,
    };
  }

  const userData = state.user?.userPageData;
  if (!userData) {
    return {
      account: emptyAccount(),
      posts: [],
      totalFound: 0,
      scrapeMethod: "html_ssr",
      warnings: ["页面数据缺失 userPageData"],
      partialData: true,
    };
  }

  // Extract account info
  const basicInfo = userData.basicInfo || {};
  const interactions = userData.interactions || [];
  const tags = userData.tags || [];

  const followsCount =
    interactions.find((i) => i.type === "follows")?.count ?? "0";
  const fansCount = interactions.find((i) => i.type === "fans")?.count ?? "0";
  const interactionCount =
    interactions.find((i) => i.type === "interaction")?.count ?? "0";
  const locationTag = tags.find((t) => t.tagType === "location")?.name ?? "";

  const account: AccountData = {
    nickname: basicInfo.nickname ?? "",
    xhsId: basicInfo.redId ?? "",
    avatarUrl: basicInfo.imageb || basicInfo.images || "",
    bio: basicInfo.desc ?? "",
    location: basicInfo.ipLocation || locationTag || "",
    gender: genderToString(basicInfo.gender),
    followers: parseInteractionCount(fansCount),
    following: parseInteractionCount(followsCount),
    likedCollected: parseInteractionCount(interactionCount),
    notesCount: 0, // Filled below from notes array
  };

  // Extract notes
  const notesMap = state.user?.notes || {};
  const allNotes: NoteCardWrapper[] = [];
  for (const arr of Object.values(notesMap)) {
    if (Array.isArray(arr)) allNotes.push(...arr);
  }

  const posts: PostData[] = allNotes
    .map((wrapper): PostData | null => {
      const nc = wrapper.noteCard;
      if (!nc) return null;
      return {
        xhsPostId: nc.noteId || wrapper.id || "",
        title: nc.displayTitle ?? "",
        content: "", // Detail requires separate request
        coverUrl: pickCoverUrl(nc.cover),
        imageUrls: [],
        videoUrl: "",
        likes: parseInteractionCount(nc.interactInfo?.likedCount),
        comments: 0,
        collects: 0,
        shares: 0,
        tags: [],
        publishDate: "",
        xsecToken: nc.xsecToken ?? "",
        postType: nc.type ?? "normal",
        commentList: [],
      };
    })
    .filter((p): p is PostData => p !== null);

  account.notesCount = posts.length;

  const partialData = !account.nickname || posts.length === 0;
  if (!account.nickname) warnings.push("未能解析到昵称");
  if (posts.length === 0) warnings.push("未抓取到笔记，可能是隐私设置或页面变更");

  console.log(
    `[scrape] OK: ${account.nickname || "(no name)"}, ${posts.length} posts, ${account.followers} followers`
  );

  return {
    account,
    posts,
    totalFound: posts.length,
    scrapeMethod: "html_ssr",
    warnings,
    partialData,
  };
}

// ─── Scrape Note Detail via HTML ───────────────────────────────────────────

export async function scrapeNoteViaHTML(
  noteId: string,
  xsecToken: string,
  cookies: string
): Promise<PostData | null> {
  if (!noteId) return null;

  // Build URL: include xsec_token if provided
  let fullUrl = `${XHS_WEB_BASE}/explore/${noteId}`;
  if (xsecToken) {
    fullUrl += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_share`;
  }

  console.log(`[scrape-note] GET ${fullUrl}`);

  let res: { statusCode: number; body: string };
  try {
    res = await fetchUrl(fullUrl, {
      headers: buildXhsWebHeaders(cookies),
    });
  } catch (err) {
    console.error(
      `[scrape-note] network error for ${noteId}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }

  if (res.statusCode !== 200) {
    console.error(`[scrape-note] HTTP ${res.statusCode} for note ${noteId}`);
    return null;
  }

  // Extract __INITIAL_STATE__
  const m = res.body.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/
  );
  if (!m) {
    console.error(`[scrape-note] no __INITIAL_STATE__ found for note ${noteId}`);
    return null;
  }

  let raw = m[1];
  raw = raw.replace(/:\s*undefined/g, ": null").replace(/\bundefined\b/g, "null");

  let state: NoteDetailInitialState;
  try {
    state = JSON.parse(raw) as NoteDetailInitialState;
  } catch (err) {
    console.error(`[scrape-note] JSON parse error for note ${noteId}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  // Navigate to the note detail
  const noteDetailMap = state.note?.noteDetailMap;
  if (!noteDetailMap) {
    console.error(`[scrape-note] no noteDetailMap for note ${noteId}`);
    return null;
  }

  // Try to find the note by noteId key, or fall back to the first key
  const noteDetail = noteDetailMap[noteId] || Object.values(noteDetailMap)[0];
  if (!noteDetail?.note) {
    console.error(`[scrape-note] no note data for note ${noteId}`);
    return null;
  }

  const n = noteDetail.note;

  // Extract image URLs
  const imageUrls: string[] = (n.imageList || []).map((img) =>
    img.urlDefault || img.urlPre || img.url || ""
  ).filter((u) => u !== "");

  // Extract tags (only topic type)
  const tags: string[] = (n.tagList || [])
    .filter((t) => t.type === "topic")
    .map((t) => t.name || "")
    .filter((name) => name !== "");

  // Determine post type and extract video URL
  let postType = n.type || "normal";
  let videoUrl = "";
  if (n.video?.consumer?.originVideoKey) {
    postType = "video";
    videoUrl = `https://sns-video-bd.xhscdn.com/${n.video.consumer.originVideoKey}`;
  }

  // Extract comments from the note detail page
  const rawComments = noteDetail.commentList || [];
  const commentList: CommentData[] = rawComments.map((c) => ({
    xhsCommentId: c.id || "",
    content: c.content || "",
    userName: c.userInfo?.nickname || "",
    userAvatar: c.userInfo?.image || "",
    likes: typeof c.likedCount === "number" ? c.likedCount : parseInteractionCount(String(c.likedCount || "")),
    subCommentCount: c.subCommentCount || 0,
    commentDate: formatTimestamp(c.createTime),
  })).filter((c) => c.content !== "");

  const postData: PostData = {
    xhsPostId: n.noteId || noteId,
    title: n.title || "",
    content: n.desc || "",
    coverUrl: imageUrls.length > 0 ? imageUrls[0] : "",
    imageUrls,
    videoUrl,
    likes: parseInteractionCount(n.interactInfo?.likedCount),
    comments: parseInteractionCount(n.interactInfo?.commentCount),
    collects: parseInteractionCount(n.interactInfo?.collectCount),
    shares: parseInteractionCount(n.interactInfo?.shareCount),
    tags,
    publishDate: formatTimestamp(n.time),
    xsecToken: n.xsecToken || xsecToken || "",
    postType,
    commentList,
  };

  console.log(
    `[scrape-note] OK: ${postData.title || "(untitled)"}, likes=${postData.likes}, images=${imageUrls.length}, comments=${commentList.length}`
  );

  return postData;
}

// ─── Profile with Note Details ────────────────────────────────────────────

export async function scrapeProfileWithDetails(
  url: string,
  cookies: string
): Promise<ProfileResult> {
  // Step 1: Scrape profile to get note cards
  const profileResult = await scrapeProfileViaHTML(url, cookies);
  if (profileResult.posts.length === 0) {
    return profileResult;
  }

  // Step 2: Scrape details for ALL notes (with rate limiting)
  const notesToScrape = profileResult.posts;
  const detailWarnings: string[] = [];

  for (let i = 0; i < notesToScrape.length; i++) {
    const post = notesToScrape[i];
    try {
      if (i > 0) {
        await delay(RATE_LIMIT_DELAY_MS);
      }

      const detail = await scrapeNoteViaHTML(
        post.xhsPostId,
        post.xsecToken,
        cookies
      );

      if (detail) {
        post.content = detail.content || post.content;
        post.imageUrls = detail.imageUrls.length > 0 ? detail.imageUrls : post.imageUrls;
        post.likes = detail.likes || post.likes;
        post.comments = detail.comments || post.comments;
        post.collects = detail.collects || post.collects;
        post.shares = detail.shares || post.shares;
        post.tags = detail.tags.length > 0 ? detail.tags : post.tags;
        post.publishDate = detail.publishDate || post.publishDate;
        post.postType = detail.postType || post.postType;
        post.commentList = detail.commentList.length > 0 ? detail.commentList : post.commentList;
        if (detail.xsecToken) post.xsecToken = detail.xsecToken;
        if (!post.coverUrl && detail.coverUrl) post.coverUrl = detail.coverUrl;
      } else {
        detailWarnings.push(`笔记 ${post.xhsPostId} 详情抓取失败`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      detailWarnings.push(`笔记 ${post.xhsPostId} 详情抓取出错: ${msg}`);
    }
  }

  profileResult.warnings.push(...detailWarnings);

  console.log(
    `[scrape-profile-with-details] OK: ${profileResult.account.nickname || "(no name)"}, ` +
    `${profileResult.posts.length} posts, ${notesToScrape.length} with details, ` +
    `${detailWarnings.length} warnings`
  );

  return profileResult;
}
