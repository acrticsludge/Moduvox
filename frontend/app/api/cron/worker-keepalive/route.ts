import { NextResponse } from "next/server"

/**
 * GET /api/cron/worker-keepalive
 *
 * Vercel cron endpoint — pings the Render worker every 10 minutes to:
 * 1. Keep the instance warm (prevents 15-min sleep on free tier)
 * 2. Trigger email queue processing for any pending emails
 */
export async function GET() {
  const workerUrl = process.env.RENDER_WORKER_URL
  if (!workerUrl) {
    console.warn("[cron] RENDER_WORKER_URL not set — skipping")
    return NextResponse.json({ ok: false, reason: "not configured" }, { status: 200 })
  }

  const results: string[] = []

  // Wake up the worker
  try {
    const healthRes = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(10_000) })
    results.push(`health: ${healthRes.status}`)
  } catch (err) {
    results.push(`health: ${err instanceof Error ? err.message : "failed"}`)
  }

  // Trigger email queue processing
  try {
    const queueRes = await fetch(`${workerUrl}/queue/process`, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    })
    results.push(`queue: ${queueRes.status}`)
  } catch (err) {
    results.push(`queue: ${err instanceof Error ? err.message : "failed"}`)
  }

  return NextResponse.json({ ok: true, results })
}
