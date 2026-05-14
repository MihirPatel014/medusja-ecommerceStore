// @ts-nocheck
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

interface PasswordResetEmailProps {
  reset_url: string
  email?: string
}

export const PasswordResetEmail = ({
  reset_url,
  email,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your password for Medusa Store</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          Hello {email ? email : "there"},
        </Text>
        <Text style={text}>
          We received a request to reset your password. Click the button below to set a new password.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={reset_url}>
            Reset Password
          </Button>
        </Section>
        <Text style={text}>
          If you didn't request this, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If the button above doesn't work, copy and paste this link into your browser:
          <br />
          <Link href={reset_url} style={link}>
            {reset_url}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
}

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
}

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 48px 16px",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#000",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const link = {
  color: "#2563eb",
  textDecoration: "underline",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 48px",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "22px",
  margin: "0 48px",
}
