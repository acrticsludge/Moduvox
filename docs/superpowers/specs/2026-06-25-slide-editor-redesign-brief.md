# Slide Editor Redesign — Brief

> **Quick spec — agents will confer on final layout.**

## Problems
1. Slides show "Slide N" placeholder text — need realistic sample slide content (titles, bullet points, colored headers)
2. Layout is generic vertical stack — needs better visual hierarchy
3. Preview could be bigger

## Constraints
- Keep the sidebar (CreatePageSidebar) unchanged
- Keep Narration textarea, Generate button, Audio player functionality
- Use Tailwind v4 + shadcn components
- Match existing design language (charcoal `#18181B`, muted steel `#71717A`, zinc borders)

## Flow
1. Agent 1 proposes a new layout + slide content design
2. Agent 2 reviews, critiques, suggests refinements  
3. Consensus is reached
4. Implementation follows

## What to redesign
- **Mock slides:** Each slide should have: colored accent bar at top, a title, 3-4 bullet points, realistic content (sample training content since this is for corporate training)
- **Layout:** Larger preview area, better use of horizontal space, less generic centering
- **Navigation:** Arrows at bottom or side of preview
