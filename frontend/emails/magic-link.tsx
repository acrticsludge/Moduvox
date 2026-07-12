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
      <Preview>You're invited to view &ldquo;{presentationTitle}&rdquo;</Preview>
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
            <Section className="bg-white rounded-xl border border-[#E4E4E7] px-10 py-8 text-center">
              {/* Play icon */}
              <Section className="mb-6">
                <div className="w-12 h-12 bg-[#18181B] rounded-lg flex items-center justify-center mx-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <polygon points="8,5 19,12 8,19" />
                  </svg>
                </div>
              </Section>

              {/* Headline */}
              <Heading className="text-[24px] font-semibold text-[#18181B] tracking-[-0.02em] m-0 mb-4">
                You're invited
              </Heading>

              {/* Body */}
              <Text className="text-[15px] text-[#71717A] leading-6 m-0 mb-6">
                Hi {viewerName},
                <br /><br />
                You've been invited to view{' '}
                <span className="font-semibold text-[#18181B]">
                  &ldquo;{presentationTitle}&rdquo;
                </span>
                , a narrated presentation created with Moduvox. Click the
                button below to verify your email and start watching.
              </Text>

              {/* CTA */}
              <Section className="mb-6">
                <Button
                  className="inline-flex items-center justify-center bg-[#18181B] text-white text-[13px] font-medium px-6 py-3 rounded-lg no-underline"
                  href={verificationUrl}
                >
                  Verify Email →
                </Button>
              </Section>

              {/* Footnote with top border */}
              <Section className="border-t border-[#E4E4E7] pt-4 mt-4">
                <Text className="text-[13px] text-[#71717A] m-0">
                  This link expires in 15 minutes. If you didn't request
                  this, you can safely ignore this email.
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="text-center px-10 pb-6 mt-6 pt-4">
              <Text className="text-[11px] text-[#A1A1AA] m-0">
                Moduvox — Turn slides into narrated videos
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

export default MagicLinkEmail
