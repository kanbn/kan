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
  Text,
} from "react-email";

import { env } from "@kan/shared/env";

const color = "#171717";
const text = {
  color,
  margin: "0 0 24px",
  fontSize: "14px",
  lineHeight: "22px",
};
const muted = {
  ...text,
  fontSize: "13px",
  lineHeight: "20px",
  color: "#707070",
};

export const EmailLayout = ({
  preview,
  title,
  children,
  buttonLabel,
  buttonHref,
  note,
}: {
  preview: string;
  title: string;
  children: React.ReactNode;
  buttonLabel: string;
  buttonHref?: string;
  note?: string;
}) => {
  const showBranding =
    env("NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY") !== "true";

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <Container
          style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 20px" }}
        >
          {showBranding && (
            <Text
              style={{
                color,
                margin: "0 0 32px",
                fontSize: "15px",
                lineHeight: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              kan.bn
            </Text>
          )}
          <Heading
            style={{
              color,
              margin: "0 0 12px",
              fontSize: "20px",
              lineHeight: "28px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </Heading>
          <Text style={text}>{children}</Text>
          <Button
            target="_blank"
            href={buttonHref}
            style={{
              borderRadius: "6px",
              backgroundColor: color,
              padding: "10px 16px",
              fontSize: "14px",
              lineHeight: "20px",
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            {buttonLabel}
          </Button>
          {note && <Text style={{ ...muted, margin: "24px 0 0" }}>{note}</Text>}
          {showBranding && (
            <>
              <Hr style={{ margin: "40px 0 20px", borderColor: "#e8e8e8" }} />
              <Text style={{ ...muted, margin: 0, fontSize: "12px" }}>
                <Link
                  href={env("NEXT_PUBLIC_BASE_URL")}
                  target="_blank"
                  style={{ color: "#707070", textDecoration: "underline" }}
                >
                  Kan
                </Link>
                , kanban for teams and agents.
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
};
