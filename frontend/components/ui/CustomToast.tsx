import toast from "react-hot-toast"

type ToastVariant = "success" | "error"

interface CustomToastProps {
  message: string
  variant: ToastVariant
  id?: string
  visible?: boolean
}

function CustomToast({ message, variant, id }: CustomToastProps) {
  const isError = variant === "error"

  return (
    <div
      className={`
        flex items-start gap-3 rounded-xl border p-4 pr-12 shadow-lg backdrop-blur-sm
        ${isError
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-green-300 bg-green-50 text-green-800"
        }
      `}
      role="alert"
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0">
        {isError ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        )}
      </span>

      {/* Message */}
      <p className="text-sm font-medium leading-5">{message}</p>

      {/* Dismiss */}
      {id && (
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className={`absolute right-3 top-3 rounded-md p-1 transition-colors ${
            isError ? "hover:bg-red-100" : "hover:bg-green-100"
          }`}
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Wrapper API ────────────────────────────────────────────

type ToastOptions = { id?: string; duration?: number }

export function toastSuccess(message: string, opts?: ToastOptions) {
  if (opts?.id) toast.dismiss(opts.id)
  toast.custom(
    (t) => <CustomToast message={message} variant="success" id={t.id} visible={t.visible} />,
    { duration: opts?.duration ?? 4000, position: "top-center", id: opts?.id },
  )
}

export function toastError(message: string, opts?: ToastOptions) {
  if (opts?.id) toast.dismiss(opts.id)
  toast.custom(
    (t) => <CustomToast message={message} variant="error" id={t.id} visible={t.visible} />,
    { duration: opts?.duration ?? 5000, position: "top-center", id: opts?.id },
  )
}
