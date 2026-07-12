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
    <span className="text-[16px]" style={{ lineHeight: "1" }}>
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
    <Html>
      <Head />
      <Preview>New feedback from {name}</Preview>
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
              {/* Headline */}
              <Heading className="text-[22px] font-semibold text-[#18181B] leading-tight m-0 mb-6">
                New Feedback
              </Heading>

              {/* Feedback details sub-card */}
              <Section className="bg-[#F9FAFB] border border-[#E4E4E7] rounded-lg p-4 space-y-4">
                {/* Row 1: Category badge + contact status */}
                <div className="flex justify-between items-center">
                  <span className="bg-[#F3F4F6] text-[#18181B] text-[12px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {categoryLabel}
                  </span>
                  {canContact && (
                    <span className="text-[#16A34A] text-[12px] font-medium">
                      ✓ OK to contact
                    </span>
                  )}
                </div>

                {/* Row 2: Name + email + rating */}
                <div className="border-b border-[#E4E4E7] pb-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <span className="text-[#18181B] font-semibold text-[15px]">
                      {name}
                    </span>
                    {email && (
                      <span className="text-[#71717A] text-[15px]">
                        {email}
                      </span>
                    )}
                  </div>
                  <RatingStars rating={rating} />
                </div>

                {/* Row 3: Message */}
                <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded p-3">
                  <Text className="text-[#18181B] text-[15px] leading-relaxed m-0">
                    {message}
                  </Text>
                </div>

                {/* Row 4: Metadata */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Text className="text-[#A1A1AA] text-[11px] m-0">
                    IP: {ip}
                  </Text>
                </div>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="text-center px-10 pb-6 mt-6 pt-4">
              <Text className="text-[11px] text-[#A1A1AA] m-0">
                Moduvox — Feedback notification
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

export default FeedbackNotificationEmail
