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
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto max-w-[480px] py-10">
            <Heading className="text-2xl font-semibold text-zinc-900">
              You're invited
            </Heading>
            <Text className="mt-4 text-base text-zinc-700">
              Hi {viewerName},
            </Text>
            <Text className="text-base text-zinc-700">
              You've been invited to view <strong>&ldquo;{presentationTitle}&rdquo;</strong>, a narrated
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
