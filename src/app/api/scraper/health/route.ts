/**
 * Scraper Health Check
 *
 * GET /api/scraper/health — returns service status
 */

import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "xhs-scraper",
    version: "4.0.0",
    strategy: "html_ssr",
    mode: "in-process",
    uptime: (Date.now() - startTime) / 1000,
  });
}
