import { z } from "zod"

export const COLOR_PALETTE = [
  "#FFFDE7",
  "#E8F0FE",
  "#E8F5E9",
  "#FCE4EC",
  "#F3E5F5",
  "#FFF3E0",
  "#E0F2F1",
  "#F5F5F5",
] as const

export const ICON_SET = [
  "FolderKanban",
  "BookOpen",
  "GraduationCap",
  "Shield",
  "FileText",
  "Presentation",
  "Notebook",
  "ClipboardList",
] as const

export type ProjectColor = (typeof COLOR_PALETTE)[number]
export type ProjectIcon = (typeof ICON_SET)[number]

export type Project = {
  id: string
  user_id: string
  name: string
  description: string
  color: ProjectColor
  icon: ProjectIcon
  created_at: string
  updated_at: string
}

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .default(""),
  color: z.enum(COLOR_PALETTE).optional(),
  icon: z.enum(ICON_SET).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()
