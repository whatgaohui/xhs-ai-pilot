# Task 3: Fix Draft Notes Visibility and Calendar Click Functionality

## Summary

Fixed two major issues:
1. **Drafts are now visible** in note management - they were previously only stored in `ContentDraft` table but never shown in `ContentView`
2. **Calendar click now works** - date cells are clickable, posts without publishDate show up, and the "今天" button navigates properly

## Files Changed

### `src/types/index.ts`
- Added `scrapedAt?: string` field to `XhsPostInfo` interface

### `src/app/api/drafts/route.ts`
- Added `DELETE /api/drafts?id=xxx` handler for deleting drafts

### `src/components/views/content-view.tsx` (major rewrite)
- **Imports**: Added `ContentDraftInfo` type import and `Palette` icon
- **New types**: `NoteTypeFilter = "all" | "posts" | "drafts"`, `DisplayItem` union type
- **New components**:
  - `DraftStatusBadge` - shows draft/polishing/ready/published status
  - `DraftCard` - card component for drafts with amber color scheme
- **ContentCalendar rewrite**:
  - Now accepts `drafts`, `onDraftClick`, `onDateClick`, `onToday` props
  - Posts without `publishDate` use `scrapedAt` as fallback for calendar grouping
  - Drafts shown in amber style (`bg-amber-100 text-amber-700`)
  - Clicking a cell triggers `onDateClick` for the date detail panel
  - Note/draft buttons stop event propagation with `e.stopPropagation()`
  - "今天" button calls `onToday` to reset to current month
- **ContentView additions**:
  - `drafts` state and `loadDrafts()` function
  - `noteTypeFilter` state with UI filter chips
  - `selectedDraft` state and draft detail dialog
  - `selectedDate` state and date detail panel
  - `draftCopied` state for copy feedback
  - `handleDeleteDraft`, `handleCopyDraftContent`, `handleDateClick`, `handleTodayMonth` functions
  - Grid/list views now render both posts and drafts using `DisplayItem` type
  - Calendar view shows date detail panel on date click
  - Empty states are contextual (different messages for drafts vs posts)

## Key Design Decisions
- Used amber color scheme for drafts to visually distinguish from posts (xhs-red)
- Drafts and posts share the same pagination system via `DisplayItem` union type
- Calendar date click shows a panel below the calendar instead of navigating away
- Draft detail dialog supports: view, copy, edit in creator, delete
