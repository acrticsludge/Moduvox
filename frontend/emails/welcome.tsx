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
