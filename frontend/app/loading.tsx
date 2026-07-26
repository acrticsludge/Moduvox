import { Skeleton } from "@/components/ui/skeleton"

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Navbar */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <Skeleton className="h-6 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      {/* Hero section skeleton */}
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-3 text-center">
            <Skeleton className="mx-auto h-10 w-64" />
            <Skeleton className="mx-auto h-5 w-96" />
          </div>
          <div className="flex justify-center gap-4">
            <Skeleton className="h-12 w-40 rounded-xl" />
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
