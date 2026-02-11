import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Link } from "@react-email/link";
import { Preview } from "@react-email/preview";
import { Text } from "@react-email/text";
import { env } from "next-runtime-env";
import * as React from "react";

export const MentionTemplate = ({
  commenterName,
  boardName,
  cardTitle,
  cardUrl,
}: {
  commenterName: string;
  boardName: string;
  cardTitle: string;
  cardUrl: string;
}) => (
  <Html>
    <Head />
    <Preview>
      {commenterName} mentioned you in a comment on {cardTitle}
    </Preview>
    <Body style={{ backgroundColor: "white" }}>
      <Container
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          margin: "auto",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
        }}
      >
        <Heading
          style={{
            marginTop: "2.5rem",
            marginBottom: "2.5rem",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#232323",
          }}
        >
          kan.bn
        </Heading>
        <Heading
          style={{ fontSize: "24px", fontWeight: "bold", color: "#232323" }}
        >
          You were mentioned in a comment
        </Heading>
        <Text
          style={{
            fontSize: "0.875rem",
            marginBottom: "1rem",
            color: "#232323",
          }}
        >
          <strong>{commenterName}</strong> mentioned you in a comment on the
          card <strong>{cardTitle}</strong> in the board <strong>{boardName}</strong>.
        </Text>
        <Button
          target="_blank"
          href={cardUrl}
          style={{
            marginBottom: "2rem",
            borderRadius: "0.375rem",
            backgroundColor: "#282828",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem",
            paddingTop: "1rem",
            paddingBottom: "1rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            lineHeight: "1",
            color: "white",
          }}
        >
          View Card
        </Button>
        <Hr
          style={{
            marginTop: "2.5rem",
            marginBottom: "2rem",
            borderWidth: "1px",
          }}
        />
        <Text style={{ color: "#7e7e7e" }}>
          <Link
            href={env("NEXT_PUBLIC_BASE_URL")}
            target="_blank"
            style={{ color: "#7e7e7e", textDecoration: "underline" }}
          >
            Kan
          </Link>
          , the open source Trello alternative.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MentionTemplate;

