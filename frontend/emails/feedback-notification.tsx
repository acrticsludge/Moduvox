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

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-base">
      {Array.from({ length: 5 }, (_, i) => (i < rating ? "\u2605" : "\u2606")).join("")}
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
