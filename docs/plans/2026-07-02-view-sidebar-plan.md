# View Sidebar Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement task-by-task.

**Goal:** Replace empty left sidebar with presentation info, link status, session info, CTA, and legal links.

**Architecture:** New `ViewSidebar` component receives data from the view API response. API extended to return `created_at`, `slide_count`, `expires_at`. Uses shadcn `Button` for copy action, lucide icons for visual cues.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, shadcn Button, lucide-react

---

### Task 1: Extend view API to return sidebar metadata

**Files:**
- Modify: `frontend/app/api/view/[shareToken]/route.ts`

- [ ] **Step 1: Add metadata fields to the verified response**

Find the "No gate (or session verified)" response block and replace with:

```typescript
  // No gate (or session verified) — return minimal verified response
  return NextResponse.json({
    data: {
      verified: true,
      title: presentation.title,
      created_at: presentation.created_at,
      slide_count: presentation.slide_count || 0,
      expires_at: presentation.expires_at,
    },
  })
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/view/[shareToken]/route.ts
git commit -m "feat: extend view API with sidebar metadata (created_at, slide_count, expires_at)"
```

---

### Task 2: Create ViewSidebar component

**Files:**
- Create: `frontend/components/view/ViewSidebar.tsx`

- [ ] **Step 1: Create the component**

Create the file with these imports and structure:

```tsx
"use client"

import { useState } from "react"
import { Calendar, Clock, Layers, Link, ExternalLink, Check, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

type ViewSidebarProps = {
  title: string
  createdAt: string
  slideCount: number
  expiresAt: string | null
  viewerFirstViewed?: string
}

export function ViewSidebar({ title, createdAt, slideCount, expiresAt, viewerFirstViewed }: ViewSidebarProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white">
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {/* Presentation Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Presentation</h4>
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Created" value={new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Duration" value="9:45" />
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Slides" value={String(slideCount)} />
          </div>

          <hr className="my-3 border-zinc-100" />

          {/* Link Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Link</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-full justify-start gap-2 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy share link to clipboard</TooltipContent>
            </Tooltip>
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Expires"
              value={expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
            />
          </div>

          <hr className="my-3 border-zinc-100" />

          {/* Session Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Session</h4>
            <InfoRow icon={<Check className="h-4 w-4 text-green-500" />} label="Progress" value="Saved across sessions" />
            {viewerFirstViewed && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="First viewed" value={new Date(viewerFirstViewed).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
            )}
          </div>

          <hr className="my-3 border-zinc-100" />

          {/* CTA */}
          <a href="/" className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-800">
            ✨ Made with Moduvox
            <ExternalLink className="ml-auto h-3 w-3 text-zinc-400" />
          </a>
        </div>

        {/* Legal links at bottom */}
        <div className="border-t border-zinc-100 px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400">
            <a href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy</a>
            <span className="text-zinc-300">·</span>
            <a href="/terms" className="hover:text-zinc-600 transition-colors">Terms</a>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-zinc-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <p className="truncate text-sm text-zinc-800">{value}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add frontend/components/view/ViewSidebar.tsx
git commit -m "feat: add ViewSidebar component with presentation, link, session info"
```

---

### Task 3: Wire ViewSidebar into page.tsx

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1: Update imports**

Add `ViewSidebar` to the imports:

```tsx
import { ViewSidebar } from "@/components/view/ViewSidebar"
```

- [ ] **Step 2: Update the verified state case**

Replace the current `case "verified"` block with:

```tsx
    case "verified":
      return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
          <ViewNavbar />
          <div className="flex flex-1">
            <ViewSidebar
              title={state.meta?.title || "Untitled"}
              createdAt={state.meta?.created_at || new Date().toISOString()}
              slideCount={state.meta?.slide_count || 0}
              expiresAt={state.meta?.expires_at || null}
            />
            <main id="viewer-main-content" className="flex flex-1">
              <ViewContent />
            </main>
          </div>
          <ViewAudioBar />
          <ViewFooter />
        </div>
      )
```

- [ ] **Step 3: Handle data flow for verified state**

The `verified` state type currently only has `{ type: "verified"; viewerId: string }`. It needs to also carry the API response data. Update the `PageState` type:

```typescript
  | { type: "verified"; viewerId: string; title?: string; created_at?: string; slide_count?: number; expires_at?: string | null }
```

- [ ] **Step 4: Update all places that set verified state** to include the metadata.

In `handleGateSuccess`:
```typescript
      setState({
        type: "verified",
        viewerId: data.viewer_id,
      })
```

In `validateAndLoad` (use the verify JSON or view API response):
```typescript
      setState({
        type: "verified",
        viewerId: verifyJson.data?.viewer_id || sessionToken,
      })
```

Actually, the easiest approach is to NOT change the state type. Instead, fetch the sidebar data from the view API after reaching the verified state. Add a small `useEffect` in page.tsx that fires when state.type === "verified" to fetch metadata.

But that's an extra API call. A simpler approach: extend the `verified` state to include metadata from the gate API response (which returns viewer info) and from the view API response.

Let me simplify: the `verified` state can carry optional metadata that gets populated from wherever we have it. The view API is called during `loadPresentation()` — we can store the response data in a ref and use it in the verified state.

The simplest approach: use a `useRef` to store the last fetched view API data (like the old `pendingPlayerData` pattern). Store it when `loadPresentation` succeeds, use it in the `verified` case.

Add a ref:
```typescript
const viewDataRef = useRef<{ title: string; created_at: string; slide_count: number; expires_at: string | null } | null>(null)
```

In `loadPresentation`, when data is returned:
```typescript
viewDataRef.current = data
```

In the verified case:
```typescript
const md = viewDataRef.current
<ViewSidebar title={md?.title || "Untitled"} ... />
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add frontend/app/view/[shareToken]/page.tsx
git commit -m "feat: wire ViewSidebar into verified state with API data"
```
