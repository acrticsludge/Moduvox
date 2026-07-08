# Aggregated Audit Findings — UI Improvements v2

## CRITICAL (Must Fix)

### Error Boundaries & Loading
1. No `global-error.tsx` at root — root layout errors show blank/Next.js overlay
2. No root `app/error.tsx` — routes without error boundaries (login, signup, about, features, pricing, privacy, terms, feedback, view) show Next.js default
3. No `loading.tsx` anywhere — every route transition has zero Suspense fallback
4. All 3 existing `error.tsx` files are identical copies with non-actionable messages ("An unexpected error occurred")
5. Settings, archived, view, feedback, and all public pages have NO error boundary
6. No unhandled promise rejection handler anywhere
7. No fetch timeouts anywhere — requests can hang indefinitely

### Mobile & Touch
8. **Touch targets consistently <48px**: hamburger 36px, action buttons 28-36px, audio controls 28-36px, voice actions 28px, close buttons 32px — across ALL pages
9. **Hover-only `opacity-0` actions**: ProjectCardActions menu invisible on mobile (no hover)
10. **Presentation editor has NO mobile layout**: right panel `hidden lg:flex` — narration editing, audio generation, slide info inaccessible on mobile
11. **View sidebar hidden on mobile**: `hidden md:flex` — all presentation info inaccessible on mobile
12. **Volume slider hover-only**: completely inaccessible on touch devices
13. Base font 14px (`text-sm`) across all pages — causes iOS zoom on input focus

### Security
14. **Gemini API key stored unencrypted** in DB — violates AES-256 encryption rule
15. **No rate limiting on auth endpoints** (login, signup, magic link)
16. **`state/route.ts` has NO Zod validation** — entire request body stored as JSON blob (arbitrary data injection)
17. **No `noindex` on private pages**: dashboard routes and view pages indexable by search engines
18. **File upload MIME validation uses `f.name.endsWith(".pptx")`** — trivially bypassable
19. **Auth callback open redirect check doesn't catch `//evil.com`** — protocol-relative URLs

### UX & Onboarding
20. **Post-login/signup goes to `/`** instead of `/dashboard`
21. **Signup has no confirmation message** — user redirected to landing page without knowing if email confirmation is needed
22. **Dashboard has no auth guard** — unauthenticated users see UI before data fails to load
23. **404 page is a dead-end** — no navigation back, no branding, no search, no CTA

## HIGH (Should Fix In Scope)

### SEO & Metadata
24. **All pages share root title** "Moduvox - Your slides. Your voice. No recording." — no unique metadata per page
25. Features and Pricing pages have **NO `<h1>`** — only `<h2>` as main heading
26. **No canonical URL, no structured data (JSON-LD), no Open Graph tags** anywhere
27. **No OG image**, no `opengraph-image.*`, no `twitter-image.*`
28. **No robots.txt, no sitemap.xml, no favicon.ico** — `public/` directory empty

### Error Messages
29. **Login/signup show raw Supabase errors** — technical text exposed to users
30. **No field-level form validation errors** — only generic error messages on forms
31. **Multiple silent catch blocks**: CreatePageSidebar voice preview, SlideEditor XHR upload, presentation editor changedSlides persistence

### Performance
32. **Zero dynamic imports** — all modals, dialogs, heavy components (SlideEditor 1278 lines, Howler audio player) eagerly imported everywhere
33. **FeaturesSection and PricingSection are `"use client"`** unnecessarily — only for user auth state
34. No `next/image` usage

### API Design
35. Missing 403/404 status codes — resource ownership violations return 500 instead
36. `PUT /api/user/gemini-key` has no Zod validation — only `typeof` check
37. Settings Gemini key/profile fetches have no error handling — infinite loading on failure
38. Voices fetch failure silently swallowed — shows empty state when API errors
39. ProjectCard presentation count has no `.catch()` — unhandled promise rejection

### Mobile (Additional)
40. EditorMockup fixed `w-[500px]` may cause horizontal scroll on small screens
41. ViewAudioBar buttons all below 48x48px
42. Consent checkbox 16x16px in gate dialog
43. Drawer mobile links ~36px touch target

## MEDIUM (Nice to Fix)

44. Sidebar links `py-2.5` — undersized touch targets
45. Auth callback redirect default is `"/"` not `"/dashboard"`
46. No `autoComplete` or `inputMode` attributes on login/signup forms
47. Coming Soon blur on pricing cards — text fails WCAG contrast
48. "here" used as link text on privacy/terms pages — accessibility violation
49. No structured error monitoring (Sentry, LogFlare, etc.)
50. No `middleware.ts` with matcher
51. Duplicate reCAPTCHA script loading logic in CombinedGateDialog and EmailSentScreen
52. Copy link in ViewSidebar has no error handling
53. Resend reCAPTCHA can fail silently if script hasn't loaded
54. Session token briefly stored in localStorage before validation
55. Settings tabs may overflow on very small screens

## LOW (Out of scope for now)

56. Landing pages have no dark mode
57. No PWA manifest or app icons
58. Signup collects name field (friction)
59. Toast not used for most form submissions
60. Dashboard `console.error` not routed to monitoring service
