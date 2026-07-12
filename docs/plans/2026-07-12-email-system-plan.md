# Email System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Replace plain-text Resend calls with React Email templates + shared `sendEmail()` utility. Add welcome email on signup. Upgrade magic link and feedback notification to HTML.

**Architecture:** React Email template components in `frontend/emails/`, shared `sendEmail()` utility in `frontend/lib/email.ts` using `resend` npm package. Three API call sites updated to use the utility. New `POST /api/auth/send-welcome` endpoint triggered after signup (email + OAuth).

**Tech Stack:** React Email (render-to-HTML), Resend SDK, Next.js API routes

---

### Task 1: Install dependencies

- [ ] **Step 1: Install packages**

Run:
```bash
cd frontend
npm install resend
npm install -D @react-email/components
```

Verify both are in `package.json`.

- [ ] **Step 2: Create emails directory**

```bash
mkdir frontend\emails
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/emails
git commit -m "chore: add resend + react-email deps, create emails dir"
```

---

### Task 2: Create `lib/email.ts` shared utility

**Files:**
- Create: `frontend/lib/email.ts`

- [ ] **Step 1: Write the email utility**

```typescript
import { Resend } from "resend"
import { renderAsync } from "@react-email/components"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Moduvox <alerts@pulsemonitor.dev>"

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

export async function sendEmail({
  to,
  subject,
  template,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const html = await renderAsync(template)

    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
      replyTo: replyTo ?? undefined,
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    console.error("[email] send failed:", message)
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/email.ts
git commit -m "feat: add shared sendEmail() utility with Resend SDK"
```

---

### Task 3: Create `emails/magic-link.tsx` template

**Files:**
- Create: `frontend/emails/magic-link.tsx`

- [ ] **Step 1: Write the template**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components"

type MagicLinkEmailProps = {
  viewerName?: string
  verificationUrl: string
  presentationTitle: string
}

export function MagicLinkEmail({
  viewerName = "there",
  verificationUrl,
  presentationTitle,
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You're invited to view "{presentationTitle}"</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto max-w-[480px] py-10">
            <Heading className="text-2xl font-semibold text-zinc-900">
              You're invited
            </Heading>
            <Text className="mt-4 text-base text-zinc-700">
              Hi {viewerName},
            </Text>
            <Text className="text-base text-zinc-700">
              You've been invited to view <strong>“{presentationTitle}”</strong>, a narrated
              presentation created with Moduvox. Click the button below to verify
              your email and start watching.
            </Text>
            <Section className="my-8 text-center">
              <Button
                className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white no-underline"
                href={verificationUrl}
              >
                Verify Email →
              </Button>
            </Section>
            <Text className="text-sm text-zinc-500">
              This link expires in 15 minutes. If you didn't request this, you can
              safely ignore this email.
            </Text>
            <Hr className="my-6 border-zinc-200" />
            <Text className="text-xs text-zinc-400">Moduvox — Turn slides into narrated videos</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default MagicLinkEmail
```

- [ ] **Step 2: Commit**

```bash
git add frontend/emails/magic-link.tsx
git commit -m "feat: add magic link email template"
```

---

### Task 4: Create `emails/welcome.tsx` template

**Files:**
- Create: `frontend/emails/welcome.tsx`

- [ ] **Step 1: Write the template**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components"

type WelcomeEmailProps = {
  userName: string
  dashboardUrl: string
}

export function WelcomeEmail({
  userName,
  dashboardUrl = "https://pulsemonitor.dev/dashboard",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Moduvox, {userName}!</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto max-w-[480px] py-10">
            <Heading className="text-2xl font-semibold text-zinc-900">
              Welcome to Moduvox, {userName}!
            </Heading>
            <Text className="mt-4 text-base text-zinc-700">
              We're excited to have you on board. Moduvox helps you turn slide
              decks into narrated training videos in minutes.
            </Text>
            <Text className="text-base text-zinc-700">
              Here's how to get started:
            </Text>
            <ol className="text-base text-zinc-700">
              <li className="mb-2">
                <strong>Upload a PPTX</strong> — Start by uploading a
                presentation you want to narrate.
              </li>
              <li className="mb-2">
                <strong>Choose a voice</strong> — Pick a preset voice or clone
                your own.
              </li>
              <li className="mb-2">
                <strong>Generate audio</strong> — Let AI write your narration
                script, then generate natural-sounding audio.
              </li>
              <li>
                <strong>Share</strong> — Send the link to your audience and
                track who watched what.
              </li>
            </ol>
            <Section className="my-8 text-center">
              <Button
                className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white no-underline"
                href={dashboardUrl}
              >
                Go to Dashboard →
              </Button>
            </Section>
            <Text className="text-sm text-zinc-500">
              Need help? Reply to this email — we're happy to help.
            </Text>
            <Hr className="my-6 border-zinc-200" />
            <Text className="text-xs text-zinc-400">
              If you didn't sign up for Moduvox, you can ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default WelcomeEmail
```

- [ ] **Step 2: Commit**

```bash
git add frontend/emails/welcome.tsx
git commit -m "feat: add welcome email template"
```

---

### Task 5: Create `emails/feedback-notification.tsx` template

**Files:**
- Create: `frontend/emails/feedback-notification.tsx`

- [ ] **Step 1: Write the template**

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components"

type FeedbackNotificationEmailProps = {
  category: string
  rating: number
  name: string
  email: string
  message: string
  canContact: boolean
  ip: string
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-base">
      {Array.from({ length: 5 }, (_, i) => (i < rating ? "★" : "☆")).join("")}
    </span>
  )
}

export function FeedbackNotificationEmail({
  category,
  rating,
  name,
  email,
  message,
  canContact,
  ip,
}: FeedbackNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New feedback from {name}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto max-w-[480px] py-10">
            <Heading className="text-2xl font-semibold text-zinc-900">
              New Feedback
            </Heading>

            <Section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-sm font-medium text-zinc-700">
                  {category.replace("_", " ")}
                </span>
                <RatingStars rating={rating} />
              </div>

              <div className="mb-3 text-sm text-zinc-600">
                <span className="font-medium text-zinc-800">{name}</span>
                {email && (
                  <span className="text-zinc-400"> · {email}</span>
                )}
              </div>

              {canContact && (
                <div className="mb-3 text-xs text-green-600">
                  ✓ OK to contact
                </div>
              )}

              <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
                {message}
              </div>
            </Section>

            <Text className="text-xs text-zinc-400">IP: {ip}</Text>
            <Hr className="my-4 border-zinc-200" />
            <Text className="text-xs text-zinc-400">
              Moduvox — Feedback notification
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default FeedbackNotificationEmail
```

- [ ] **Step 2: Commit**

```bash
git add frontend/emails/feedback-notification.tsx
git commit -m "feat: add feedback notification email template"
```

---

### Task 6: Create `POST /api/auth/send-welcome` endpoint

**Files:**
- Create: `frontend/app/api/auth/send-welcome/route.ts`

- [ ] **Step 1: Write the endpoint**

```typescript
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { WelcomeEmail } from "@/emails/welcome"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single()

    if (error || !user) {
      console.error("[send-welcome] User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://pulsemonitor.dev"}/dashboard`

    const result = await sendEmail({
      to: user.email,
      subject: `Welcome to Moduvox, ${user.name}!`,
      template: <WelcomeEmail userName={user.name} dashboardUrl={dashboardUrl} />,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error("[send-welcome] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/auth/send-welcome/route.ts
git commit -m "feat: add POST /api/auth/send-welcome endpoint"
```

---

### Task 7: Wire welcome trigger in signup page

**Files:**
- Modify: `frontend/app/signup/page.tsx`

- [ ] **Step 1: Find the signup success path**

Search for where signup succeeds — after `supabase.auth.signUp()` returns successfully, look for the redirect or success state.

- [ ] **Step 2: Add welcome email trigger**

After successful signup and before/after redirect, fire-and-forget the welcome email:

```typescript
// After successful signup — fire welcome email (don't block redirect)
fetch("/api/auth/send-welcome", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: data.user!.id }),
}).catch(() => {}) // fire-and-forget
```

Place this right before the `router.push` or `window.location.href` redirect.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/signup/page.tsx
git commit -m "feat: trigger welcome email on email signup"
```

---

### Task 8: Wire welcome trigger in OAuth callback

**Files:**
- Modify: `frontend/app/auth/callback/route.ts`

- [ ] **Step 1: Find the OAuth callback success path**

Read `frontend/app/auth/callback/route.ts` — find where the user is fetched after OAuth exchange.

- [ ] **Step 2: Add welcome email for new users**

Detect new users by checking if `created_at === last_sign_in_at` (or similar Supabase signal). After redirect, fire welcome:

```typescript
// In the callback route, after successful auth exchange
// Check if this is a new user (first sign-in)
const isNewUser = user.created_at === user.last_sign_in_at

// After successful exchange and redirect...
// Fire welcome email for new users (fire-and-forget after response)
if (isNewUser) {
  fetch(`${siteUrl}/api/auth/send-welcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id }),
  }).catch(() => {})
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/auth/callback/route.ts
git commit -m "feat: trigger welcome email on OAuth signup for new users"
```

---

### Task 9: Replace Resend call in gate/route.ts

**Files:**
- Modify: `frontend/app/api/view/[shareToken]/gate/route.ts`

- [ ] **Step 1: Import the utility and template**

Add to top of file:
```typescript
import { sendEmail } from "@/lib/email"
import { MagicLinkEmail } from "@/emails/magic-link"
```

- [ ] **Step 2: Replace inline Resend fetch with sendEmail()**

Find the email sending block (around line 229-271). Replace the whole block:
```typescript
// Send magic link email via Resend
const verificationUrl = `${siteUrl}/view/${shareToken}/verify?vt=${viewer.session_token}`

const emailResult = await sendEmail({
  to: parsed.email,
  subject: `You're invited to view "${presentation.title}"`,
  template: (
    <MagicLinkEmail
      viewerName={parsed.viewer_name}
      verificationUrl={verificationUrl}
      presentationTitle={presentation.title}
    />
  ),
})

if (!emailResult.success) {
  // Rollback viewer creation if email fails
  await supabase.from("viewers").delete().eq("id", viewer.id)
  return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
}
```

Remove the old `fetch()` to Resend, the inline plain-text body construction, and `RESEND_FROM_EMAIL` usage in this file (it still needs `RESEND_API_KEY` for the utility).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/view/[shareToken]/gate/route.ts
git commit -m "feat: use sendEmail() + magic link template in gate route"
```

---

### Task 10: Replace Resend call in feedback/route.ts

**Files:**
- Modify: `frontend/app/api/feedback/route.ts`

- [ ] **Step 1: Import the utility and template**

Add to top of file:
```typescript
import { sendEmail } from "@/lib/email"
import { FeedbackNotificationEmail } from "@/emails/feedback-notification"
```

- [ ] **Step 2: Replace inline Resend fetch with sendEmail()**

Find the email sending block (around lines 107-128). Replace:
```typescript
const emailResult = await sendEmail({
  to: "anubhavrai100@gmail.com",
  subject: `New feedback from ${parsed.name} — ${CATEGORY_LABELS[parsed.category]} (${parsed.rating}/5)`,
  template: (
    <FeedbackNotificationEmail
      category={parsed.category}
      rating={parsed.rating}
      name={parsed.name}
      email={parsed.email}
      message={parsed.message}
      canContact={parsed.can_contact}
      ip={ip}
    />
  ),
})

if (!emailResult.success) {
  console.error("[feedback] Failed to send email:", emailResult.error)
  // Don't return error — feedback was already saved/logged
}
```

Remove the old `fetch()` to Resend and the inline body construction.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/feedback/route.ts
git commit -m "feat: use sendEmail() + feedback template in feedback route"
```

---

### Task 11: TypeScript check + final commit

- [ ] **Step 1: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Push**

```bash
git push origin feat/emails
```

---

## Self-Review Checklist

- **Spec coverage:** Welcome (Task 4, 6, 7, 8), Magic link (Task 3, 9), Feedback (Task 5, 10), shared utility (Task 2). ✅
- **Placeholders:** None. All code blocks are complete. ✅
- **Type consistency:** `sendEmail()` interface matches usage in all 3 callers. Template prop types match callers. ✅
- **API route paths:** `/api/auth/send-welcome` (new), `/api/view/[shareToken]/gate` (existing), `/api/feedback` (existing). ✅
