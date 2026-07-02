"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Eye, Loader2 } from "lucide-react"

type Viewer = {
  id: string
  name: string
  email: string
  email_verified: boolean
  consent_granted: boolean
  status: "not_viewed" | "in_progress" | "completed"
  progress_pct: number
  time_spent_seconds: number
  viewed_at: string | null
  completed_at: string | null
  created_at: string
}

export function ViewerTable({
  presentationId,
}: {
  presentationId: string
}) {
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const consecutiveErrors = useRef(0)

  const fetchViewers = useCallback(async () => {
    try {
      const res = await fetch(`/api/presentations/${presentationId}/viewers`)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setViewers(json.data.viewers)
      setStale(false)
      consecutiveErrors.current = 0
    } catch {
      consecutiveErrors.current++
      setViewers((prev) => {
        if (prev.length > 0) {
          setStale(true)
        }
        return prev
      })
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    fetchViewers()
  }, [fetchViewers])

  // Auto-refresh every 30s, stop after 5 consecutive errors
  useEffect(() => {
    const interval = setInterval(() => {
      if (consecutiveErrors.current < 5) fetchViewers()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchViewers])

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}m ${sec}s`
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function handleExport() {
    window.open(`/api/presentations/${presentationId}/viewers/export`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (viewers.length === 0 && !loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col items-center gap-3 py-8">
          <Eye className="h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No viewers yet</p>
          <p className="text-xs text-zinc-400 text-center max-w-xs">
            Share your presentation link to start tracking viewers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
          <Eye className="h-4 w-4" />
          Viewers
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {viewers.length}
          </span>
          {stale && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Connection lost
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-[#18181B]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Progress</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Time</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {viewers.map((viewer) => (
              <tr key={viewer.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-5 py-3 font-medium text-[#18181B]">{viewer.name}</td>
                <td className="px-5 py-3 text-zinc-500">{viewer.email}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      viewer.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : viewer.status === "in_progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {viewer.status === "completed"
                      ? "Completed"
                      : viewer.status === "in_progress"
                        ? "In Progress"
                        : "Not Viewed"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-zinc-200">
                      <div
                        className="h-1.5 rounded-full bg-[#18181B]"
                        style={{ width: `${viewer.progress_pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{viewer.progress_pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-500">
                  {viewer.time_spent_seconds > 0 ? formatTime(viewer.time_spent_seconds) : "—"}
                </td>
                <td className="px-5 py-3 text-zinc-500 text-xs">
                  {formatDate(viewer.viewed_at || viewer.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
