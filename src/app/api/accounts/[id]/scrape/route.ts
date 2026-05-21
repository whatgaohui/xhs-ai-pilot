/**
 * Account Scrape API (v3.0)
 *
 * Single reliable strategy: delegate to the xhs-scraper micro-service
 * which uses HTML SSR extraction (no signature required, just Cookie + UA).
 *
 * Body: { cookies: string }   ← required for new flow
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withDb } from "@/lib/db";

const SCRAPER_SERVICE_URL = "http://localhost:3002";

interface ScrapeAccountData {
  nickname?: string;
  xhsId?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  gender?: string;
  followers?: number;
  following?: number;
  likedCollected?: number;
  notesCount?: number;
}

interface ScrapePostData {
  xhsPostId?: string;
  title?: string;
  content?: string;
  coverUrl?: string;
  imageUrls?: string[];
  postType?: string;
  likes?: number;
  comments?: number;
  collects?: number;
  shares?: number;
  tags?: string[];
  publishDate?: string;
  xsecToken?: string;
}

interface ScrapeResultData {
  account: ScrapeAccountData;
  posts: ScrapePostData[];
  totalFound: number;
  scrapeMethod: string;
  warnings: string[];
  partialData: boolean;
}

function mergeField<T extends string | number>(
  fresh: T | undefined,
  fallback: T | undefined,
  emptyVal: T
): T {
  if (fresh === undefined || fresh === null) return fallback ?? emptyVal;
  if (typeof fresh === "string" && fresh.trim() === "") return fallback ?? emptyVal;
  if (typeof fresh === "number" && fresh === 0 && fallback) return fallback;
  return fresh;
}

async function callScraperService(
  url: string,
  cookies: string
): Promise<ScrapeResultData | null> {
  try {
    const res = await fetch(`${SCRAPER_SERVICE_URL}/api/scrape/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, cookies }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error(`[scrape] service returned ${res.status}`);
      return null;
    }
    const json = await res.json();
    return json.success ? (json.data as ScrapeResultData) : null;
  } catch (err) {
    console.error("[scrape] service unreachable:", err);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await withDb(() => db.xhsAccount.findUnique({ where: { id } }));
    if (!account) {
      return NextResponse.json(
        { success: false, error: "账号不存在" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const cookies = String((body as { cookies?: string }).cookies || "");
    if (!cookies) {
      return NextResponse.json(
        {
          success: false,
          error:
            "需要提供 Cookie 才能采集。请使用浏览器扩展导出，或在「Cookie 采集」对话框中粘贴。",
        },
        { status: 400 }
      );
    }

    await withDb(() => db.xhsAccount.update({
      where: { id },
      data: { status: "scraping", errorMessage: "" },
    }));

    const result = await callScraperService(account.xhsUrl, cookies);

    if (!result) {
      await withDb(() => db.xhsAccount.update({
        where: { id },
        data: {
          status: "error",
          errorMessage:
            "采集服务无响应，请确认 xhs-scraper 微服务已启动（port 3002）",
        },
      }));
      return NextResponse.json(
        { success: false, error: "采集服务未启动" },
        { status: 503 }
      );
    }

    const accountStatus = result.partialData ? "partial" : "success";
    const errorMessage =
      result.warnings.length > 0
        ? `[${result.scrapeMethod}] ${result.warnings.join("; ")}`
        : "";

    const updatedAccount = await withDb(() => db.xhsAccount.update({
      where: { id },
      data: {
        nickname: mergeField(result.account.nickname, account.nickname, ""),
        xhsId: mergeField(result.account.xhsId, account.xhsId, ""),
        avatarUrl: mergeField(result.account.avatarUrl, account.avatarUrl, ""),
        bio: mergeField(result.account.bio, account.bio, ""),
        location: mergeField(result.account.location, account.location, ""),
        gender: mergeField(result.account.gender, account.gender, ""),
        followers: mergeField(result.account.followers, account.followers, 0),
        following: mergeField(result.account.following, account.following, 0),
        likedCollected: mergeField(
          result.account.likedCollected,
          account.likedCollected,
          0
        ),
        notesCount: mergeField(
          result.account.notesCount,
          account.notesCount,
          0
        ),
        status: accountStatus,
        lastScrapedAt: new Date(),
        errorMessage,
      },
    }));

    // Upsert posts
    const postsCreated: string[] = [];
    for (const p of result.posts) {
      if (!p.xhsPostId && !p.title) continue;
      const existing = p.xhsPostId
        ? await withDb(() => db.xhsPost.findFirst({
            where: { accountId: id, xhsPostId: p.xhsPostId },
          }))
        : null;
      const data = {
        xhsPostId: p.xhsPostId || "",
        title: p.title || "",
        content: p.content || "",
        coverUrl: p.coverUrl || "",
        imageUrls: JSON.stringify(p.imageUrls || []),
        postType: p.postType || "normal",
        likes: p.likes || 0,
        comments: p.comments || 0,
        collects: p.collects || 0,
        shares: p.shares || 0,
        tags: JSON.stringify(p.tags || []),
        category: "",
        publishDate: p.publishDate || "",
      };
      if (existing) {
        await withDb(() => db.xhsPost.update({ where: { id: existing.id }, data }));
        postsCreated.push(existing.id);
      } else {
        const np = await withDb(() => db.xhsPost.create({ data: { accountId: id, ...data } }));
        postsCreated.push(np.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        account: updatedAccount,
        postsFound: result.totalFound,
        postsSynced: postsCreated.length,
        warnings: result.warnings,
        partialData: result.partialData,
        scrapeMethod: result.scrapeMethod,
      },
    });
  } catch (error) {
    console.error("Scraping failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "采集失败，请重试",
      },
      { status: 500 }
    );
  }
}