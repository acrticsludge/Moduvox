---
name: readme
description: Regenerate the project README.md with current project context, stack, and features.
---

# Readme Command

Regenerate `README.md` at the project root with up-to-date project context.

## Steps

1. **Gather context**: read `package.json` (name, description, scripts, deps), `CLAUDE.md` (stack, features, tier structure), and verify any major routes/pages that exist in `app/`

2. **Generate README.md** with this structure:

   ```markdown
   # <Project Name>

   <One-liner: what the product does and who it's for>

   ## Stack

   - **Framework:** Next.js (App Router)
   - **Language:** TypeScript (strict)
   - **Database + Auth:** Supabase (Postgres, RLS)
   - **Hosting:** Vercel (frontend), Railway (worker)
   - **Payments:** Dodo Payments
   - **Email:** Resend
   - **UI:** Tailwind CSS, Radix UI, shadcn/ui
   - **Tooling:** Biome, graphify (knowledge graph)

   ## Getting Started

   ```bash
   npm install
   npm run dev
   ```

   ## Project Structure

   ```
   app/          — Next.js App Router (pages + API routes)
   worker/       — Background polling worker
   lib/          — Shared utilities (encryption, auth, tiers)
   .opencode/    — AI agent configuration and skills
   ```

   ## Environment

   Copy `.env.example` to `.env.local` and fill in the required variables.
   See `worker/.env` for worker-specific config.

   ## Deployment

   - Frontend: Vercel (connected via GitHub)
   - Worker: Railway (separate Node.js process)

   ## License

   [License type]
   ```

3. **Overwrite** `README.md` with the generated content

4. **Verify**: read the file back and confirm it's valid markdown

## When to Run

- After adding/removing major features
- After changing the stack or dependencies
- Before opening a PR
- After changing the project structure
- On user request via `/readme`

## Principles

- Keep it concise — one page max
- Don't duplicate what's already in CLAUDE.md (that's for AI, not humans)
- Focus on what a new developer or user needs to know
- Link to docs where relevant, don't inline everything
