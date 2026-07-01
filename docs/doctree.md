# docs/

Documentation index for the Moduvox project.

```
docs/
├── README.md                          # ← you are here
├── PRD.md                             # Product requirements (single source of truth)
│
├── architecture/                      # System-level architecture blueprints
│   ├── presentation-sharing.md        #   Shareable links, magic link auth, viewer tracking
│   └── voice-clone-backend.md         #   Voice cloning backend design (VoxCPM2, storage)
│
├── design/                            # Visual design references
│   ├── DESIGN.md                      #   Design system overview
│   ├── color-schema.md                #   Color palette specifications
│   └── stitch-prompts.md              #   Google Stitch design prompts
│
├── specs/                             # Pre-implementation feature specs (what to build)
│   ├── presentation-creation.md       #   Presentation creation flow (v2 — supersedes v1)
│   ├── presentation-creation-v1.md    #   Original presentation creation design
│   ├── presentation-create-page.md    #   Create page UI design
│   ├── slide-editor.md                #   Slide editor component design
│   ├── slide-editor-redesign.md       #   Slide editor redesign brief
│   ├── projects-system.md             #   Projects CRUD system design
│   ├── editor-persistence.md          #   Editor state persistence design
│   ├── reupload-detection.md          #   Re-upload slide diff detection
│   ├── smart-reupload.md              #   Smart re-upload modified slides
│   ├── gemini-narration.md            #   Gemini narration integration
│   ├── pptx-parsing.md                #   PPTX file parsing design
│   └── voice-delete-dialog.md         #   Voice delete confirmation dialog
│
├── plans/                             # Implementation plans (how to build it)
│   ├── presentation-creation.md       #   Presentation creation implementation
│   ├── presentation-create-page.md    #   Create page implementation
│   ├── pptx-parsing.md                #   PPTX parsing implementation
│   ├── slide-editor.md                #   Slide editor implementation
│   ├── projects-crud.md               #   Projects CRUD implementation
│   ├── settings-page.md               #   Settings page implementation
│   ├── editor-persistence.md          #   Editor persistence implementation
│   ├── reupload-detection.md          #   Re-upload detection implementation
│   ├── smart-reupload.md              #   Smart re-upload implementation
│   ├── gemini-narration.md            #   Gemini narration implementation
│   ├── voice-delete-dialog.md         #   Voice delete dialog implementation
│   ├── voices-feature.md              #   Full voices feature implementation
│   ├── voxcpm-integration.md          #   VoxCPM2 integration implementation
│   ├── features-page.md               #   Landing page features section
│   ├── merge-v0-landing.md            #   Merge v0 landing design
│   ├── pricing-page.md                #   Pricing page implementation
│   └── voice-simplify-flow.md         #   Voice creation flow simplification
│
├── audits/                            # Post-implementation quality checks
│   ├── gemini-narration-audit.md      #   Gemini narration error handling audit
│   ├── presentation-crud-audit.md     #   Presentation CRUD operations audit
│   └── presentation-qol-audit.md      #   Presentation QoL features audit
│
└── migrations/                        # SQL migration files (applied via Supabase dashboard)
    ├── 001-create-presentations-table.sql
    ├── 004_voices_table.sql
    ├── 005_drop_voices_clone_mode.sql
    ├── 006_add_preset_id.sql
    ├── 007_add_preview_audio_path.sql
    ├── 008_create_users_table.sql
    ├── 009_add_users_insert_policy.sql
    ├── 010_create_projects_table.sql
    ├── 011_create_presentations_table.sql
    ├── 012_create_presentation_files_bucket.sql
    ├── 013_add_control_instruction.sql
    ├── 014_add_editor_state.sql
    └── 015_add_gemini_api_key.sql
```

## How to Use

| If you want to... | Go to... |
|---|---|
| Understand the product requirements | `PRD.md` |
| See system architecture decisions | `architecture/` |
| Find the color palette or design system | `design/` |
| Read a feature spec before implementing | `specs/` |
| Follow a step-by-step build plan | `plans/` |
| Check quality after implementation | `audits/` |
| Find or apply a database migration | `migrations/` |

## Conventions

- **specs/** — design docs written *before* implementation. Answer "what to build."
- **plans/** — build orders written *alongside* implementation. Answer "how to build it."
- **audits/** — checklists and reviews written *after* implementation. Answer "is it right?"
- **architecture/** — cross-cutting system decisions. Rarely change.
- Migrations use sequential numbering. Apply in order via Supabase dashboard.
