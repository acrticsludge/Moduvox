// frontend/lib/audit.ts
// Audit logging utility for server-side API routes

import { createAdminClient } from "@/lib/supabase/admin"

export interface AuditLogEntry {
  presentation_id: string
  slide_number?: number
  action: string
  previous_state?: Record<string, unknown>
  new_state?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Log an audit event from an API request.
 * Extracts IP, user agent, and actor from the request.
 */
export async function logAuditFromRequest(
  request: Request,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const admin = createAdminClient()

    // Get current user
    const { data: { user } } = await admin.auth.getUser()

    // Extract client metadata
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    await admin.from("audit_log").insert({
      presentation_id: entry.presentation_id,
      slide_number: entry.slide_number ?? null,
      action: entry.action,
      actor_user_id: user?.id ?? null,
      actor_role: user ? 'owner' : 'system',
      previous_state: entry.previous_state ?? null,
      new_state: entry.new_state ?? null,
      metadata: entry.metadata ?? {},
      ip_address: ip,
      user_agent: userAgent,
    })
  } catch (err) {
    console.error("Audit log failed:", err)
    // Never throw - audit logging is best-effort
  }
}

/**
 * Log an audit event directly (for use in server actions or where request not available)
 */
export async function logAudit(
  presentationId: string,
  action: string,
  opts: {
    slide_number?: number
    actor_user_id?: string
    actor_role?: 'owner' | 'collaborator' | 'viewer' | 'system'
    previous_state?: Record<string, unknown>
    new_state?: Record<string, unknown>
    metadata?: Record<string, unknown>
  } = {}
): Promise<void> {
  try {
    const admin = createAdminClient()

    await admin.from("audit_log").insert({
      presentation_id: presentationId,
      slide_number: opts.slide_number ?? null,
      action,
      actor_user_id: opts.actor_user_id ?? null,
      actor_role: opts.actor_role ?? 'system',
      previous_state: opts.previous_state ?? null,
      new_state: opts.new_state ?? null,
      metadata: opts.metadata ?? {},
    })
  } catch (err) {
    console.error("Audit log failed:", err)
  }
}