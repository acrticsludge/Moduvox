import { BookOpen, Presentation } from "lucide-react"

const mockProjects = [
  {
    name: "Sales Training Q4",
    count: "4 presentations",
    date: "Dec 15, 2025",
    color: "#3B82F6",
    icon: BookOpen,
  },
  {
    name: "Onboarding Guide",
    count: "3 presentations",
    date: "Dec 10, 2025",
    color: "#22C55E",
    icon: Presentation,
  },
]

export function BentoDashboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <h4 className="text-xs font-semibold text-[#18181B]">All Projects</h4>
        <span className="text-[10px] text-[#71717A]">+ New</span>
      </div>

      {/* Project cards */}
      <div className="space-y-2 p-3">
        {mockProjects.map((project) => {
          const Icon = project.icon
          return (
            <div
              key={project.name}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <div
                className="h-[3px] rounded-t-lg"
                style={{ backgroundColor: project.color }}
              />
              <div className="p-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <Icon className="h-3 w-3 text-zinc-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#18181B]">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {project.count}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {project.date}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-zinc-100 p-3">
        <p className="text-[10px] text-[#71717A] hover:text-[#18181B]">
          View all projects &rarr;
        </p>
      </div>
    </div>
  )
}
