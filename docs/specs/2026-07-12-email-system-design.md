# Email System — Design Spec

**Date:** 2026-07-12
**Status:** Draft
**Branch:** `feat/emails`

## Overview

Replace current plain-text email sending with a proper React Email + Resend SDK system. Adds a welcome/onboarding email, converts existing magic link and feedback notification emails to HTML templates, and introduces a shared email utility.

## Scope (3 email types)

1. **Welcome email** — sent after signup (email + OAuth)
2. **Magic link email** — sent to viewers when email gate is enabled (upgraded from plain text)
3. **Feedback notification** — sent to founder when user submits feedback (upgraded from plain text)

## Architecture

```
frontend/
├── lib/
│   └── email.ts                ← shared sendEmail() utility
├── emails/                      ← React Email template components
│   ├── magic-link.tsx           ← viewer verification
│   ├── welcome.tsx              ← post-signup onboarding
│   └── feedback-notification.tsx ← new submission notification
├── app/
│   ├── api/
│   │   ├── view/[...]/gate/route.ts    ← replace inline Resend call with sendEmail()
│   │   ├── feedback/route.ts           ← replace inline Resend call with sendEmail()
│   │   └── auth/send-welcome/route.ts  ← new: triggered after signup
│   └── auth/
│       └── callback/route.ts           ← trigger welcome for new OAuth users
└── signup/page.tsx                      ← trigger welcome after email signup
```

## Shared Email Utility (`lib/email.ts`)

### Interface

```ts
type SendEmailParams = {
  to: string
  subject: string
  template: React.ReactElement
  replyTo?: string
}

type SendEmailResult = {
  success: boolean
  error?: string
}

async function sendEmail(params: SendEmailParams): Promise<SendEmailResult>
```

### Implementation

- Uses the `resend` npm package (not raw fetch)
- Renders React Email templates to HTML via `renderAsync()`
- From: `"Moduvox" <alerts@pulsemonitor.dev>`
- Logs errors server-side, returns structured result
- Single import, single call — no inline fetch duplication

### Error handling

- Catches Resend API errors (network, auth, rate limit)
- Never throws — always returns `{ success, error? }`
- Caller decides whether to retry or fail

## Template: Welcome (`emails/welcome.tsx`)

### Props

```ts
type WelcomeEmailProps = {
  userName: string
  dashboardUrl: string
}
```

### Content

- **Subject:** "Welcome to Moduvox, {name}!"
- **Header:** Moduvox logo + "Welcome aboard!"
- **Body paragraph:** Brief intro — turn slides into narrated videos
- **CTA button:** "Go to Dashboard" → `{dashboardUrl}`
- **Secondary text:** "Upload a PPTX to get started"
- **Footer:** Small "If you didn't sign up, ignore this email" + brand link

### Trigger points

| Trigger | Location | Condition |
|---------|----------|-----------|
| Email signup | `signup/page.tsx` → `POST /api/auth/send-welcome` | After successful `supabase.auth.signUp()` |
| OAuth signup | `auth/callback/route.ts` → `POST /api/auth/send-welcome` | After successful OAuth, only if user is NEW (not returning) |

The `POST /api/auth/send-welcome` endpoint:
- Accepts `{ userId: string }`
- Fetches user name/email from Supabase
- Calls `sendEmail()` with welcome template
- Returns 200 on success, 500 on failure

## Template: Magic Link (`emails/magic-link.tsx`)

### Props

```ts
type MagicLinkEmailProps = {
  viewerName: string
  verificationUrl: string
  presentationTitle: string
}
```

### Content

- **Subject:** "You're invited to view \"{presentationTitle}\""
- **Greeting:** "Hi {viewerName},"
- **Body:** "You've been invited to view a narrated presentation. Click the button below to verify your email and start watching."
- **CTA button:** "Verify Email →" → `{verificationUrl}`
- **Note:** "This link expires in 15 minutes."
- **Footer:** "If you didn't request this, you can safely ignore this email."

### Trigger

- Same as current: `POST /api/view/[shareToken]/gate`
- Replace inline Resend `fetch()` with `sendEmail()`

## Template: Feedback Notification (`emails/feedback-notification.tsx`)

### Props

```ts
type FeedbackNotificationEmailProps = {
  category: string
  rating: number
  name: string
  email: string
  message: string
  canContact: boolean
  ip: string
}
```

### Content

- **Subject:** "New feedback from {name} — {category} ({rating}/5)"
- **Structured layout:**
  - Category badge
  - Rating row (star visual)
  - Name + email row
  - "Can contact" indicator
  - Message block (quoted style)
  - IP metadata in footer

### Trigger

- Same as current: `POST /api/feedback`
- Replace inline Resend `fetch()` with `sendEmail()`

## Dependencies

Add to `frontend/package.json`:

```json
{
  "dependencies": {
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "@react-email/components": "^0.0.22"
  }
}
```

`@react-email/components` is a dev dependency — it's used only at build time to render templates to HTML strings. The `resend` package is the runtime dependency for the API call.

## Setup

1. Run `npm install resend @react-email/components` in `frontend/`
2. Create `frontend/emails/` directory
3. Create `frontend/lib/email.ts`
4. Configure Resend client in `email.ts` using existing `RESEND_API_KEY`
5. Verify `alerts@pulsemonitor.dev` sending domain in Resend dashboard (already done — actively sending)
6. Set sender name to `"Moduvox"` in the from address

## Implementation Order

1. Install deps + create `lib/email.ts` utility
2. Create `emails/welcome.tsx` template
3. Create `POST /api/auth/send-welcome` endpoint
4. Wire welcome trigger in `signup/page.tsx` and `auth/callback/route.ts`
5. Create `emails/magic-link.tsx` template
6. Replace inline Resend call in `gate/route.ts`
7. Create `emails/feedback-notification.tsx` template
8. Replace inline Resend call in `feedback/route.ts`
9. Test all three flows end-to-end

## Out of Scope

- Password reset email
- Weekly/monthly digests
- Resend webhook handling (bounce, complaint)
- Email preference center
- Unsubscribe management

---

## Self-Review

- **Placeholders?** None. All sections filled.
- **Internal consistency?** Yes — utility interface matches all three callers.
- **Scope?** Focused on 3 email types. No scope creep.
- **Ambiguity?** Trigger conditions for welcome email explicitly cover both signup paths. Condition for "new user" on OAuth is clear (check if `created_at === last_sign_in_at`, or check if user record didn't exist before).
