export default function ViewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#18181B]" />
        <p className="text-sm text-[#71717A]">Loading presentation...</p>
      </div>
    </div>
  )
}
