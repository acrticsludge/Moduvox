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
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>
        You're invited to view &ldquo;{presentationTitle}&rdquo;
      </Preview>
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
            <Section className="bg-white rounded-xl border border-[#E4E4E7] px-10 py-8 text-center">
              {/* Play icon */}
              <Section className="mb-6" align="center">
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
                      <span style={{ color: "white", fontSize: 20, lineHeight: "48px" }}>▶</span>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* Headline */}
              <Heading className="text-[24px] font-semibold text-[#18181B] tracking-[-0.02em] m-0 mb-4">
                You're invited
              </Heading>

              {/* Body */}
              <Text className="text-[15px] text-[#71717A] leading-6 m-0 mb-6">
                Hi {viewerName},
                <br />
                <br />
                You've been invited to view{' '}
                <span className="font-semibold text-[#18181B]">
                  &ldquo;{presentationTitle}&rdquo;
                </span>
                , a narrated presentation created with Moduvox. Click the
                button below to verify your email and start watching.
              </Text>

              {/* CTA */}
              <Section className="mb-6" align="center">
                <Button
                  className="inline-block bg-[#18181B] text-white text-[13px] font-medium px-6 py-3 rounded-lg no-underline"
                  href={verificationUrl}
                >
                  Verify Email →
                </Button>
              </Section>

              {/* Footnote */}
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

export default MagicLinkEmail
