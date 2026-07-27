# Remotion Demo Video Design Spec

## Overview

A 60-90 second product demo video built with Remotion that showcases the complete Moduvox workflow from landing page to share link. The video mimics the actual website 1:1 using React components that replicate the real UI with exact colors, fonts, spacing, and interactions.

## Video Flow (Scenes)

### Scene 1: Home Page Hero (5s)
- **Visual:** Full landing page with Navbar, Hero section, feature sections, footer
- **Animation:** Smooth scroll down through all sections
- **Text overlay:** None - let the UI speak
- **Transition:** Click "Start free" CTA button → fade to Scene 2

### Scene 2: Signup Flow (4s)
- **Visual:** Signup page with form fields
- **Animation:** Type name, email, password → click "Create account"
- **Transition:** Success state → redirect to dashboard

### Scene 3: Dashboard - Projects (5s)
- **Visual:** Dashboard layout with sidebar, project grid
- **Animation:** Show empty state → "Create your first project" → modal appears
- **Transition:** Click project card → navigate to project detail

### Scene 4: Create Project Modal (3s)
- **Visual:** Modal with name, description, color picker, icon picker
- **Animation:** Fill in "Q4 Training" → select blue color → click Create
- **Transition:** Project created → show in grid

### Scene 5: Project Detail (3s)
- **Visual:** Project page with breadcrumb, presentation grid
- **Animation:** Show empty state → "Create your first presentation" → modal
- **Transition:** Click "Create" → navigate to editor

### Scene 6: Presentation Editor - Upload (6s)
- **Visual:** Three-panel editor layout
- **Animation:** Drag & drop PPTX file → upload progress → PDF conversion
- **Transition:** Slides appear → narration auto-generates

### Scene 7: Voice Selection (4s)
- **Visual:** Left sidebar with voice selector
- **Animation:** Open dropdown → select "Professional Tone" preset → preview plays
- **Transition:** Voice selected → narration regenerates

### Scene 8: Slide Editor - Center Panel (5s)
- **Visual:** PDF slide viewer with navigation
- **Animation:** Click through slides 1→2→3→4 → edit narration text
- **Transition:** Narration saved → audio generation ready

### Scene 9: Audio Generation (5s)
- **Visual:** Right panel with "Generate Audio" button
- **Animation:** Click button → RegenerateModal opens → progress bar fills → success
- **Transition:** Audio generated → player appears

### Scene 10: Audio Preview (4s)
- **Visual:** AudioPlayer component
- **Animation:** Click play → progress bar moves → time updates
- **Transition:** Preview complete → share button

### Scene 11: Share Settings (5s)
- **Visual:** SharePresentationModal
- **Animation:** Show share link → toggle email gate → copy link
- **Transition:** Link copied → open in new tab

### Scene 12: Viewer - Gate Dialog (5s)
- **Visual:** CombinedGateDialog on viewer page
- **Animation:** Enter name, email → click "Send Verification Link"
- **Transition:** Email sent screen

### Scene 13: Viewer - Email Verification (3s)
- **Visual:** EmailSentScreen with green checkmark
- **Animation:** Show "Check your inbox" → transition to verified
- **Transition:** Verified → viewer loads

### Scene 14: Viewer - Presentation Player (8s)
- **Visual:** Full viewer with sidebar, slide, audio bar
- **Animation:** Auto-advance slides with audio → show progress tracking
- **Transition:** Video ends with Moduvox logo

## Technical Architecture

### Project Structure
```
remotion-demo/
├── src/
│   ├── Root.tsx                    # Main composition
│   ├── Video.tsx                   # Sequence orchestrator
│   ├── scenes/
│   │   ├── HomePage.tsx            # Scene 1
│   │   ├── SignupFlow.tsx          # Scene 2
│   │   ├── Dashboard.tsx           # Scene 3
│   │   ├── CreateProject.tsx       # Scene 4
│   │   ├── ProjectDetail.tsx       # Scene 5
│   │   ├── UploadPptx.tsx          # Scene 6
│   │   ├── VoiceSelection.tsx      # Scene 7
│   │   ├── SlideEditor.tsx         # Scene 8
│   │   ├── AudioGeneration.tsx     # Scene 9
│   │   ├── AudioPreview.tsx        # Scene 10
│   │   ├── ShareSettings.tsx       # Scene 11
│   │   ├── ViewerGate.tsx          # Scene 12
│   │   ├── ViewerVerification.tsx  # Scene 13
│   │   └── ViewerPlayer.tsx        # Scene 14
│   ├── components/
│   │   ├── Navbar.tsx              # Exact replica
│   │   ├── Sidebar.tsx             # Dashboard sidebar
│   │   ├── SlideViewer.tsx         # PDF slide viewer
│   │   ├── AudioPlayer.tsx         # Audio player
│   │   ├── Modal.tsx               # Reusable modal
│   │   └── Button.tsx              # CTA buttons
│   ├── styles/
│   │   └── theme.ts                # Design tokens
│   └── lib/
│       └── animations.ts           # Transition helpers
├── public/
│   └── assets/                     # Mockup images, icons
├── package.json
├── remotion.config.ts
└── tsconfig.json
```

### Design Tokens (Exact Match)
```typescript
export const theme = {
  colors: {
    canvas: '#F9FAFB',
    surface: '#FFFFFF',
    charcoal: '#18181B',
    charcoalHover: '#27272A',
    mutedSteel: '#71717A',
    sectionAlt: '#F3F4F6',
    borderFaint: 'rgba(226, 232, 240, 0.6)',
    zinc100: '#F4F4F5',
    zinc200: '#E4E4E7',
    zinc300: '#D4D4D8',
    zinc400: '#A1A1AA',
    zinc500: '#71717A',
    red500: '#EF4444',
    green500: '#22C55E',
    blue500: '#3B82F6',
    amber100: '#FEF3C7',
    amber700: '#B45309',
  },
  fonts: {
    sans: 'Geist, system-ui, sans-serif',
    mono: 'Geist Mono, monospace',
  },
  spacing: {
    navbarHeight: '64px',
    sidebarWidth: '224px',
    editorSidebarWidth: '320px',
    editorRightPanelWidth: '380px',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
  },
  animation: {
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    duration200: '200ms',
    duration300: '300ms',
  },
};
```

### Animation Strategy

1. **Page Transitions:** Fade + slight scale (0.95→1) over 300ms
2. **Element Appearances:** Slide up + fade in over 250ms with spring curve
3. **Click Interactions:** Scale down to 0.98 on click, spring back
4. **Loading States:** Pulse animation on skeleton elements
5. **Progress Bars:** Smooth width transition over 500ms
6. **Typing Effect:** Character-by-character with 50ms delay

### Mockup Data

```typescript
export const mockData = {
  project: {
    name: 'Q4 Training',
    description: 'Quarterly compliance training',
    color: '#3B82F6',
    icon: 'FolderKanban',
  },
  presentation: {
    title: 'Phishing Prevention',
    slideCount: 12,
    status: 'ready',
  },
  slides: [
    { number: 1, title: 'Phishing Prevention', bullets: ['What is phishing?', 'Common tactics', 'How to protect yourself'] },
    { number: 2, title: 'What is Phishing?', bullets: ['Social engineering attack', 'Impersonates trusted entities', 'Goal: steal credentials'] },
    { number: 3, title: 'Common Tactics', bullets: ['Urgent language', 'Fake login pages', 'Suspicious attachments'] },
    { number: 4, title: 'How to Protect', bullets: ['Verify sender address', 'Don\'t click suspicious links', 'Report to IT'] },
  ],
  narration: [
    'Welcome to our phishing prevention training. Today we\'ll cover how to identify and avoid phishing attacks.',
    'Phishing is a social engineering attack where criminals impersonate trusted entities to steal your credentials.',
    'Common tactics include urgent language, fake login pages, and suspicious attachments designed to trick you.',
    'To protect yourself, always verify the sender address, don\'t click suspicious links, and report anything unusual to IT.',
  ],
  viewer: {
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    completion: 100,
    timeSpent: '12:04',
  },
};
```

## Success Criteria

1. **Visual Fidelity:** Each scene matches the actual website within 5px accuracy
2. **Smooth Transitions:** All transitions use spring curves, no jarring cuts
3. **Complete Flow:** Video covers entire user journey from home to viewer
4. **Performance:** Renders at 30fps, total duration 60-90 seconds
5. **Export Quality:** 1080p (1920x1080) MP4 output

## Dependencies

- `remotion` - Video framework
- `@remotion/cli` - CLI tools
- `@remotion/player` - Player component
- `@remotion/transitions` - Transition effects
- `@remotion/motion-blur` - Motion blur effects
- `react` - UI rendering
- `typescript` - Type safety
- `tailwindcss` - Styling (optional, can use inline styles)

## Implementation Order

1. Set up Remotion project with TypeScript
2. Create design token theme file
3. Build reusable components (Navbar, Sidebar, Modal, Button)
4. Implement Scene 1-3 (Home, Signup, Dashboard)
5. Implement Scene 4-6 (Create Project, Project Detail, Upload)
6. Implement Scene 7-9 (Voice, Editor, Audio Generation)
7. Implement Scene 10-12 (Preview, Share, Gate)
8. Implement Scene 13-14 (Verification, Player)
9. Wire up transitions and animations
10. Add mockup data and polish
11. Test render and export
