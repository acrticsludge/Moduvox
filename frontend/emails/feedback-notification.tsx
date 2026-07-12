import {
  Body,
  Container,
  Head,
  Heading,
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
  email?: string
  message: string
  canContact: boolean
  ip: string
}

const CATEGORY_LABELS: Record<string, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  general: "General",
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} style={{ lineHeight: 1 }}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? "\u2605" : "\u2606",
      ).join("")}
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
  const categoryLabel = CATEGORY_LABELS[category] || category

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>New feedback from {name}</Preview>
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
              <Heading className="text-[22px] font-semibold text-[#18181B] leading-tight m-0 mb-6">
                New Feedback
              </Heading>

              {/* Sub-card */}
              <Section
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E4E4E7",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                {/* Row 1: Badge + contact */}
                <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: 16 }}>
                  <tr>
                    <td align="left" style={{ width: "50%" }}>
                      <span
                        style={{
                          backgroundColor: "#F3F4F6",
                          color: "#18181B",
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "2px 10px",
                          borderRadius: 9999,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          display: "inline-block",
                        }}
                      >
                        {categoryLabel}
                      </span>
                    </td>
                    <td align="right" style={{ width: "50%" }}>
                      {canContact && (
                        <span style={{ color: "#16A34A", fontSize: 12, fontWeight: 500 }}>
                          ✓ OK to contact
                        </span>
                      )}
                    </td>
                  </tr>
                </table>

                {/* Row 2: Name + email + rating */}
                <div style={{ borderBottom: "1px solid #E4E4E7", paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: "#18181B", fontWeight: 600, fontSize: 15 }}>
                      {name}
                    </span>
                    {email && (
                      <span style={{ color: "#71717A", fontSize: 15, marginLeft: 8 }}>
                        {email}
                      </span>
                    )}
                  </div>
                  <RatingStars rating={rating} />
                </div>

                {/* Row 3: Message */}
                <div
                  style={{
                    backgroundColor: "#FAFAFA",
                    border: "1px solid #E4E4E7",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text className="text-[#18181B] text-[15px] leading-relaxed m-0">
                    {message}
                  </Text>
                </div>

                {/* Row 4: Metadata */}
                <Text className="text-[#A1A1AA] text-[11px] m-0">
                  IP: {ip}
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

export default FeedbackNotificationEmail
