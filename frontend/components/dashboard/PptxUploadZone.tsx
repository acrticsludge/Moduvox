"use client"

import { useRef, useState } from "react"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function PptxUploadZone({ onFileAccepted }: { onFileAccepted?: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB

  function validateAndSet(f: File) {
    setError("")
    if (!f.name.endsWith(".pptx")) {
      setError("Please select a .pptx file")
      return
    }
    if (f.size > MAX_SIZE) {
      setError("File exceeds 50MB limit")
      return
    }
    setFile(f)
    onFileAccepted?.(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) validateAndSet(dropped)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) validateAndSet(selected)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function clearFile() {
    setFile(null)
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full max-w-lg cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
            dragging
              ? "border-[#18181B] bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50",
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <Upload className="h-6 w-6 text-[#71717A]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#18181B]">
              Drop your PPTX here or click to browse
            </p>
            <p className="mt-1 text-xs text-[#71717A]">
              .pptx files up to 50MB · maximum 30 slides
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pptx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex w-full max-w-lg items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
            <FileText className="h-5 w-5 text-[#71717A]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#18181B]">{file.name}</p>
            <p className="text-xs text-[#71717A]">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-zinc-100 hover:text-[#18181B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="absolute bottom-8 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
