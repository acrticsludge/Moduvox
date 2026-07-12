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

const steps = [
  {
    number: "1",
    title: "Upload a PPTX",
    description: "Start by uploading a presentation you want to narrate.",
  },
  {
    number: "2",
    title: "Choose a voice",
    description: "Pick a preset voice or clone your own.",
  },
  {
    number: "3",
    title: "Generate audio",
    description:
      "Let AI write your narration script, then generate natural-sounding audio.",
  },
  {
    number: "4",
    title: "Share",
    description:
      "Send the link to your audience and track who watched what.",
  },
]

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 bg-[#18181B] rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-white text-[12px] font-bold">{number}</span>
      </div>
      <div>
        <Text className="text-[15px] font-semibold text-[#18181B] m-0">
          {title}
        </Text>
        <Text className="text-[13px] text-[#71717A] m-0 mt-0.5">
          {description}
        </Text>
      </div>
    </div>
  )
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
        <Body className="bg-[#F9FAFB] font-sans py-8 px-4">
          <Container className="max-w-[480px] mx-auto">
            {/* Header — Moduvox wordmark */}
            <Section className="text-center py-4">
              <Text className="text-[16px] font-semibold text-[#71717A] tracking-tight m-0">
                Moduvox
              </Text>
            </Section>

            {/* Main card */}
            <Section className="bg-white rounded-xl border border-[#E4E4E7] px-10 py-8">
              {/* Checkmark icon */}
              <Section className="text-center mb-6">
                <div className="w-12 h-12 bg-[#18181B] rounded-lg flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </Section>

              {/* Welcome heading */}
              <Section className="text-center mb-6">
                <Heading className="text-[24px] font-semibold text-[#18181B] tracking-[-0.02em] m-0 mb-2">
                  Welcome to Moduvox, {userName}!
                </Heading>
                <Text className="text-[15px] text-[#71717A] leading-6 m-0">
                  We're excited to have you on board. Moduvox helps you turn
                  slide decks into narrated training videos in minutes.
                </Text>
              </Section>

              {/* Steps */}
              <Section className="mb-6 space-y-4">
                {steps.map((step) => (
                  <Step key={step.number} {...step} />
                ))}
              </Section>

              {/* CTA */}
              <Section className="text-center pt-4">
                <Button
                  className="inline-flex items-center justify-center bg-[#18181B] text-white text-[13px] font-medium px-8 py-3 rounded-lg no-underline"
                  href={dashboardUrl}
                >
                  Go to Dashboard →
                </Button>
              </Section>

              {/* Divider + help note */}
              <Section className="mt-6 pt-4 border-t border-[#E4E4E7] text-center">
                <Text className="text-[13px] text-[#71717A] m-0">
                  Need help? Reply to this email — we're happy to help.
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="text-center px-10 pb-6 mt-6 pt-4">
              <Text className="text-[11px] text-[#A1A1AA] m-0">
                Moduvox — Turn slides into narrated videos
              </Text>
              <Text className="text-[11px] text-[#A1A1AA] m-0 mt-2">
                If you didn't sign up for Moduvox, you can ignore this
                email.
              </Text>
              <div className="flex justify-center gap-4 mt-2">
                <a
                  href="https://pulsemonitor.dev/privacy"
                  className="text-[11px] text-[#A1A1AA] no-underline"
                >
                  Privacy
                </a>
                <a
                  href="https://pulsemonitor.dev/terms"
                  className="text-[11px] text-[#A1A1AA] no-underline"
                >
                  Terms
                </a>
              </div>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default WelcomeEmail
