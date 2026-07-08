import { NextResponse } from "next/server"
import { ZodError } from "zod"

type RouteContext = { params: Promise<Record<string, string>> } | undefined

type ApiHandler<T = unknown> = (
  req: Request,
  context?: RouteContext,
) => Promise<NextResponse<T>>

export function withApiHandler<T = unknown>(
  handler: ApiHandler<T>,
): ApiHandler<T> {
  return async (req, context) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error("[API Error]", error instanceof Error ? error.message : error)

      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.flatten().fieldErrors,
          } as T,
          { status: 422 },
        )
      }

      return NextResponse.json(
        { error: "Internal server error" } as T,
        { status: 500 },
      )
    }
  }
}
