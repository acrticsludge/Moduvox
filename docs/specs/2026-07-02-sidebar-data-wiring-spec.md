# Sidebar Data Wiring — Spec

**Date:** 2026-07-02
**Goal:** Replace all demo/hardcoded data in the left sidebar with real API data.

## Data Sources

| Sidebar Field | Source | Status |
|--------------|--------|--------|
| Title | `presentation.title` via view API | ✅ Already wired |
| Created date | `presentation.created_at` via view API | ✅ Already wired |
| Slide count | `presentation.slide_count` via view API | ✅ Already wired |
| Duration | Computed from `getAllSlideDurations` via view API | ❌ Hardcoded "9:45" |
| Expiration | `presentation.expires_at` via view API | ✅ Already wired |
| First viewed | `viewer.created_at` via gate/view API | ❌ Not passed through |

## Changes

### 1. View API — add `total_duration_ms` and `viewer_created_at`

File: `frontend/app/api/view/[shareToken]/route.ts`

- Import `getAllSlideDurations` from `@/lib/wav-duration`
- In the verified response (no gate or session verified):
  - Compute `totalDurationMs` = sum of all slide durations
  - When `sessionToken` is provided and verified, also fetch `viewer.created_at`
- Return `total_duration_ms` and `viewer_created_at` in the verified response

### 2. ViewSidebar — use real duration data

File: `frontend/components/view/ViewSidebar.tsx`

- Add `totalDurationMs?: number` to props
- Replace hardcoded "9:45" with `formatDuration(totalDurationMs)` helper
- Format: `MM:SS` or `H:MM:SS` for long durations

### 3. page.tsx — pass `viewerFirstViewed` and `totalDurationMs`

File: `frontend/app/view/[shareToken]/page.tsx`

- Store `viewer_created_at` and `total_duration_ms` from the view API response in `viewDataRef`
- Pass `viewerFirstViewed` and `totalDurationMs` to `ViewSidebar`
