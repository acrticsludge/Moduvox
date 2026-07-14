export function AnalyticsMockup() {
  const rows = [
    { name: "Sarah Chen", email: "sarah@acmecorp.com", status: "Completed", pct: "100%", time: "12:04" },
    { name: "Mike Torres", email: "mike@acmecorp.com", status: "In progress", pct: "67%", time: "—" },
    { name: "Priya Kapoor", email: "priya@acmecorp.com", status: "Not viewed", pct: "0%", time: "—" },
    { name: "James Wilson", email: "james@acmecorp.com", status: "Completed", pct: "100%", time: "8:30" },
  ];

  const statusStyles: Record<string, string> = {
    Completed: "bg-green-100 text-green-700",
    "In progress": "bg-zinc-100 text-zinc-600",
    "Not viewed": "bg-zinc-100 text-zinc-400",
  };

  return (
    <>
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 border-b border-zinc-200 bg-zinc-50 p-4">
        {[
          { label: "Total viewers", value: "4" },
          { label: "Completed", value: "2" },
          { label: "Avg completion", value: "67%" },
        ].map((stat) => (
          <div key={stat.label}>
            <span className="text-[11px] text-zinc-400">{stat.label}</span>
            <p className="text-lg font-semibold tracking-tight text-zinc-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              {["Name", "Email", "Status", "Completion", "Time"].map((col) => (
                <th key={col} className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.email} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2.5 text-sm font-medium text-zinc-800">{row.name}</td>
                <td className="px-4 py-2.5 text-sm text-zinc-500">{row.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-zinc-800">{row.pct}</td>
                <td className="px-4 py-2.5 text-sm text-zinc-400">{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <span className="text-xs text-zinc-500">Showing 4 of 12 viewers</span>
        <span className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          Export CSV
        </span>
      </div>
    </div>
      <p className="mt-2 text-center text-xs text-zinc-400">
        Example data. See real numbers here once you share your own course.
      </p>
    </>
  );
}
