/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

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
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Nulstil din adgangskode – Klitmøllers Indkøbsfællesskab</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>KIF</Heading>
          <Text style={subtitle}>Klitmøllers Indkøbsfællesskab</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Nulstil din adgangskode</Heading>
          <Text style={text}>
            Vi har modtaget en anmodning om at nulstille din adgangskode. Klik
            på knappen herunder for at vælge en ny adgangskode.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Nulstil adgangskode
          </Button>
          <Text style={footer}>
            Hvis du ikke har anmodet om dette, kan du trygt ignorere denne email.
            Din adgangskode vil ikke blive ændret.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Segoe UI', Tahoma, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = {
  backgroundColor: 'hsl(150, 25%, 35%)',
  padding: '28px 24px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
}
const logo = {
  color: '#ffffff',
  fontSize: '32px',
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 600 as const,
  margin: '0',
  letterSpacing: '2px',
}
const subtitle = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '13px',
  margin: '6px 0 0 0',
}
const content = { padding: '32px 24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 600 as const,
  color: 'hsl(220, 20%, 15%)',
  fontFamily: "'Playfair Display', Georgia, serif",
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: 'hsl(150, 25%, 35%)',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  fontWeight: 500 as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0' }
