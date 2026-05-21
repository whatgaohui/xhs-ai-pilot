# Task 2: Implement Note Detail Scraping in XHS Scraper Microservice

## Work Summary

Added note detail scraping capability to the xhs-scraper microservice, enabling full note content, images, tags, interaction stats, and publish dates to be collected.

## Changes Made

### 1. `mini-services/xhs-scraper/index.ts`

**New function `scrapeNoteViaHTML(noteId, xsecToken, cookies)`:**
- Fetches `https://www.xiaohongshu.com/explore/{noteId}` with xsec_token query param
- Extracts `window.__INITIAL_STATE__` from HTML response
- Parses note detail from `state.note.noteDetailMap[noteId].note`
- Extracts: title, desc (content), type, interactInfo (likes/comments/collects/shares), tagList (topic only), imageList (urlDefault > urlPre > url priority), video info, time (formatted to YYYY-MM-DD), xsecToken
- Handles missing fields gracefully with fallbacks
- Uses existing `parseInteractionCount` for interaction fields like "1.2万"

**New helper function `formatTimestamp(ms)`:**
- Converts millisecond timestamp to "YYYY-MM-DD" format
- Handles undefined/invalid inputs

**New type `NoteDetailInitialState`:**
- Defines the structure of note detail page's `__INITIAL_STATE__`

**New endpoint `POST /api/scrape/note`:**
- Accepts `{ noteId, xsecToken, cookies }`
- Returns `{ success: true, data: PostData }` or error

**New endpoint `POST /api/scrape/profile-with-details`:**
- First calls `scrapeProfileViaHTML` to get profile and note cards
- Then scrapes up to 5 note details (MAX_DETAIL_NOTES = 5) via `scrapeNoteViaHTML`
- Adds 1500ms delay between each note request for rate limiting
- Merges detail data into existing post cards (preserving coverUrl from cards)
- Gracefully handles individual note failures (continues with others)
- Adds informational warnings about limited detail scraping

**Changed route matching:**
- `/api/scrape/profile` now uses exact match (`===`) instead of `startsWith` to avoid conflicts with the new `/api/scrape/profile-with-details` route

### 2. `src/app/api/accounts/[id]/scrape/route.ts`

- Changed `callScraperService` to call `/api/scrape/profile-with-details` instead of `/api/scrape/profile`
- Increased timeout from 60s to 120s to accommodate the additional note detail requests

## Verification

- `bun run lint` passes with no errors
- xhs-scraper service starts successfully on port 3002
- Health check returns correct response
- `/api/scrape/note` endpoint responds (returns expected error for invalid noteId)
- `/api/scrape/profile-with-details` endpoint responds correctly
- Next.js dev server returns HTTP 200
