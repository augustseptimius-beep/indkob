/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Du er inviteret til Klitmøllers Indkøbsfællesskab</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>KIF</Heading>
          <Text style={subtitle}>Klitmøllers Indkøbsfællesskab</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Du er inviteret!</Heading>
          <Text style={text}>
            Du er blevet inviteret til at blive en del af{' '}
            <Link href={siteUrl} style={link}>
              Klitmøllers Indkøbsfællesskab
            </Link>
            . Klik på knappen herunder for at acceptere invitationen og oprette din konto.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Acceptér invitation
          </Button>
          <Text style={footer}>
            Hvis du ikke forventede denne invitation, kan du trygt ignorere denne email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: 'hsl(150, 25%, 35%)', textDecoration: 'underline' }
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
