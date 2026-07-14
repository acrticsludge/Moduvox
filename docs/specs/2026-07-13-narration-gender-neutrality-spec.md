# Spec: Gender-Neutral Narration Generation

## Problem

AI-generated narration sometimes produces first-person content ("My name is John", "I'd like to show you", "Let me walk you through"). When the voice clone is a different gender than the assumed presenter persona, this creates a jarring mismatch (e.g., a female voice saying "My name is John"). The narration should always be objective third-person with no personal references.

## Solution

Two-layer defense:
1. **Prompt engineering** — update the Gemini system prompt to explicitly forbid first-person pronouns and personal references
2. **Post-processing sanitization** — strip any first-person references that slip through, using a regex-based replacement on the generated narrations

## Changes

### 1. System Prompt Update (`api/generate/narration/route.ts`)

Current prompt (line 137-155) needs explicit rules added:

- Never use first-person pronouns (I, me, my, we, our, us)
- Never introduce yourself or the presenter
- Never say "I'm going to talk about", "Let me show you", etc.
- Use third-person objective narration — "This slide covers", "The key point is", etc.
- Never mention the presenter's name, title, or role
- Use gender-neutral language throughout

### 2. Post-Processing Sanitizer (new `lib/sanitize-narration.ts`)

A pure function that takes a narration string and returns a sanitized version:

```typescript
export function sanitizeNarration(text: string): string
```

Replacements:
- `\bI' (?:m|ve|ll|d)\b` → contextual rewrite (strip personal frame)
- `\bMy\b` → "The" or "This"
- `\bMe\b` → contextual rewrite
- `\bLet me\b` → "This section"
- `\bI'd like to\b` → "This will"
- `\bI want to\b` → "This section aims to"
- `\bWe'll\b` → "This presentation"
- `\bOur\b` → "The"
- `\bWe\b` → "This"

Each replacement is applied per-sentence with awareness of sentence boundaries to avoid false positives in quotes or fixed phrases.

### 3. Integration

In `narration/route.ts`, after parsing the Gemini response (line 163-168), apply `sanitizeNarration()` to each narration value before persisting and returning.

```typescript
const narrations = extractNarrationsJSON(text)
if (narrations) {
  for (const key of Object.keys(narrations)) {
    narrations[key] = sanitizeNarration(narrations[key])
  }
}
```

## Files

| File | Action |
|------|--------|
| `frontend/lib/sanitize-narration.ts` | **Create** — sanitization function |
| `frontend/app/api/generate/narration/route.ts` | **Modify** — update prompt + add sanitization call |

## Testing

- Prompt change: review the updated system prompt for coverage of all first-person patterns
- Sanitizer: verify that common first-person patterns are replaced
- Sanitizer: verify that legitimate third-person content (e.g., "I" in "I/O", "My" in MySQL) is not affected
