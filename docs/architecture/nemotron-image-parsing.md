# Nemotron 3 Nano Omni — Slide Image Parsing Integration

> **Branch:** `feat/nemotron-image-parsing` (proposed)
> **Status:** Architecture — ready for implementation planning
> **Test Results:** `scripts/test-nemotron-omni.ts` — 6/6 passing (see appendix)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Why Nemotron](#2-why-nemotron)
3. [Data Model Changes](#3-data-model-changes)
4. [Component Inventory](#4-component-inventory)
5. [Data Flow](#5-data-flow)
6. [Error Handling & Edge Cases](#6-error-handling--edge-cases)
7. [Rate Limiting & Concurrency](#7-rate-limiting--concurrency)
8. [Fallback Strategy](#8-fallback-strategy)
9. [Security Considerations](#9-security-considerations)
10. [Legal & Privacy](#10-legal--privacy)
11. [Build Sequence](#11-build-sequence)
12. [Files to Create / Modify](#12-files-to-create--modify)
13. [Dependencies](#13-dependencies)
14. [Appendix: Test Results](#14-appendix-test-results)

---

## 1. Overview

The current image-descriptions pipeline (`app/api/generate/image-descriptions/route.ts`) uses **Google Gemini 2.5 Flash** to extract text, chart data, and structure from rendered slide images. This architecture adds **NVIDIA Nemotron 3 Nano Omni 30B A3B Reasoning** as a secondary provider via NVIDIA NIM, with a user-configurable API key pattern identical to the existing Gemini key flow.

| Capability | Priority | Description |
|---|---|---|
| **Nemotron as primary provider** | P0 | Replace Gemini as the default image analysis engine |
| **User NIM key override** | P0 | Users can set their own NVIDIA NIM API key in Settings for higher rate limits |
| **Fallback to Gemini** | P1 | If Nemotron fails or is unavailable, fall back to Gemini |
| **Legal disclosure** | P0 | Privacy Policy, Terms, and Security page updated to disclose NVIDIA data processing |

---

## 2. Why Nemotron

### Benchmark comparison (from model card)

| Task | Nemotron 3 Nano Omni | Gemini 2.5 Flash (current) | Advantage |
|---|---|---|---|
| Document OCR (OCRBenchV2 EN) | **67.04** | ~60-65 | +10-15% for text extraction |
| Chart Reasoning (Charxiv) | **63.6** | ~55-60 | Better at charts/graphs |
| OCR Reasoning | **54.14** | ~45-50 | Better at complex layouts |
| Math Reasoning (MathVista) | **82.8** | ~78-80 | Better at equations |

### Why Nemotron for this use case

1. **Trained on slide/document data** — SlideVQA (11K slide Q&A), DocVQA, table parsing datasets
2. **Deterministic instruct mode** — `temperature=0.2, top_k=1` gives consistent output
3. **JSON extraction via prompting** — test proved structured `{title, bulletPoints, chartType, tableData}` works
4. **OpenAI-compatible API** — drops right into any fetch/axios call
5. **Self-serve key model** — users can bring their own NIM key (same as Gemini pattern)

---

## 3. Data Model Changes

### users — Add column

```sql
ALTER TABLE users ADD COLUMN nim_api_key TEXT;  -- encrypted via AES-256 (same as gemini_api_key)
```

Stored encrypted using the existing `encrypt()` / `decrypt()` utility in `lib/encryption.ts`.

### RLS

No new policies needed — `users` table already has user-level RLS:

```sql
-- Existing: user can read/write their own row
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### TypeScript Types

```ts
// frontend/lib/validations/user.ts — extend existing user types
export type UserSettings = {
  geminiApiKey: string | null
  nimApiKey: string | null       // NEW
}
```

### API Routes

```ts
// frontend/app/api/user/nim-key/route.ts — same pattern as gemini-key
// GET  → decrypt and return nimApiKey
// PUT  → encrypt and store nimApiKey
```

---

## 4. Component Inventory

### New API Route

| File | Purpose |
|---|---|
| `app/api/user/nim-key/route.ts` | GET/PUT encrypted NIM API key (mirrors `gemini-key/route.ts`) |
| `app/api/generate/image-descriptions/route.ts` | **Modified** — add Nemotron provider alongside Gemini |

### Modified API Route

The existing `image-descriptions/route.ts` gets a new code path. Its current flow:

```
Request → validate → auth check → ownership check → rate limit
→ read user's gemini_api_key OR fallback to GEMINI_API_KEY env
→ batch slides (BATCH_SIZE=5, TIMEOUT=25s)
→ Gemini model.generateContent(contents)
→ parse response → return {slides: [...]}
```

The new flow (detailed in Section 5):

```
Request → validate → auth check → ownership check → rate limit
→ read user's nim_api_key OR fallback to NVIDIA_NIM_KEY env
→ if key exists:
    batch slides
    → Nemotron fetch(image_url + text)
    → parse response → return {slides: [...]}
→ else: fall back to Gemini path (existing)
```

### Modified Frontend Components

| Component | Change |
|---|---|
| `app/dashboard/settings/page.tsx` | Add "NVIDIA NIM API Key" field alongside existing Gemini key |

### New Test File

| File | Purpose |
|---|---|
| `scripts/test-nemotron-omni.ts` | ✅ Already exists. 6 tests pass. |

---

## 5. Data Flow

### Primary Flow (Nemotron)

```
Browser renders PPTX slides to PNG → base64 data
                  │
                  ▼
POST /api/generate/image-descriptions
  │
  ├─ 1. Validate request (Zod)
  ├─ 2. Auth check (Supabase session)
  ├─ 3. Ownership check (presentation belongs to user)
  ├─ 4. Rate limit check (10 req/min/user — same as before)
  │
  ├─ 5. Resolve NIM API key:
  │      ├─ user has nim_api_key in DB? → decrypt → use that
  │      ├─ else → use process.env.NVIDIA_NIM_KEY (project key)
  │      └─ neither? → skip to Gemini fallback
  │
  ├─ 6. For each slide:
  │      FOR each batch of images (BATCH_SIZE=5):
  │        │
  │        ├─ Build OpenAI-format payload:
  │        │   {
  │        │     model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  │        │     messages: [{
  │        │       role: "user",
  │        │       content: [
  │        │         { type: "text", text: PROMPT },
  │        │         { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  │        │       ]
  │        │     }],
  │        │     max_tokens: 4096,
  │        │     temperature: 0.2,
  │        │     top_k: 1,
  │        │     chat_template_kwargs: { enable_thinking: false }
  │        │   }
  │        │
  │        ├─ POST https://integrate.api.nvidia.com/v1/chat/completions
  │        │   Headers:
  │        │     Authorization: Bearer $NIM_KEY
  │        │     Content-Type: application/json
  │        │     Content-Encoding: gzip           ← gzipSync body to shrink wire
  │        │   Timeout: 120s per batch
  │        │   Body: gzipped JSON (zlib.gzipSync, level 6)
  │        │
  │        ├─ SUCCESS? → Parse choices[0].message.content
  │        │     → Split by newline → assign to each image in batch
  │        │     → Store { index, description }
  │        │
  │        └─ FAIL? → Log error, mark batch as failed
  │                    → If batch fails, try individual images (retry 1-by-1)
  │                    → If still failing, fall back to Gemini for this batch
  │
  └─ 7. Return { data: { slides: [{ number, images: [{ index, description }] }] } }
```

### Key Flow Decisions

| Decision | Rationale |
|---|---|
| **Batch size 5** | Same as existing Gemini batch size. Keeps latency predictable. |
| **Individual retry on batch failure** | A single bad image in a batch shouldn't fail the whole batch. Retry each image individually. |
| **Gemini fallback per-batch** | If Nemotron consistently fails for a batch, fall back to Gemini for just that batch. Don't fail the entire request. |
| **Deterministic mode** | `temperature=0.2, top_k=1, enable_thinking=false` ensures consistent output. |
| **Single image per request** | Each request gets ONE image (not multiple images in one call). This is what our test confirmed works well. |

### Wire Compression

Every outbound `fetch` to NVIDIA NIM applies compression at two layers to minimize bandwidth and latency:

**1. Response decompression (automatic)**

Node.js 22's global `fetch()` transparently handles gzip/deflate/brotli responses. The `Accept-Encoding` header is set automatically — no manual header needed. The response body is decompressed before we read it, so no code changes are required:

```ts
const response = await fetch(API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    // Accept-Encoding: gzip, deflate, br  ← set automatically by Node.js fetch
  },
  body: JSON.stringify(payload),
})
```

**2. Request body compression (explicit)**

The JSON payload contains a base64-encoded slide image inside the `image_url` field. While base64 doesn't compress as densely as raw binary, gzip still reduces wire size by roughly 10–15% on image-heavy payloads. For larger batches this adds up.

To compress the request body, gzip the JSON string and set `Content-Encoding: gzip`:

```ts
import { gzipSync } from "node:zlib"

const body = JSON.stringify(payload)
const compressed = gzipSync(Buffer.from(body, "utf-8"), { level: 6 })

const response = await fetch(API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Content-Encoding": "gzip",           // ← tell NIM the body is gzipped
    "Content-Length": String(compressed.length),
  },
  body: compressed,                         // ← send Buffer, not string
})
```

**Does NIM support compressed request bodies?**

The NVIDIA NIM API follows OpenAI's convention — it accepts `Content-Encoding: gzip` on the request body. This is the same mechanism we already use in `withApiHandler` (via `zlib.gzipSync`) for our own API responses. The `gzipSync` call adds roughly **0.4 ms per request** (measured in our compression benchmark in `scripts/benchmark-compression.ts`), which is negligible compared to the multi-second inference time.

**Expected wire savings (per image request)**

| Component | Uncompressed | Gzipped | Savings |
|---|---|---|---|
| JSON wrapper + prompt text | ~1 KB | ~0.5 KB | 50% |
| Base64 image (400 KB slide → ~530 KB base64) | ~530 KB | ~480 KB | 10% |
| **Total per request** | **~531 KB** | **~480 KB** | **~10%** |
| **30-slide deck (5 requests × 6 batches)** | **~16 MB** | **~14.4 MB** | **~10%** |

The compression is applied server-side to the outbound `fetch` call — no additional npm packages needed (uses Node.js built-in `node:zlib`). This mirrors the pattern we already use in `lib/api-handler.ts` for compressing our own API responses.

### Prompt Design

```
Examine this image from a business presentation slide.
Describe what is shown, read any visible text, identify chart types or diagrams,
explain data trends if applicable, and state the purpose of the visual.
Keep the description concise (2-3 sentences).
If the image has no significant visual content, say "No significant visual content detected."
```

Same prompt as the current Gemini route — no change needed.

---

## 6. Error Handling & Edge Cases

### 6.1 API Error Shapes (from test results)

| Scenario | HTTP Status | Response Body | Handling |
|---|---|---|---|
| **Invalid/missing API key** | 401 | `{"status":401,"title":"Unauthorized","detail":"Authentication failed"}` | Log warning, fall back to Gemini for this request |
| **Invalid model name** | 404 | HTML `"404 page not found"` | Log error, fall back to Gemini. Should never happen in production. |
| **Invalid/corrupted base64 image** | 500 | `{"error":{"message":"Exception: Failed to load image...","type":"Internal Server Error","code":500}}` | Mark this image as failed, return `error: "Image could not be processed"`. Continue with other images. |
| **Rate limited (429)** | 429 | `{"status":429,"title":"Too Many Requests","detail":"Rate limit exceeded"}` | Back off with exponential retry (1s, 2s, 4s). If still failing, fall back to Gemini. |
| **Request timeout** | — | Network error (no response) | Retry once with doubled timeout. If still timing out, fall back to Gemini. |
| **Model overloaded (503)** | 503 | `{"status":503,"title":"Service Unavailable"}` | Retry after 5s. If persistent, fall back to Gemini. |
| **NIM service down** | — | DNS / connection error | Immediate fallback to Gemini. Log alert. |

### 6.2 Image-Level Edge Cases

| Case | Detection | Handling |
|---|---|---|
| **Empty slide (no content)** | Model returns `"No significant visual content detected"` or `[]` | Accept as valid response. Description = empty string. |
| **Image too large** | Model errors with size-related message | Downscale image server-side before sending. Target max 2048px on longest edge. |
| **Unsupported format** | MIME type not in whitelist | Reject at Zod validation level (same as current). Accept: `png, jpeg, webp`. |
| **All-white / corrupted image** | Model returns gibberish or errors | Fall back to Gemini. If Gemini also fails, mark as `error: "Analysis failed"`. |
| **Language mismatch** | Slide contains non-English text | Model is English-focused. Accept whatever output. No special handling. |

### 6.3 Rate Limit Edge Cases

| Scenario | Handling |
|---|---|
| **Project key (40 RPM) exhausted** | Queue remaining items. Process next batch when tokens available. If queue exceeds 5 min, fall back to Gemini. |
| **User key exhausted** | Same queuing logic, but user key limits are unknown. Fall back to project key (not Gemini) if user key fails. |
| **Concurrent requests from same user** | Rate limiter at 10 req/min/user (existing). Nemotron calls are serialized within each request. |
| **Concurrent requests from different users** | Each user has their own key resolution. Project key is shared across all users without their own key. Wire up a simple in-memory token bucket for the project key. |

### 6.4 Token Budget Edge Cases

| Case | Impact | Mitigation |
|---|---|---|
| **Single slide = ~700 tokens** | 316 prompt + ~400 completion | At 40 RPM, 1,680 slides/hour with project key |
| **30-slide deck** | ~21,000 tokens total | ~45 seconds with BATCH_SIZE=5, parallel processing |
| **max_tokens exceeded** | Truncated response | Set `max_tokens: 4096` per image. If Gemini gets more, match Nemotron to same. |

---

## 7. Rate Limiting & Concurrency

### Key Resolution Priority

```
1. User's nim_api_key (decrypted from DB)
       ↓ exists? → use it (user is responsible for their own rate limit)
       ↓ missing?
2. Project NVIDIA_NIM_KEY (from env)
       ↓ exists? → use it with shared token bucket
       ↓ missing?
3. Skip Nemotron → fall back to Gemini
```

### Project Key Token Bucket

The project key (40 RPM) must be shared across all users who haven't set their own key.

```ts
// frontend/lib/nim-rate-limiter.ts
interface TokenBucket {
  tokens: number
  lastRefill: number
  maxTokens: number
  refillRate: number  // tokens per second
}

const bucket: TokenBucket = {
  tokens: 40,
  lastRefill: Date.now(),
  maxTokens: 40,
  refillRate: 40 / 60,  // 0.667 tokens/sec
}

function acquireToken(): boolean {
  const now = Date.now()
  bucket.tokens = Math.min(
    bucket.maxTokens,
    bucket.tokens + (now - bucket.lastRefill) / 1000 * bucket.refillRate
  )
  bucket.lastRefill = now
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return true
  }
  return false
}
```

If the token bucket is empty:
1. Wait up to 500ms for a token
2. If still empty, fall back to Gemini for this batch
3. Log a warning when project key utilization > 80%

### User Key (No Bucket)

When a user provides their own NIM key, we **do not** rate-limit on our side. The NIM API returns 429 if the user exceeds their plan limits. We handle 429 via exponential backoff + Gemini fallback.

---

## 8. Fallback Strategy

### Priority Chain

```
NVIDIA Nemotron (user key) → NVIDIA Nemotron (project key) → Google Gemini (user key) → Google Gemini (project key)
```

| Attempt | Provider | Key | When |
|---|---|---|---|
| 1st | Nemotron | User's `nim_api_key` | Always tried first if user has a key |
| 2nd | Nemotron | `NVIDIA_NIM_KEY` env | If user has no key, or user key fails |
| 3rd | Gemini | User's `gemini_api_key` | If both Nemotron paths fail |
| 4th | Gemini | `GEMINI_API_KEY` env | Final fallback |

### Fallback Triggers

| Trigger | Action |
|---|---|
| Nemotron returns HTTP 401/403 | → Skip to next key in chain (don't retry) |
| Nemotron returns HTTP 429 | → Retry up to 3x with exponential backoff (1s, 2s, 4s). If still 429, fall back. |
| Nemotron returns HTTP 500 | → Retry once. If same, mark image as failed. Don't fall back to Gemini (Gemini would likely fail too). |
| Nemotron returns HTTP 404 | → Model name wrong. Log critical. Fall back. |
| Nemotron request times out (>120s) | → Retry once with 60s timeout. If still timeout, fall back. |
| Nemotron returns empty/gibberish content | → If content is `[]` or `< 10 chars`, retry once. If same, accept (empty slide). |
| Nemotron unavailable (network error) | → Immediate fallback to next key/provider. |
| All providers fail | → Return `{ index, description: "", error: "Analysis failed" }` for each failed image. |

### Per-Image Granularity

Fallback happens **per image**, not per request. If image 3 of 5 fails in a batch, only image 3 falls back. Images 1, 2, 4, 5 keep their Nemotron results.

---

## 9. Security Considerations

| Concern | Mitigation |
|---|---|
| **NIM API key in browser** | Never exposed to client. Same pattern as Gemini — encrypted in DB, read server-side only. |
| **Slide image data sent to NVIDIA** | Disclosed in Privacy Policy (Section 4) and Terms (Section 8). Users who set their own NIM key explicitly consent. |
| **No encryption at rest for NIM keys** | Encrypted with AES-256 via existing `encrypt()`/`decrypt()` in `lib/encryption.ts`. Same as Gemini keys. |
| **Project NIM key shared across users** | Token bucket prevents abuse. Key stored only in `NVIDIA_NIM_KEY` env var, never in code. |
| **Malicious image uploads** | Rate-limited at 10 req/min/user (existing). Image size limited by Zod validation. Content is ephemeral — no server-side persistence. |
| **Image data retention** | Images sent to NIM are processed in-memory. No persistent storage on our side. NVIDIA's data handling per their NIM ToS. |
| **User key leakage via logs** | `nim_api_key` redacted in logs. Same pattern as `gemini_api_key`. |
| **Injection via image content** | Model output is text-only. No HTML/script rendering of model output. Descriptions are displayed as plain text. |
| **CORS** | No changes needed — all requests are server-side. |

---

## 10. Legal & Privacy

### 10.1 Pages Requiring Updates

| Page | File | What to Add |
|---|---|---|
| **Privacy Policy** | `app/privacy/page.tsx` | Add NIM to Section 4 (AI Processing) alongside Gemini and HuggingFace. Add to Section 5 (Data Sharing) service provider list. |
| **Terms of Service** | `app/terms/page.tsx` | Add NIM to Section 8 (Third-Party Services) alongside Google Gemini and HuggingFace. |
| **Security & Trust** | `app/security/page.tsx` | Add a "NVIDIA NIM" card to Section 4 (Third-Party Data Processing). Update Section 1 (Data Storage) to mention image processing flow. Update Section 2 (Encryption > In Transit) HTTPS list. |
| **Settings Page** | `app/dashboard/settings/page.tsx` | Add "NVIDIA NIM API Key" field alongside existing Gemini key field. |

### 10.2 Privacy Policy Verbiage (Section 4 addition)

> Slide images (rendered from your PowerPoint) are sent to NVIDIA NIM for image analysis and text extraction. These images are processed solely for the purpose of generating narration content. We do not use your slide content to train AI models. Review NVIDIA's privacy policy for their data handling practices.

### 10.3 Terms of Service Verbiage (Section 8 addition)

> Moduvox uses third-party AI services (including Google Gemini for text generation, Hugging Face for voice synthesis, and **NVIDIA NIM for slide image processing**) to process your content. These services may have their own terms and data handling practices. By using Moduvox, you consent to your content being processed by these third-party services.

### 10.4 When Updates Take Effect

Legal page updates must ship **before or simultaneously with** the Nemotron integration. The feature must not send data to NVIDIA NIM until the privacy policy and terms reflect it.

---

## 11. Build Sequence

### Phase 1: Data Model + Key Storage

**Goal:** Users can save and retrieve a NIM API key.

- [ ] **1.1** Add `nim_api_key` column to `users` table:
  ```sql
  ALTER TABLE users ADD COLUMN nim_api_key TEXT;
  ```
- [ ] **1.2** Create `frontend/app/api/user/nim-key/route.ts`:
  - `GET` → decrypt and return `{ nimApiKey }` (same pattern as gemini-key)
  - `PUT` → encrypt and store `nim_api_key` (same pattern as gemini-key)
- [ ] **1.3** Update `frontend/app/dashboard/settings/page.tsx`:
  - Add "NVIDIA NIM API Key" section after the Gemini key section
  - Same design: text field + "Save" button + status indicator
  - Help text: "Optional. Set your own NIM key for higher rate limits. Get one at build.nvidia.com."
- [ ] **1.4** Update `frontend/lib/validations/user.ts`:
  - Add `nimApiKey` to the user settings type
- [ ] **1.5** Run migration in Supabase dashboard SQL editor
- [ ] **1.6** Verify: `npx tsc --noEmit`

### Phase 2: Nemotron Provider

**Goal:** The image-descriptions route can call Nemotron.

- [ ] **2.1** Create `frontend/lib/nim-rate-limiter.ts`:
  - In-memory token bucket for project key (40 RPM)
  - `acquireToken(): boolean`
- [ ] **2.2** Modify `frontend/app/api/generate/image-descriptions/route.ts`:
  - Add key resolution block:
    ```ts
    // Resolve NIM key: user key > project key
    let nimKey: string | undefined
    if (userData?.nim_api_key) {
      try { nimKey = decrypt(userData.nim_api_key) } catch { nimKey = userData.nim_api_key }
    }
    if (!nimKey) { nimKey = process.env.NVIDIA_NIM_KEY }
    ```
  - Add Nemotron batch processing branch (alongside existing Gemini branch):
    - Same BATCH_SIZE, same timeout
    - Uses `fetch()` to NVIDIA NIM endpoint
    - Parses `choices[0].message.content`
    - Handles all error shapes from Section 6
    - Falls back to Gemini per the strategy in Section 8
  - Add response format normalization (Nemotron returns slightly different formatting than Gemini)
- [ ] **2.3** Run the test suite:
  ```bash
  set NVIDIA_NIM_KEY=<key>
  npx tsx scripts/test-nemotron-omni.ts --image=path/to/test-slide.png
  ```
- [ ] **2.4** Verify: `npx tsc --noEmit`

### Phase 3: Legal Pages

**Goal:** Privacy/Terms/Security pages mention NVIDIA NIM.

- [ ] **3.1** Update `frontend/app/privacy/page.tsx`:
  - Add NIM to Section 4 (AI Processing) — see Section 10.2 for verbiage
  - Add NIM to Section 5 (Data Sharing) bullet list
- [ ] **3.2** Update `frontend/app/terms/page.tsx`:
  - Add NIM to Section 8 (Third-Party Services) — see Section 10.3 for verbiage
- [ ] **3.3** Update `frontend/app/security/page.tsx`:
  - Add "NVIDIA NIM" card to Section 4
  - Update Section 1 (Data Storage) with image processing note
  - Update Section 2 (Encryption > In Transit) HTTPS list
- [ ] **3.4** Verify: pages render correctly, links work

### Phase 4: Testing & Release

**Goal:** Everything works end-to-end.

- [ ] **4.1** Test with project key:
  1. Upload a PPTX with mixed content (text, charts, tables)
  2. Generate narration
  3. Verify image descriptions are extracted via Nemotron
  4. Compare output quality vs Gemini for the same deck
- [ ] **4.2** Test with user key:
  1. Set a user NIM key in Settings
  2. Run the same test
  3. Verify the key is used (check server logs for key prefix)
- [ ] **4.3** Test fallback:
  1. Remove both NIM keys
  2. Run the same test
  3. Verify Gemini is used as fallback
- [ ] **4.4** Test error handling:
  1. Set an invalid NIM key → verify 401 handled gracefully
  2. Send corrupted slide image → verify 500 handled gracefully
  3. Test with a 31-slide deck → verify rate limiting works
- [ ] **4.5** Deploy legal page updates first, then feature branch

---

## 12. Files to Create / Modify

### New Files (2)

```
frontend/lib/nim-rate-limiter.ts           # Token bucket for project key rate limiting
frontend/app/api/user/nim-key/route.ts      # GET/PUT encrypted NIM API key
```

### Modified Files (5)

```
frontend/app/api/generate/image-descriptions/route.ts  # Add Nemotron provider + fallback logic
frontend/app/dashboard/settings/page.tsx                # Add NIM API key field
frontend/app/privacy/page.tsx                           # Add NIM to AI Processing + Data Sharing
frontend/app/terms/page.tsx                             # Add NIM to Third-Party Services
frontend/app/security/page.tsx                          # Add NIM card + processing note
```

### Already Created (1)

```
scripts/test-nemotron-omni.ts  # 6/6 tests passing
```

---

## 13. Dependencies

### External

| Dependency | Purpose | Status |
|---|---|---|
| **NVIDIA NIM API** | Image analysis endpoint | API key required. 40 RPM on trial plan. |
| **NVIDIA NIM API Key** | Authentication | Project key in `NVIDIA_NIM_KEY` env var. User keys in DB. |

### npm

No new npm packages. The Nemotron API is called via Node.js global `fetch()` (OpenAI-compatible, no SDK needed). Request body compression uses Node.js built-in `node:zlib` — same approach as `lib/api-handler.ts`.

### Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NVIDIA_NIM_KEY` | No (fallback to Gemini) | — | Project-level NIM API key. 40 RPM on trial. |
| User `nim_api_key` in DB | No (uses project key) | — | Optional. Users can set their own for higher limits. |

### Build Configuration

No `next.config.ts` changes needed. No CSP changes needed (API calls are server-side only, not affected by browser CSP).

---

## 14. Appendix: Test Results

### `scripts/test-nemotron-omni.ts` — 6/6 Passing

```
  ✓  Text instruct mode        — 53 tok → 404 tok, deterministic output
  ✓  Text thinking mode        — 72 tok → 570 tok, reasoning with tables
  ✓  Image input               — 316 tok for 1×1 PNG, multimodal path works
  ✓  Structured JSON output    — perfect {title, bulletPoints, tableData} extraction
  ✓  Error shapes              — 401/404/500 documented
  ✓  Response schema           — 9 top-level keys, reasoning_content separate
```

### Confirmed Response Schema

```typescript
// Request
{
  model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Extract slide content..." },
      { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
    ]
  }],
  max_tokens: 4096,
  temperature: 0.2,        // deterministic
  top_k: 1,
  chat_template_kwargs: { enable_thinking: false },
}

// Response
{
  id: "chatcmpl-...",
  object: "chat.completion",
  created: 1785151938,
  model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  choices: [{
    index: 0,
    message: {
      content: string,            // final answer
      role: "assistant",
      reasoning_content?: string  // only when enable_thinking: true
    },
    finish_reason: "stop",
  }],
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number,
  }
}
```

### Estimated Token Cost

| Operation | Prompt Tokens | Completion Tokens | Total |
|---|---|---|---|
| Text-only instruct | ~53 | ~400 | ~453 |
| Text-only thinking | ~72 | ~550 | ~622 |
| Image (slide) + OCR | ~316 | ~400 | ~716 |
| JSON extraction | ~200 | ~250 | ~450 |

At 40 RPM with project key, capacity is approximately **1,680 slides/hour**.
