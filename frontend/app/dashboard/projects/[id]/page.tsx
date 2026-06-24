import { Plus, FileText, ChevronRight } from "lucide-react"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const projectName = "Security Awareness Training"

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{projectName}</span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          New Presentation
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
            <FileText className="h-7 w-7 text-[#71717A]" />
          </div>
          <h2 className="text-xl font-semibold text-[#18181B]">
            No presentations yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
            Add your first presentation to this project.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
          >
            <Plus className="h-4 w-4" />
            Create your first presentation
          </button>
        </div>
      </div>
    </>
  )
}
