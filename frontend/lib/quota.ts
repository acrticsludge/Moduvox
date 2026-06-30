import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Types ────────────────────────────────────────

export interface QuotaResult {
  allowed: boolean
  limit: number
  current: number
  /** Human-readable message for the user */
  message?: string
  /** Key identifying which limit was hit (for the UI dialog) */
  limitKey?: "presentations_lifetime" | "presentations_daily" | "voice_clones" | "preset_voices"
}

// ── Free Tier Limits ─────────────────────────────

const FREE_LIMITS = {
  presentations_lifetime: 15,
  presentations_daily: 3,
  voice_clones: 1,
  preset_voices: 5,
} as const

// ── Quota Checks ─────────────────────────────────

export async function checkPresentationQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const { count, error } = await supabase
    .from("presentations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "archived")

  if (error) {
    console.error("checkPresentationQuota error:", error)
    return { allowed: false, limit: FREE_LIMITS.presentations_lifetime, current: FREE_LIMITS.presentations_lifetime, message: "Could not verify usage. Please try again." }
  }

  const current = count ?? 0
  const limit = FREE_LIMITS.presentations_lifetime

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "presentations_lifetime",
      message: `You've reached the lifetime limit of ${limit} presentations. Upgrade to Pro to create more.`,
    }
  }

  return { allowed: true, limit, current }
}

export async function checkDailyPresentationQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const limit = FREE_LIMITS.presentations_daily

  const { count, error } = await supabase
    .from("presentations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "archived")
    .gte("created_at", todayStart.toISOString())

  if (error) {
    console.error("checkDailyPresentationQuota error:", error)
    return { allowed: false, limit, current: limit, message: "Could not verify usage. Please try again." }
  }

  const current = count ?? 0

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "presentations_daily",
      message: `You've reached the daily limit of ${limit} presentations. Try again tomorrow or upgrade to Pro.`,
    }
  }

  return { allowed: true, limit, current }
}

export async function checkVoiceCloneQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const { count, error } = await supabase
    .from("voices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "cloned")

  if (error) {
    console.error("checkVoiceCloneQuota error:", error)
    return { allowed: false, limit: FREE_LIMITS.voice_clones, current: FREE_LIMITS.voice_clones, message: "Could not verify usage. Please try again." }
  }

  const current = count ?? 0
  const limit = FREE_LIMITS.voice_clones

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "voice_clones",
      message: `You've reached the limit of ${limit} voice clone${limit !== 1 ? "s" : ""}. Upgrade to Pro to clone more voices.`,
    }
  }

  return { allowed: true, limit, current }
}

export async function checkPresetVoiceQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const { count, error } = await supabase
    .from("voices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "preset")

  if (error) {
    console.error("checkPresetVoiceQuota error:", error)
    return { allowed: false, limit: FREE_LIMITS.preset_voices, current: FREE_LIMITS.preset_voices, message: "Could not verify usage. Please try again." }
  }

  const current = count ?? 0
  const limit = FREE_LIMITS.preset_voices

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "preset_voices",
      message: `You've reached the limit of ${limit} preset voices. Upgrade to Pro to use more voices.`,
    }
  }

  return { allowed: true, limit, current }
}

// ── Response Helper ──────────────────────────────

export function quotaBlockResponse(result: QuotaResult) {
  return NextResponse.json(
    {
      error: result.message,
      limitKey: result.limitKey,
      limit: result.limit,
      current: result.current,
    },
    { status: 429 },
  )
}
