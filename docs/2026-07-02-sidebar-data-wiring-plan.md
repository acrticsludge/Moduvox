# Sidebar Data Wiring — Plan

**Goal:** Wire real duration and first-viewed data to the left sidebar.

---

### Task 1: Extend view API with total_duration_ms and viewer_created_at

**Files:**
- Modify: `frontend/app/api/view/[shareToken]/route.ts`

- [ ] **Step 1:** Add import for `getAllSlideDurations`:
```typescript
import { getAllSlideDurations } from "@/lib/wav-duration"
```

- [ ] **Step 2:** In the session-verified block (around line 40-51), expand the SELECT and result to include viewer's `created_at`:
```typescript
const { data: viewer } = await supabase
  .from("viewers")
  .select("id, email_verified, created_at")
  .eq("session_token", sessionToken)
  .eq("presentation_id", presentation.id)
  .single()
```

- [ ] **Step 3:** After the session verification check (but before the return), compute total duration:
```typescript
  let totalDurationMs = 0
  try {
    const timings = await getAllSlideDurations(presentation.user_id, presentation.id, presentation.slide_count || 0)
    totalDurationMs = timings.reduce((sum, t) => sum + t.durationMs, 0)
  } catch {
    // non-critical
  }
```

  Place this right before the verified response return, inside the scope where these variables are available.

- [ ] **Step 4:** Update the verified response to include the new fields:
```typescript
  return NextResponse.json({
    data: {
      verified: true,
      title: presentation.title,
      created_at: presentation.created_at,
      slide_count: presentation.slide_count || 0,
      expires_at: presentation.expires_at,
      total_duration_ms: totalDurationMs,
      viewer_created_at: sessionVerified && viewer ? viewer.created_at : null,
    },
  })
```

- [ ] **Step 5:** Run `npx tsc --noEmit` and fix any errors.

- [ ] **Step 6:** Commit.

---

### Task 2: Update ViewSidebar to accept and display real duration

**Files:**
- Modify: `frontend/components/view/ViewSidebar.tsx`

- [ ] **Step 1:** Add `totalDurationMs?: number` to the props type.

- [ ] **Step 2:** Add a `formatDuration` helper function:
```typescript
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
```

- [ ] **Step 3:** Replace the duration InfoRow to use real data:
```typescript
<InfoRow icon={<Clock className="h-4 w-4" />} label="Duration" value={totalDurationMs ? formatDuration(totalDurationMs) : "—"} />
```

- [ ] **Step 4:** Run `npx tsc --noEmit` and fix any errors.

- [ ] **Step 5:** Commit.

---

### Task 3: Wire data through page.tsx

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1:** Update the `viewDataRef` type to include the new fields:
```typescript
const viewDataRef = useRef<{ title: string; created_at?: string; slide_count?: number; expires_at?: string | null; total_duration_ms?: number; viewer_created_at?: string | null } | null>(null)
```

- [ ] **Step 2:** Update the `ViewSidebar` call in the verified case to pass the new props:
```typescript
<ViewSidebar
  title={viewDataRef.current?.title || "Untitled"}
  createdAt={viewDataRef.current?.created_at || new Date().toISOString()}
  slideCount={viewDataRef.current?.slide_count || 0}
  expiresAt={viewDataRef.current?.expires_at || null}
  totalDurationMs={viewDataRef.current?.total_duration_ms}
  viewerFirstViewed={viewDataRef.current?.viewer_created_at || undefined}
/>
```

- [ ] **Step 3:** Run `npx tsc --noEmit` and fix any errors.

- [ ] **Step 4:** Commit.
