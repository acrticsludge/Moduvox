# Issue #9: Formatting of Image Description Is Raw Response

## Status
Not started — planning phase

## Root Cause
The image-descriptions API route (`/api/generate/image-descriptions`) uses two AI providers (Nemotron and Gemini). Each returns raw, unstructured text. The prompt says "Keep the description concise (2-3 sentences)" but doesn't enforce a specific format or structure. The `SlideParsedData` component displays these descriptions verbatim without any formatting, markdown rendering, or structure.

The descriptions can vary in:
- Length (1 sentence to 5 sentences)
- Format (plain text vs markdown vs numbered)
- Detail level (high-level vs specific)
- Presence/absence of chart type identification

## Expected Behavior
- Image descriptions should follow a consistent, structured format
- The UI should render descriptions clearly with consistent styling
- If the description is just "No significant visual content detected.", it should be displayed as informative notice, not an error

## Actual Behavior
- Descriptions are displayed raw, varying wildly in format
- "No significant visual content detected." messages look like failures

## Files Affected
- `frontend/app/api/generate/image-descriptions/route.ts` — update prompts for structured output
- `frontend/components/dashboard/SlideParsedData.tsx` — improve description rendering
- `frontend/lib/image-analysis.ts` — client-side helper (if needed)

## Edge Cases
1. Nemotron and Gemini produce different formats → unify with post-processing
2. Description is very long (multi-paragraph) → truncate with "show more"
3. Description is empty → show fallback text
4. "No significant visual content detected." → show as dimmed notice, not error
5. Description contains code, numbers, or data → preserve accuracy

## Design Decision
Update the Nemotron prompt to request structured output:
```
Format: "[Visual type]: [description]. [Key data/insight if applicable]."
Example: "Chart (bar): Shows quarterly revenue growth from Q1 to Q4, with Q3 peaking at $1.2M. The upward trend indicates a successful product launch."
```

Apply a simple post-processor in the route that:
1. Trims and normalizes whitespace
2. Ensures first letter is capitalized
3. Adds period if missing
4. Strips leading "Here is..." / "This image shows..." prefixes

## Acceptance Criteria
1. Updated Nemotron prompt requests structured format with visual type prefix
2. Post-processor normalizes whitespace and capitalization
3. SlideParsedData shows descriptions with consistent layout
4. "No significant visual content detected." renders as subtle italic text
5. Empty descriptions show "Description not available" in dimmed text
