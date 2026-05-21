/**
 * XHS Scraper Micro-Service v3.0
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
 * Endpoints:
 *   GET  /api/health                — health check
 *   POST /api/scrape/profile        — { url, cookies } → account + notes from HTML
 *   POST /api/scrape/note           — { noteId, xsecToken, cookies } → single note detail
 *   POST /api/scrape/profile-with-details — { url, cookies } → account + notes with full details
 *
 * Port: 3002
 */

import {
  createServer,
  IncomingMessage,
  ServerResponse,
  request as httpRequestFn,
} from "http";
import { request as httpsRequestFn } from "https";

// ─── Constants ────────────────────────────────────────────────────────────

const PORT = 3002;
const XHS_WEB_BASE = "https://www.xiaohongshu.com";
const REQUEST_TIMEOUT_MS = 30_000;
const RATE_LIMIT_DELAY_MS = 1500;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Types ────────────────────────────────────────────────────────────────

interface AccountData {
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

interface PostData {
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
}

interface ProfileResult {
  account: AccountData;
  posts: PostData[];
  totalFound: number;
  scrapeMethod: "html_ssr";
  warnings: string[];
  partialData: boolean;
}

// ─── URL Helpers ──────────────────────────────────────────────────────────

function extractUserIdFromUrl(url: string): string {
  const m = url.match(/\/user\/profile\/([a-f0-9]{24})/i);
  return m ? m[1] : "";
}

function extractXsecToken(url: string): string {
  const m = url.match(/[?&]xsec_token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────

function fetchUrl(
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const requestFn = isHttps ? httpsRequestFn : httpRequestFn;
    const timeout = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

    const req = requestFn(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );

    req.on("error", reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Request timeout after ${timeout}ms`));
    });
    req.end();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Cookie + Header Builder ──────────────────────────────────────────────

function buildXhsWebHeaders(cookies: string): Record<string, string> {
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

// ─── Main: Scrape Profile via HTML ────────────────────────────────────────

async function scrapeProfileViaHTML(
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

function emptyAccount(): AccountData {
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

// ─── Scrape Note Detail via HTML ───────────────────────────────────────────

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
      }
    >;
  };
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

async function scrapeNoteViaHTML(
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
  };

  console.log(
    `[scrape-note] OK: ${postData.title || "(untitled)"}, likes=${postData.likes}, images=${imageUrls.length}`
  );

  return postData;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";

  // CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Health check
  if (req.method === "GET" && url.startsWith("/api/health")) {
    sendJson(res, 200, {
      success: true,
      service: "xhs-scraper",
      version: "3.0.0",
      strategy: "html_ssr",
      uptime: process.uptime(),
    });
    return;
  }

  // Profile scrape
  if (req.method === "POST" && url === "/api/scrape/profile") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { url?: string; cookies?: string };
      if (!body.url || !body.cookies) {
        sendJson(res, 400, { success: false, error: "url 和 cookies 必填" });
        return;
      }
      const result = await scrapeProfileViaHTML(body.url, body.cookies);
      await delay(RATE_LIMIT_DELAY_MS);
      sendJson(res, 200, { success: true, data: result });
    } catch (err) {
      sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
    return;
  }

  // Note detail scrape
  if (req.method === "POST" && url === "/api/scrape/note") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { noteId?: string; xsecToken?: string; cookies?: string };
      if (!body.noteId || !body.cookies) {
        sendJson(res, 400, { success: false, error: "noteId 和 cookies 必填" });
        return;
      }
      const result = await scrapeNoteViaHTML(body.noteId, body.xsecToken || "", body.cookies);
      if (!result) {
        sendJson(res, 404, { success: false, error: `无法抓取笔记详情: ${body.noteId}` });
        return;
      }
      sendJson(res, 200, { success: true, data: result });
    } catch (err) {
      sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
    return;
  }

  // Batch note details scrape (for incremental scraping)
  if (req.method === "POST" && url === "/api/scrape/notes-batch") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { notes?: Array<{ noteId: string; xsecToken?: string }>; cookies?: string };
      if (!body.notes || !Array.isArray(body.notes) || !body.cookies) {
        sendJson(res, 400, { success: false, error: "notes 数组和 cookies 必填" });
        return;
      }
      const results: PostData[] = [];
      const warnings: string[] = [];
      for (let i = 0; i < body.notes.length; i++) {
        const { noteId, xsecToken } = body.notes[i];
        try {
          if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
          const detail = await scrapeNoteViaHTML(noteId, xsecToken || "", body.cookies);
          if (detail) {
            results.push(detail);
          } else {
            warnings.push(`笔记 ${noteId} 详情抓取失败`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          warnings.push(`笔记 ${noteId} 详情抓取出错: ${msg}`);
        }
      }
      console.log(`[scrape-notes-batch] OK: ${results.length}/${body.notes.length} details scraped, ${warnings.length} warnings`);
      sendJson(res, 200, { success: true, data: { posts: results, warnings } });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err instanceof Error ? err.message : "unknown error" });
    }
    return;
  }

  // Profile scrape with note details
  if (req.method === "POST" && url === "/api/scrape/profile-with-details") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { url?: string; cookies?: string };
      if (!body.url || !body.cookies) {
        sendJson(res, 400, { success: false, error: "url 和 cookies 必填" });
        return;
      }

      // Step 1: Scrape profile to get note cards
      const profileResult = await scrapeProfileViaHTML(body.url, body.cookies);
      if (profileResult.posts.length === 0) {
        sendJson(res, 200, { success: true, data: profileResult });
        return;
      }

      // Step 2: Scrape details for ALL notes (with rate limiting)
      const notesToScrape = profileResult.posts;
      const detailWarnings: string[] = [];

      for (let i = 0; i < notesToScrape.length; i++) {
        const post = notesToScrape[i];
        try {
          // Rate limit between requests
          if (i > 0) {
            await delay(RATE_LIMIT_DELAY_MS);
          }

          const detail = await scrapeNoteViaHTML(
            post.xhsPostId,
            post.xsecToken,
            body.cookies
          );

          if (detail) {
            // Merge detail data into the existing post, keeping the coverUrl from
            // the card if the detail didn't provide one
            post.content = detail.content || post.content;
            post.imageUrls = detail.imageUrls.length > 0 ? detail.imageUrls : post.imageUrls;
            post.likes = detail.likes || post.likes;
            post.comments = detail.comments || post.comments;
            post.collects = detail.collects || post.collects;
            post.shares = detail.shares || post.shares;
            post.tags = detail.tags.length > 0 ? detail.tags : post.tags;
            post.publishDate = detail.publishDate || post.publishDate;
            post.postType = detail.postType || post.postType;
            // Update xsecToken from detail if available
            if (detail.xsecToken) post.xsecToken = detail.xsecToken;
            // Keep coverUrl from card if detail didn't provide one
            if (!post.coverUrl && detail.coverUrl) post.coverUrl = detail.coverUrl;
          } else {
            detailWarnings.push(`笔记 ${post.xhsPostId} 详情抓取失败`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          detailWarnings.push(`笔记 ${post.xhsPostId} 详情抓取出错: ${msg}`);
        }
      }

      // Merge warnings
      profileResult.warnings.push(...detailWarnings);

      console.log(
        `[scrape-profile-with-details] OK: ${profileResult.account.nickname || "(no name)"}, ` +
        `${profileResult.posts.length} posts, ${notesToScrape.length} with details, ` +
        `${detailWarnings.length} warnings`
      );

      sendJson(res, 200, { success: true, data: profileResult });
    } catch (err) {
      sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
    return;
  }

  // Not found
  sendJson(res, 404, { success: false, error: `Route not found: ${url}` });
});

// Keep process alive
setInterval(() => {
  // heartbeat
}, 60_000);

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

server.listen(PORT, () => {
  console.log(`✅ XHS Scraper Service v3.0 running on port ${PORT}`);
  console.log(`   Strategy: HTML SSR (no signature required)`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   Profile:  POST http://localhost:${PORT}/api/scrape/profile`);
  console.log(`   Note:     POST http://localhost:${PORT}/api/scrape/note`);
  console.log(`   Detail:   POST http://localhost:${PORT}/api/scrape/profile-with-details`);
});