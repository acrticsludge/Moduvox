# Presentation Create Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Replace the blank presentation detail page with a sidebar+main layout featuring voice selector, control instructions, ultimate clone toggle, and PPTX upload zone.

**Architecture:** Install shadcn UI components (Select, Switch, Textarea, Label), create two new app components (`CreatePageSidebar`, `PptxUploadZone`), and rewrite the presentation detail page to use them. The sidebar fetches saved voices from Supabase. The upload zone does client-side validation only.

**Tech Stack:** Next.js 16, Supabase, shadcn/ui (Radix + Tailwind v4), Tailwind v4, Lucide icons

**Spec:** `docs/superpowers/specs/2026-06-25-presentation-create-page-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | **Modify** | Add shadcn/Radix deps |
| `app/globals.css` | **Modify** | Add shadcn CSS variables + animate plugin |
| `components/ui/select.tsx` | **Create** | shadcn Select component |
| `components/ui/switch.tsx` | **Create** | shadcn Switch component |
| `components/ui/label.tsx` | **Create** | shadcn Label component |
| `components/ui/textarea.tsx` | **Create** | shadcn Textarea component |
| `components/ui/button.tsx` | **Create** | shadcn Button component (needed by Select) |
| `components/dashboard/CreatePageSidebar.tsx` | **Create** | Sidebar with voice selector + controls |
| `components/dashboard/PptxUploadZone.tsx` | **Create** | Drag-and-drop PPTX upload zone |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | **Modify** | Wire up sidebar + upload zone layout |

---

### Task 1: Install shadcn dependencies

- [ ] **Step 1: Install npm packages**

Run from `frontend/`:
```bash
npm install @radix-ui/react-select@latest @radix-ui/react-switch@latest @radix-ui/react-label@latest @radix-ui/react-slot@latest class-variance-authority@latest tailwindcss-animate@latest
```

Expected: All packages install without errors.

- [ ] **Step 2: Create components.json**

Create `frontend/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 3: Update globals.css with shadcn variables**

Edit `frontend/app/globals.css` to add the `@plugin "tailwindcss-animate"`, shadcn CSS variables, and `@custom-variant dark`:

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-canvas: #f9fafb;
  --color-surface: #ffffff;
  --color-charcoal: #18181b;
  --color-muted-steel: #71717a;
  --color-section-alt: #f3f4f6;
  --color-border-faint: rgba(226, 232, 240, 0.6);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* shadcn variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius: 0.625rem;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.965 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.87 0 0);
}

body {
  background: var(--color-canvas);
  color: var(--color-charcoal);
  font-family: var(--font-sans);
}
```

- [ ] **Step 4: Verify CSS compiles**

Run: `cd frontend && npx next build 2>&1 | Select-String -Pattern "error|Error"`  
Expected: No CSS-related errors

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components.json frontend/app/globals.css
git commit -m "chore: install shadcn/ui dependencies and CSS setup"
```

---

### Task 2: Create shadcn UI primitives

- [ ] **Step 1: Create Button component**

Create `frontend/components/ui/button.tsx`:
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Create Select component**

Create `frontend/components/ui/select.tsx`:
```tsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
```

- [ ] **Step 3: Create Switch component**

Create `frontend/components/ui/switch.tsx`:
```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

- [ ] **Step 4: Create Label component**

Create `frontend/components/ui/label.tsx`:
```tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **Step 5: Create Textarea component**

Create `frontend/components/ui/textarea.tsx`:
```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/components/ui/
git commit -m "feat: add shadcn UI primitives (Select, Switch, Label, Textarea, Button)"
```

---

### Task 3: Create CreatePageSidebar component

- [ ] **Step 1: Create the sidebar component**

Create `frontend/components/dashboard/CreatePageSidebar.tsx`:
```tsx
"use client"

import { useEffect, useState } from "react"
import { Mic, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type Voice = {
  id: string
  name: string
  type: "preset" | "cloned"
  preset_id: string | null
}

export function CreatePageSidebar() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [controlInstructions, setControlInstructions] = useState("")
  const [ultimateMode, setUltimateMode] = useState(false)

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId)
  const isCloned = selectedVoice?.type === "cloned"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("voices")
        .select("id, name, type, preset_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setVoices(data as Voice[])
        })
    })
  }, [])

  const presetVoices = voices.filter((v) => v.type === "preset")
  const clonedVoices = voices.filter((v) => v.type === "cloned")

  // Reset ultimate mode when switching to a preset voice
  function handleVoiceChange(value: string) {
    setSelectedVoiceId(value)
    const voice = voices.find((v) => v.id === value)
    if (voice?.type === "preset") {
      setUltimateMode(false)
    }
  }

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col gap-6 border-r border-[var(--color-border-faint)] bg-white p-5">
      {/* Voice selector */}
      <div className="space-y-2">
        <Label htmlFor="voice-select" className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
          <Mic className="h-4 w-4" />
          Voice
        </Label>
        <Select value={selectedVoiceId} onValueChange={handleVoiceChange}>
          <SelectTrigger id="voice-select" className="w-full">
            <SelectValue placeholder="Select a voice..." />
          </SelectTrigger>
          <SelectContent>
            {voices.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-[#71717A]">
                No voices yet.{" "}
                <a href="/dashboard/voices" className="underline hover:text-[#18181B]">
                  Create one
                </a>
              </div>
            )}
            {presetVoices.length > 0 && (
              <SelectGroup>
                <SelectLabel>Preset Voices</SelectLabel>
                {presetVoices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {clonedVoices.length > 0 && (
              <SelectGroup>
                <SelectLabel>Cloned Voices</SelectLabel>
                {clonedVoices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Control instructions */}
      <div className="space-y-2">
        <Label htmlFor="control-instructions" className="text-sm font-semibold text-[#18181B]">
          Control Instructions
        </Label>
        <Textarea
          id="control-instructions"
          placeholder={
            isCloned
              ? "Describe the tone and delivery..."
              : "Describe the voice you want to create..."
          }
          value={controlInstructions}
          onChange={(e) => setControlInstructions(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-[#71717A]">
          {isCloned
            ? "Guidance for how the cloned voice should deliver the narration."
            : "Describe the voice style (e.g. 'A calm, professional male voice')."}
        </p>
      </div>

      {/* Ultimate clone toggle */}
      {isCloned && (
        <div className="space-y-3 rounded-lg border border-[var(--color-border-faint)] p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ultimate-mode" className="text-sm font-semibold text-[#18181B]">
              Ultimate Clone
            </Label>
            <Switch
              id="ultimate-mode"
              checked={ultimateMode}
              onCheckedChange={setUltimateMode}
            />
          </div>
          <div className="flex gap-2 text-xs text-[#71717A]">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <p>
              Preserves every nuance of the reference voice.
              Control instructions are ignored when this mode is active.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/CreatePageSidebar.tsx
git commit -m "feat: add CreatePageSidebar with voice selector and controls"
```

---

### Task 4: Create PptxUploadZone component

- [ ] **Step 1: Create the upload zone component**

Create `frontend/components/dashboard/PptxUploadZone.tsx`:
```tsx
"use client"

import { useRef, useState } from "react"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function PptxUploadZone() {
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
              : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
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
              .pptx files up to 50MB
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/PptxUploadZone.tsx
git commit -m "feat: add PptxUploadZone with drag-and-drop and validation"
```

---

### Task 5: Rewrite presentation detail page

- [ ] **Step 1: Rewrite the page**

Edit `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`:

Replace the entire content with:
```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, Presentation } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function PresentationCreatePage() {
  const params = useParams<{ id: string; presentationId: string }>()
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("presentations")
      .select("*")
      .eq("id", params.presentationId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError("Failed to load presentation")
        } else {
          setPresentation(data as PresentationType | null)
        }
        setLoading(false)
      })
  }, [params.presentationId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!presentation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-[#71717A]">Presentation not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
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
          <a
            href={`/dashboard/projects/${presentation.project_id}`}
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Project
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{presentation.title}</span>
        </div>
      </div>

      {/* Sidebar + Main */}
      <div className="flex flex-1">
        <CreatePageSidebar />
        <PptxUploadZone />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx"
git commit -m "feat: rewrite presentation create page with sidebar and upload zone"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Sidebar with voice selector ✅ (Task 3)
   - Control instructions textarea ✅ (Task 3)
   - Ultimate clone toggle ✅ (Task 3)
   - PPTX upload zone ✅ (Task 4)
   - shadcn components installed ✅ (Task 1, 2)
   - Layout wired up ✅ (Task 5)

2. **Placeholder scan:** No TBDs, TODOs, or placeholder code. Every file has complete, runnable code.

3. **Type consistency:** `Voice` type used in Task 3 matches the DB schema. `PresentationType` imported in Task 5 matches the validation schema from `lib/validations/presentation.ts`. All component imports are consistent.
