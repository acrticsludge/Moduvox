import {
  Body,
  Button,
  Container,
  Head,
  Heading,
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
    <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: 16 }}>
      <tr>
        <td style={{ width: 24, verticalAlign: "top", paddingTop: 2 }}>
          <table
            cellPadding="0"
            cellSpacing="0"
            role="presentation"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: "#18181B",
            }}
          >
            <tr>
              <td align="center" style={{ color: "white", fontSize: 12, fontWeight: 700 }}>
                {number}
              </td>
            </tr>
          </table>
        </td>
        <td style={{ paddingLeft: 16 }}>
          <Text className="text-[15px] font-semibold text-[#18181B] m-0">
            {title}
          </Text>
          <Text className="text-[13px] text-[#71717A] m-0 mt-0.5">
            {description}
          </Text>
        </td>
      </tr>
    </table>
  )
}

export function WelcomeEmail({
  userName,
  dashboardUrl = "https://moduvox.pulsemonitor.dev/dashboard",
}: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>Welcome to Moduvox, {userName}!</Preview>
      <Tailwind>
        <Body className="bg-[#F9FAFB] font-sans py-8 px-4">
          <Container className="max-w-[480px] mx-auto">
            {/* Header */}
            <Section className="text-center py-4">
              <Text className="text-[16px] font-semibold text-[#71717A] tracking-tight m-0">
                Moduvox
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-xl border border-[#E4E4E7] px-10 py-8">
              {/* Checkmark icon */}
              <Section className="text-center mb-6" align="center">
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  role="presentation"
                  style={{ margin: "0 auto" }}
                >
                  <tr>
                    <td
                      align="center"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: "#18181B",
                      }}
                    >
                      <span style={{ color: "white", fontSize: 20, lineHeight: "48px" }}>✓</span>
                    </td>
                  </tr>
                </table>
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
              <Section className="mb-6">
                {steps.map((step) => (
                  <Step key={step.number} {...step} />
                ))}
              </Section>

              {/* CTA */}
              <Section className="text-center pt-4" align="center">
                <Button
                  className="inline-block bg-[#18181B] text-white text-[13px] font-medium px-8 py-3 rounded-lg no-underline"
                  href={dashboardUrl}
                >
                  Go to Dashboard →
                </Button>
              </Section>

              {/* Help note */}
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
                If you didn't sign up for Moduvox, you can ignore this email.
              </Text>
              <div className="flex justify-center gap-4 mt-2">
                <a
                  href="https://moduvox.pulsemonitor.dev/privacy"
                  style={{ textDecoration: "none", color: "#A1A1AA" }}
                  className="text-[11px] no-underline"
                >
                  <span style={{ color: "#A1A1AA" }}>Privacy</span>
                </a>
                <a
                  href="https://moduvox.pulsemonitor.dev/terms"
                  style={{ textDecoration: "none", color: "#A1A1AA" }}
                  className="text-[11px] no-underline"
                >
                  <span style={{ color: "#A1A1AA" }}>Terms</span>
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
