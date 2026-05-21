/**
 * Legacy XHS Scraper Stub (v3.0)
 *
 * The full scraper implementation has been moved to the
 * `mini-services/xhs-scraper/` micro-service which uses HTML SSR extraction.
 * Main app talks to it via `/api/accounts/[id]/scrape` → port 3002.
 *
 * This file is kept only to satisfy any lingering imports.
 */

import type { ScrapeResult } from "@/types";

export async function scrapeXhsProfile(_url: string): Promise<ScrapeResult> {
  throw new Error(
    "scrapeXhsProfile is no longer available in main app. Use /api/accounts/[id]/scrape which delegates to the xhs-scraper micro-service."
  );
}