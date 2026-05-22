/**
 * Scrape Note Detail
 *
 * POST /api/scraper/note
 * Body: { noteId: string, xsecToken?: string, cookies: string }
 *
 * Scrapes a single Xiaohongshu note detail page via HTML SSR extraction.
 * Returns full note data including content, images, comments, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeNoteViaHTML } from "@/lib/xhs-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { noteId?: string; xsecToken?: string; cookies?: string };
    if (!body.noteId || !body.cookies) {
      return NextResponse.json(
        { success: false, error: "noteId 和 cookies 必填" },
        { status: 400 }
      );
    }
    const result = await scrapeNoteViaHTML(body.noteId, body.xsecToken || "", body.cookies);
    if (!result) {
      return NextResponse.json(
        { success: false, error: `无法抓取笔记详情: ${body.noteId}` },
        { status: 404 }
      );
    }
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
