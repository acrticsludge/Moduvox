---
name: tools
description: Graphify knowledge graph workflow, code review MCP tools, shadcn/ui + MagicUI + Playwright references, and AI collaboration patterns for multi-tool sync.
---

# Tools & Workflows

## Graphify (Knowledge Graph)

Graphify turns a folder of files into a navigable knowledge graph. Use at project start and after major structural changes.

### Installation

```bash
pip install graphifyy
```

If the `graphify` command isn't on PATH, use Python directly:
```bash
python -m graphify <command>
```

### Running on a Project

In Claude Code, type:
```
/graphify
```
or for a specific path:
```
/graphify c:\path\to\project
```

This runs:
1. **AST extraction** (deterministic, instant) — code structure, imports, calls
2. **Semantic extraction** (LLM, token cost) — docs, concepts, relationships across files
3. **Community detection** — Louvain algorithm groups related concepts
4. **Output generation** — `graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md`

### Windows Encoding Fix

If `UnicodeEncodeError: 'charmap' codec can't encode character` appears during report generation, ensure `encoding='utf-8'` is passed to `Path.write_text()` calls. Workaround: open `GRAPH_REPORT.md` in VS Code (it reads UTF-8 fine even if terminal errored).

### Git Hook (Auto-Rebuild)

```bash
python -m graphify hook install
```

Creates `.git/hooks/post-commit`:
- Code-only changes → rebuilds instantly (AST only, no LLM)
- Doc/image changes → flags for manual `--update`

### Reading the Outputs

| File | What it contains |
|------|-----------------|
| `GRAPH_REPORT.md` | God nodes (most-connected), communities, surprising connections, hyperedges |
| `graph.html` | Interactive visualization; color-coded by community |
| `graph.json` | Machine-readable; survives across sessions |

### Querying

```
/graphify query "What is the path from X to Y?"
/graphify query "Which files are most risky to change?"
/graphify explain "functionName"
/graphify path "source" "destination"
```

### Token Cost

- Full run on ~190 files: ~2 semantic subagents, moderate cost
- Subsequent runs with `--update`: only re-extracts changed files
- Code-only changes via git hook: zero LLM cost (AST only)

### .gitignore

Always add `/graphify-out` to `.gitignore` — it's a generated artifact.

---

## Code Review Graph (MCP)

Graphify is the primary tool for codebase exploration and code review. Use it before Grep/Glob/Read for understanding code structure.

### MCP Tool Reference

| Tool | When to use |
|------|------------|
| `semantic_search_nodes` | Find functions/classes by name or keyword — replaces Grep for code symbols |
| `query_graph` | Trace callers, callees, imports, tests, dependencies |
| `get_impact_radius` | Understand blast radius before making a change |
| `detect_changes` | Review staged/recent changes with risk scoring |
| `get_review_context` | Get source snippets for a change — token-efficient alternative to reading files |
| `get_affected_flows` | Find which execution paths a change touches |
| `get_architecture_overview` | High-level codebase structure — start here when new to a project |
| `list_communities` | See all detected module clusters |
| `refactor_tool` | Plan renames, find dead code, identify safe extraction points |

### Query Patterns

```
# Find all callers of a function
query_graph pattern="callers_of" node="fetchGitHubUsage"

# Trace imports
query_graph pattern="imports_of" node="worker/services/github.ts"

# Find tests for a module
query_graph pattern="tests_for" node="lib/encryption.ts"
```

### Workflow

1. **Start a session** → `get_architecture_overview` + `list_communities`
2. **Explore a feature** → `semantic_search_nodes` to find relevant nodes
3. **Before changing code** → `get_impact_radius` to understand what breaks
4. **After making a change** → `detect_changes` + `get_affected_flows`
5. **Code review** → `get_review_context` for token-efficient diff reading
6. **Check test coverage** → `query_graph pattern="tests_for"`

### Fallback to File Tools

Use Grep/Glob/Read only when:
- Looking for a very specific string not captured as a graph node
- The graph hasn't been built yet
- The file is config/data (JSON, env, schema SQL)

---

## Frontend Development Tools

### shadcn/ui

Copy-paste component library built on Radix UI + Tailwind CSS. Not a package — components are copied directly into `components/ui/` and fully customizable.

**MCP integration:** Configured in `.opencode/mcp.jsonc` as `shadcn` — can add components via the `shadcn@latest mcp` command.

```bash
npx shadcn@latest add button card dialog
```

**Key usage rules:**
- Components live in `components/ui/` — modify them freely, they're yours
- Init first: `npx shadcn@latest init`
- Always add via CLI, never copy-paste from docs (ensures proper setup)
- Uses Radix UI primitives under the hood — accessible by default

### MagicUI

Animated React component collection for landing pages, dashboards, and marketing sites. Designed to work alongside shadcn/ui.

**MCP integration:** Configured in `.opencode/mcp.jsonc` as `magicui` — browse and add components via `@magicuidesign/mcp`.

**Key usage rules:**
- Components are animated and decorative — use sparingly, don't overload pages
- Best for: hero sections, feature showcases, pricing sections
- Style with Tailwind to match your design system

### Playwright

Browser testing and automation framework for end-to-end testing.

**MCP integration:** Configured in `.opencode/mcp.jsonc` as `playwright` — currently disabled by default (spins up real browser). Enable only when actively writing or debugging tests.

```bash
npx playwright test
```

**Key usage rules:**
- Write tests in `e2e/` or `tests/` directory
- Use `page.locator()` over `page.$()` for resilience
- Prefer `data-testid` attributes for selectors over CSS classes
- Run with `--ui` flag for interactive debugging in development
- **MCP server note:** The Playwright MCP (`@playwright/mcp`) is for AI-driven browser automation, distinct from the test runner. Use it when the AI needs to interact with a live page.

---

## AI Collaboration

### The Problem

Different AI tools read different config files. Claude Code reads `CLAUDE.md`. Cursor reads `.cursorrules`. Windsurf reads `.windsurfrules`. Gemini reads `GEMINI.md`. If these drift, some tools have outdated context.

### The Solution: Keep All Files in Sync

| File | Tool |
|------|------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Claude agent/agentic mode |
| `.cursorrules` | Cursor |
| `.windsurfrules` | Windsurf |
| `GEMINI.md` | Gemini |

**When you update CLAUDE.md, update all the others.** Keep content identical across files except for tool-specific sections (e.g., MCP tools block which is Claude-specific).

### Post-Commit Sync

After every commit, ask: does any AI config file need updating?

| Change made | What to update |
|-------------|----------------|
| New route, page, or API endpoint | Project Structure section |
| New table or column in Supabase | Database Schema section |
| New feature or significant behavior change | Core Features section |
| New dependency added | Stack section |
| New rule established | Key Rules section |
| New pricing tier or limit change | Pricing Tiers section |
| New environment variable needed | worker-env-template.md (in /me) |
| New folder or file structure pattern | project-structure.md (in /me) |

### What triggers a sync

1. After committing, read the diff (`git diff HEAD~1 HEAD`)
2. Cross-reference against the trigger table
3. Update CLAUDE.md first, then copy into `.cursorrules`, `.windsurfrules`, `GEMINI.md`, `AGENTS.md`
4. Commit the config update in the same session — don't let it drift

### Workflow Recommendation

| Task | Best Tool |
|------|----------|
| Architecture exploration, impact analysis | Claude Code (graph-aware) |
| Fast inline editing, autocomplete | Cursor or Windsurf |
| Code review, large refactors | Claude Code (agent mode) |
| Explaining code to a team | Any — Gemini is good for this |
| Generating tests | Claude Code or Cursor |
