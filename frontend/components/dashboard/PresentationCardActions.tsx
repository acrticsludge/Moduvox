"use client"

import { useState, useRef, useEffect } from "react"
import { MoreVertical, Pencil, Archive, RotateCcw, Trash2 } from "lucide-react"
import type { Presentation } from "@/lib/validations/presentation"

export function PresentationCardActions({
  presentation,
  onRename,
  onArchive,
  onRestore,
  onDelete,
}: {
  presentation: Presentation
  onRename: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const isArchived = presentation.status === "archived"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] max-md:opacity-100 md:opacity-0 transition-all md:group-hover:opacity-100 hover:bg-zinc-100 hover:text-[#18181B]"
        aria-label="Presentation actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed z-50 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          style={{
            // Position below the button, aligned right
            top: ref.current?.getBoundingClientRect().bottom ?? 0,
            left: Math.max(8, (ref.current?.getBoundingClientRect().right ?? 0) - 176),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename */}
          <button
            type="button"
            onClick={() => { setOpen(false); onRename() }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#18181B] transition-colors hover:bg-zinc-50"
          >
            <Pencil className="h-4 w-4 text-[#71717A]" />
            Rename
          </button>

          {/* Archive / Restore */}
          {isArchived ? (
            <button
              type="button"
              onClick={() => { setOpen(false); onRestore?.() }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#18181B] transition-colors hover:bg-zinc-50"
            >
              <RotateCcw className="h-4 w-4 text-[#71717A]" />
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setOpen(false); onArchive?.() }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#18181B] transition-colors hover:bg-zinc-50"
            >
              <Archive className="h-4 w-4 text-[#71717A]" />
              Archive
            </button>
          )}

          <hr className="my-1 border-zinc-100" />

          {/* Delete */}
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
