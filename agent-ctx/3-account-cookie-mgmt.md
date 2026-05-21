# Task 3 - Account Cookie Management

## Task: Add cookie editing to account management and redesign account dialogs

## Work Summary

All changes completed successfully:

### Database
- Added `cookies String @default("")` to XhsAccount model in prisma/schema.prisma
- Migration applied via `npx prisma db push`

### API Routes
- **POST /api/accounts**: Now accepts `cookies` field and saves it when creating account
- **PATCH /api/accounts/[id]**: Added `cookies` to allowed fields for update
- **GET /api/accounts/[id]**: Returns `cookies` field automatically via Prisma
- **POST /api/accounts/[id]/scrape**: Uses stored cookies from account record as fallback when no cookies provided in request body

### Types
- Added `cookies?: string` to `XhsAccountInfo` interface

### Frontend Components
- **add-account-dialog.tsx**: Passes cookies to account creation; saves cookies to account after successful scrape
- **edit-account-dialog.tsx**: Complete redesign with two sections (Profile + Cookie Management). Cookie section includes: status badge, info banner, textarea, validate button, save button, how-to guide. Added `focusCookies` prop for auto-scroll.
- **account-hub-header.tsx**: Added Cookie button with status indicator dot, `onEditCookies` callback, refresh button tooltip about cookie requirements, Cookie option in mobile dropdown
- **account-hub-view.tsx**: Added `editFocusCookies` state, `handleEditCookies` callback, refresh handler uses stored cookies with fallback to redirect to cookie dialog

### Verification
- All lint checks pass
- API confirmed returning cookies field
- Dev server running with new Prisma client
