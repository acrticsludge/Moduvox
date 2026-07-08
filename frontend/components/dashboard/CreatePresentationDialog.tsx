"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2 } from "lucide-react"
import { WaitlistDialog } from "@/components/dashboard/WaitlistDialog"
import type { QuotaResult } from "@/lib/quota"

export function CreatePresentationDialog({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [quotaResult, setQuotaResult] = useState<QuotaResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), project_id: projectId }),
      })
      const json = await res.json()
      if (res.status === 429 && json.limitKey) {
        setQuotaResult({
          allowed: false,
          limit: json.limit,
          current: json.current,
          limitKey: json.limitKey,
          message: json.error,
        })
        setSaving(false)
        return
      }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong")
        return
      }
      router.push(`/dashboard/projects/${projectId}/presentations/${json.data.id}`)
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#18181B]">New Presentation</h2>
            <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#18181B]">Presentation name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Security Training Q3"
                maxLength={200}
                required
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </div>
      </div>

      {quotaResult && (
        <WaitlistDialog
          quota={quotaResult}
          onClose={() => setQuotaResult(null)}
        />
      )}
    </>
  )
}
