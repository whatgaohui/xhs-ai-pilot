# Task: Integrate XHS Scraper into Next.js Process

## Summary
Migrated the XHS scraper micro-service (port 3002) into the Next.js process as API routes + shared utility, eliminating the external process dependency that was being killed by the sandbox.

## Files Created

### `/src/lib/xhs-scraper.ts`
Shared utility module containing all core scraping logic extracted from the micro-service:
- **Types**: `AccountData`, `PostData`, `CommentData`, `ProfileResult` (exported)
- **Constants**: `XHS_WEB_BASE`, `REQUEST_TIMEOUT_MS`, `RATE_LIMIT_DELAY_MS` (exported)
- **Helpers**: `extractUserIdFromUrl`, `extractXsecToken`, `fetchUrl`, `delay`, `buildXhsWebHeaders`, `emptyAccount` (exported)
- **Core scrapers**: `scrapeProfileViaHTML`, `scrapeNoteViaHTML`, `scrapeProfileWithDetails` (exported)
- All internal types (`InitialState`, `NoteCardWrapper`, `NoteDetailInitialState`) and private helpers kept internal

### `/src/app/api/scraper/health/route.ts`
GET endpoint — returns service health with version, strategy, uptime, and `mode: "in-process"` flag.

### `/src/app/api/scraper/profile/route.ts`
POST endpoint — accepts `{ url, cookies }`, calls `scrapeProfileViaHTML()`, returns account + note cards.

### `/src/app/api/scraper/note/route.ts`
POST endpoint — accepts `{ noteId, xsecToken?, cookies }`, calls `scrapeNoteViaHTML()`, returns full note detail.

### `/src/app/api/scraper/profile-with-details/route.ts`
POST endpoint — accepts `{ url, cookies }`, calls `scrapeProfileWithDetails()`, returns account + notes with full details (two-phase scrape).

## Files Modified

### `/src/app/api/accounts/[id]/scrape/route.ts`
- **Removed**: `SCRAPER_SERVICE_URL` constant and `callScraperService()` function (no more HTTP call to localhost:3002)
- **Removed**: Duplicate type definitions (`ScrapeAccountData`, `ScrapePostData`, `ScrapeCommentData`, `ScrapeResultData`)
- **Added**: Direct import of `scrapeProfileWithDetails` and `ProfileResult` from `@/lib/xhs-scraper`
- **Changed**: Instead of HTTP fetch to the external service, now calls `scrapeProfileWithDetails()` directly in-process
- **Updated**: Error message changed from "请确认 xhs-scraper 微服务已启动（port 3002）" to "请检查 Cookie 是否有效或稍后重试"

## Key Design Decisions
1. **Direct function import** in the scrape route rather than HTTP fetch to internal API routes — avoids unnecessary HTTP overhead and is more reliable
2. **API routes still exist** as thin wrappers for any other consumers or future use
3. **All existing logic preserved**: HTML SSR extraction, __INITIAL_STATE__ parsing, comment extraction, rate limiting, error handling
4. **No port 3002 dependency** — everything runs in the Next.js process

## Verification
- ESLint: passed with zero errors
- Dev server: no compilation errors
