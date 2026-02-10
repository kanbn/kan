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

export const MentionNotificationTemplate = ({
  mentionedByName,
  cardTitle,
  workspaceName,
  cardUrl,
  commentText,
}: {
  mentionedByName?: string;
  cardTitle?: string;
  workspaceName?: string;
  cardUrl?: string;
  commentText?: string;
}) => (
  <Html>
    <Head />
    <Preview>
      {mentionedByName
        ? `${mentionedByName} mentioned you in "${cardTitle ?? "a card"}"`
        : `You were mentioned in "${cardTitle ?? "a card"}"`}
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
          {env("NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY") !== "true" && "Kan"}
        </Heading>
        <Heading
          style={{ fontSize: "24px", fontWeight: "bold", color: "#232323" }}
        >
          {mentionedByName
            ? `${mentionedByName} mentioned you in a comment`
            : "You were mentioned in a comment"}
        </Heading>
        <Text
          style={{
            fontSize: "0.875rem",
            color: "#232323",
          }}
        >
          {workspaceName && cardTitle
            ? `In card "${cardTitle}" in workspace "${workspaceName}"`
            : cardTitle
              ? `In card "${cardTitle}"`
              : "In a card comment"}
        </Text>
        {commentText && (
          <Text
            style={{
              fontSize: "0.875rem",
              color: "#555555",
              backgroundColor: "#f5f5f5",
              padding: "0.75rem",
              borderRadius: "0.375rem",
              borderLeft: "3px solid #3b82f6",
            }}
          >
            {commentText}
          </Text>
        )}
        <Button
          target="_blank"
          href={cardUrl}
          style={{
            marginTop: "1rem",
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
        <Text
          style={{
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#7e7e7e",
          }}
        >
          If you don&apos;t want to receive these notifications, you can
          unsubscribe from your account settings.
        </Text>
        {env("NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY") !== "true" && (
          <>
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
          </>
        )}
      </Container>
    </Body>
  </Html>
);

export default MentionNotificationTemplate;
