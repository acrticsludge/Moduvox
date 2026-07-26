import { cn } from "@/lib/utils"

/**
 * Skeleton — pulse-animated placeholder that mirrors the target content's shape.
 * Use it in loading.tsx files, Suspense fallbacks, and inline async states.
 *
 * Examples:
 *   <Skeleton className="h-4 w-24" />       // short text line
 *   <Skeleton className="h-40 w-full" />    // card or image area
 *   <Skeleton className="h-10 w-full rounded-lg" />  // input field
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-zinc-100",
        className,
      )}
    />
  )
}
