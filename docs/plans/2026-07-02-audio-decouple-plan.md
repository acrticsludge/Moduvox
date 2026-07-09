# Audio Decoupling — Plan

**Goal:** Decouple audio generation from playback. Generate once, cache permanently, play via CDN URL.

---

### Task 1: Create ensure endpoint

**Create:** `frontend/app/api/presentations/[id]/audio/ensure/route.ts`

This endpoint generates combined.wav (if needed) and returns a signed URL. Public viewers can use `?session=<token>`.

Logic:
1. Auth via Supabase user or `?session=<token>` (copy pattern from combined endpoint)
2. Look up presentation → get `user_id`
3. Path: `${user_id}/audio/${presentationId}/combined.wav`
4. Check if combined.wav exists via `list()` → `some(f.name === "combined.wav")`
5. If exists → `createSignedUrl(path, 86400)` → return `{ data: { audioUrl } }`
6. If not → list per-slide files from `${user_id}/audio/${presentationId}/slides/`
   - Same listing/filtering/download/concat logic as combined endpoint
   - Use `concatWavBuffers` from `@/lib/wav-utils`
7. Upload combined buffer to path with `upsert: true`
8. `createSignedUrl` → return `{ data: { audioUrl } }`
9. Return JSON, not audio bytes

---

### Task 2: Modify view API to include audio_url

**Modify:** `frontend/app/api/view/[shareToken]/route.ts`

After the totalDurationMs computation block (around line 70-80), add:

```typescript
  // Generate signed URL for cached combined audio
  let audioUrl: string | null = null
  try {
    const combinedPath = `${presentation.user_id}/audio/${presentation.id}/combined.wav`
    const { data: signed } = await supabase.storage
      .from("presentation-files")
      .createSignedUrl(combinedPath, 86400)
    if (signed?.signedUrl) audioUrl = signed.signedUrl
  } catch { /* combined.wav may not exist yet */ }
```

Add `audio_url: audioUrl` to the verified response.

---

### Task 3: Refactor ViewAudioBar

**Modify:** `frontend/components/view/ViewAudioBar.tsx`

Changes:
1. Add `audioUrl?: string` to the props type
2. Remove URL construction from component (`audioUrl` is now a prop)
3. Change the Howl init useEffect to depend on `audioUrl` instead of constructing it
4. Remove the proxy endpoint call logic
5. Keep all existing UI, tracking, keyboard shortcuts identical
6. When `audioUrl` is null, show the spinner play button until URL is available

---

### Task 4: Update page.tsx to pass audio_url

**Modify:** `frontend/app/view/[shareToken]/page.tsx`

1. Update `viewDataRef` type to include `audio_url?: string | null`
2. Pass `audioUrl` to ViewAudioBar:
```typescript
<ViewAudioBar
  shareToken={shareToken}
  sessionToken={sessionToken}
  viewerId={state.viewerId}
  presentationId={viewDataRef.current?.presentation_id || ""}
  totalDurationMs={viewDataRef.current?.total_duration_ms}
  audioUrl={viewDataRef.current?.audio_url || undefined}
/>
```
