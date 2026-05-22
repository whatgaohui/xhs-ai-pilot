/**
 * Scrape Profile with Note Details
 *
 * POST /api/scraper/profile-with-details
 * Body: { url: string, cookies: string }
 *
 * Two-phase scrape:
 *   1. Fetch profile page → account info + note cards
 *   2. Fetch detail for each note → full content, images, comments, etc.
 *
 * Returns combined result with enriched note data.
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeProfileWithDetails } from "@/lib/xhs-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: string; cookies?: string };
    if (!body.url || !body.cookies) {
      return NextResponse.json(
        { success: false, error: "url 和 cookies 必填" },
        { status: 400 }
      );
    }
    const result = await scrapeProfileWithDetails(body.url, body.cookies);
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
