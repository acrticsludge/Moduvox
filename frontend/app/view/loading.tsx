import { Skeleton } from "@/components/ui/skeleton"

export default function ViewLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white px-6 py-3">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden w-64 border-r border-zinc-200 bg-white p-6 lg:block">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {/* Main slide area */}
        <main className="flex min-h-[60vh] flex-1 flex-col items-center p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-[400px] w-full max-w-4xl rounded-xl" />
        </main>
      </div>
      {/* Audio bar */}
      <div className="border-t border-zinc-200 bg-white px-6 py-4">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  )
}
