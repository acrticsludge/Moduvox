import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { gzipSync } from "node:zlib"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>

/**
 * Compress a JSON response with gzip if it's large enough to benefit.
 * Skips:
 *   - Responses < 1 KB (overhead > savings)
 *   - Non-JSON responses (binary/file/audio)
 *   - Error responses (4xx/5xx — small, not worth it)
 *   - Already-compressed responses (avoid double compression)
 */
export async function compressResponse(response: NextResponse): Promise<NextResponse> {
  // Already compressed? Pass through.
  if (response.headers.has("content-encoding")) return response

  // Only compress successful JSON responses
  if (!response.ok) return response

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return response

  // Clone before reading — Response body is a single-use stream.
  // The clone preserves the original body so we can return it unchanged
  // when compression is skipped (< 1 KB, non-JSON, etc.).
  const cloned = response.clone()
  const body = await cloned.text()
  if (body.length < 1024) return response

  const compressed = gzipSync(Buffer.from(body, "utf-8"), { level: 6 })
  const headers = new Headers(response.headers)
  headers.set("content-encoding", "gzip")
  headers.set("content-length", String(compressed.length))
  headers.set("vary", "Accept-Encoding")

  return new NextResponse(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (...args) => {
    try {
      const response = await handler(...args)
      return compressResponse(response)
    } catch (error) {
      console.error("[API Error]", error instanceof Error ? error.message : error)

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 422 },
        )
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      )
    }
  }
}
