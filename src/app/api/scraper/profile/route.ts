/**
 * Scrape Profile
 *
 * POST /api/scraper/profile
 * Body: { url: string, cookies: string }
 *
 * Scrapes a Xiaohongshu profile page via HTML SSR extraction.
 * Returns account info + note cards (without full note details).
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeProfileViaHTML, delay, RATE_LIMIT_DELAY_MS } from "@/lib/xhs-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: string; cookies?: string };
    if (!body.url || !body.cookies) {
      return NextResponse.json(
        { success: false, error: "url 和 cookies 必填" },
        { status: 400 }
      );
    }
    const result = await scrapeProfileViaHTML(body.url, body.cookies);
    await delay(RATE_LIMIT_DELAY_MS);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
