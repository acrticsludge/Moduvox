export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 border-r border-zinc-200 bg-white p-4 md:block">
        <div className="mb-8 h-6 w-24 rounded-lg bg-zinc-100" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-zinc-100" />
          ))}
        </div>
      </aside>
      {/* Main content skeleton */}
      <main className="flex-1 p-6">
        <div className="mb-6 h-8 w-40 rounded-lg bg-zinc-100" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 h-5 w-3/4 rounded bg-zinc-100" />
              <div className="h-4 w-1/2 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
