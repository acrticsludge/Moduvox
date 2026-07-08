import { NextResponse } from "next/server"
import { ZodError } from "zod"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>

export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (...args) => {
    try {
      return await handler(...args)
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
