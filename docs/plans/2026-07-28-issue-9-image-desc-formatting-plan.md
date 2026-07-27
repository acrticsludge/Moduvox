# Plan: Fix Image Description Formatting

## Implementation Order

### Step 1: Update Nemotron prompt for structured output
**File:** `frontend/app/api/generate/image-descriptions/route.ts`
- Update `IMAGE_PROMPT` constant to request structured format:
```
Examine this image from a business presentation slide.
Provide a description in this exact format:
[Visual type]: [description]. [Key data/insight if applicable].

Visual types: Chart, Diagram, Screenshot, Photo, Icon, Table, Logo, Text-only, or Mixed-content.
If no significant visual content, say "No significant visual content."
Keep the description to 2-3 sentences. Be specific about numbers and data.
```
- Update `GEMINI_PROMPT` similarly

### Step 2: Add post-processor
**File:** `frontend/app/api/generate/image-descriptions/route.ts`
Add a `formatDescription(desc: string): string` function:
- Trim whitespace
- Ensure first letter is capitalized
- Add period at end if missing
- Strip common AI prefixes: "Here is", "This image shows", "The image depicts"
- Normalize "No significant visual content" to exact string for UI matching

### Step 3: Improve rendering in SlideParsedData
**File:** `frontend/components/dashboard/SlideParsedData.tsx`
- If description === "No significant visual content detected." → render as dimmed italic text with a small icon instead of normal text
- If description starts with "[Visual type]:" → bold the visual type prefix
- If description is empty → show "No description available" in dimmed text
- If error → show error state as before

## Verification
1. Open "View parsed info" on a slide with images
2. Description shows with proper formatting (e.g., **Chart:** shows quarterly data...)
3. Slides with "No significant visual content" show subtle notice, not error
4. Empty descriptions show dimmed "No description available"
5. Regular text without prefix still renders normally
