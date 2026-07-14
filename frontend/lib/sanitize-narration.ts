/**
 * Post-processing sanitizer for AI-generated narration text.
 *
 * Strips first-person pronouns and personal references that may cause a
 * mismatch between the narration's assumed persona and the actual voice clone
 * gender. Runs after Gemini returns raw narration text.
 *
 * The approach is conservative: replaces personal frames with impersonal
 * equivalents rather than removing words entirely, preserving sentence flow.
 */

// Pattern groups ordered from most specific to least specific to avoid
// partial matches (e.g., "Let me" before "Me")
const REPLACEMENTS: [RegExp, string][] = [
  // ── Whole phrases (highest specificity) ──
  [/\bLet me walk you through\b/gi, "This section covers"],
  [/\bLet me take you through\b/gi, "This section covers"],
  [/\bLet me show you\b/gi, "Here is"],
  [/\bLet me explain\b/gi, "This explains"],
  [/\bLet me share\b/gi, "Here is"],
  [/\bLet me start\b/gi, "To begin"],
  [/\bI'd like to (walk|take) you through\b/gi, "This will walk through"],
  [/\bI'd like to show\b/gi, "This shows"],
  [/\bI'd like to explain\b/gi, "This explains"],
  [/\bI'd like to introduce\b/gi, "This introduces"],
  [/\bI'd like to\b/gi, "This aims to"],
  [/\bI want to (walk|take) you through\b/gi, "This covers"],
  [/\bI want to show\b/gi, "This shows"],
  [/\bI want to explain\b/gi, "This explains"],
  [/\bI want to\b/gi, "This aims to"],
  [/\bI'm going to (talk about|discuss|cover|show)\b/gi, "This section covers"],
  [/\bI'll (talk about|discuss|cover|show)\b/gi, "This covers"],
  [/\bI've (covered|shown|discussed|talked about)\b/gi, "This has covered"],
  [/\bI have (covered|shown|discussed|talked about)\b/gi, "This has covered"],
  [/\bLet's (dive|jump) into\b/gi, "Moving to"],
  [/\bLet's (look at|talk about|discuss|explore|review)\b/gi, "This section covers"],
  [/\bLet's\b/gi, "Let us"], // never match "Lets" (third-person verb)

  // ── First-person pronouns ──
  // "My" → "The" (but not in "My" as in MySQL, "My" in company names)
  [/\bMy (name|team|colleague|coworker|boss|manager|company)\b/gi, "The"],
  [/\bMy (presentation|talk|speech|session)\b/gi, "This"],
  [/\bMy (slide|deck)\b/gi, "This"],
  [/\bMy\b(?=\s+\w+)/gi, "The"],

  // "I'm" → rewrite
  [/\bI'm (a|an|the)\s+\w+\b/gi, "This is a"], // "I'm a trainer" → "This is a trainer"
  [/\bI'm (your|their)\b/gi, "This is your"], // "I'm your host" → "This is your host"

  // "I" as a subject pronoun — only at sentence start
  [/(?:^|\.\s+)"?I\b(?!['\w])/gm, "This"],
  // "I" in the middle of a sentence (comma-separated or conjunction)
  [/(?:,\s*)I\b(?!['\w])/gi, ", this"],

  // "Me" as object
  [/\bwith me\b/gi, "with us"],
  [/\bto me\b/gi, "here"],
  [/\bfor me\b/gi, "for this"],
  [/\bfollow me\b/gi, "follow along"],

  // "We" → impersonal
  [/\bWe('?) (?:will|are going to)\b/gi, "This$1 will"],
  [/\bWe (?:have|'ve)\b/gi, "This has"],
  [/\bWe can see\b/gi, "This shows"],
  [/\bWe (?:call|refer to)\b/gi, "This is called"],
  [/\bWe (?:use|utilize|employ)\b/gi, "This uses"],
  [/\bWe (?:need to|should|must)\b/gi, "It is important to"],
  [/\bWe\b(?=\s+\w+)/gi, "This"],

  // "Our" → "The"
  [/\bOur (?:company|organization|team|department)\b/gi, "The"],
  [/\bOur (?:presentation|talk|session|discussion)\b/gi, "This"],
  [/\bOur\b(?=\s+\w+)/gi, "The"],

  // "Us" → context-dependent
  [/\b(?:help|gives|gives|allows)\s+us\b/gi, "helps"],
  [/\blet us\b/gi, "let us"], // already done by "Let's" above, keep for safety
  [/\b(?:for|to)\s+us\b/gi, "here"],

  // ── Direct address / presenter framing ──
  [/\bAs you can see\b/gi, "Here"],
  [/\bAs I mentioned\b/gi, "As mentioned"],
  [/\bAs I said\b/gi, "As stated"],
  [/\bI think\b/gi, "This suggests"],
  [/\bI believe\b/gi, "This indicates"],
  [/\bI recommend\b/gi, "The recommendation is"],
  [/\bIn my opinion\b/gi, "Notably"],
  [/\bIn my experience\b/gi, "Typically"],
  [/\bMy advice\b/gi, "The advice"],
  [/\bMy recommendation\b/gi, "The recommendation"],
]

/**
 * Sanitize a narration string by replacing first-person and personal
 * references with impersonal third-person equivalents.
 *
 * Preserves sentence structure — never removes words entirely,
 * only substitutes phrases.
 */
export function sanitizeNarration(text: string): string {
  let result = text

  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }

  // Clean up double spaces and leading/trailing whitespace from replacements
  result = result.replace(/\s{2,}/g, " ").trim()

  return result
}
