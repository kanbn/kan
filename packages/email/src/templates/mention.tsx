import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Html } from "@react-email/html";
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
  <Html lang="uk">
    <Head />
    <Preview>
      {commenterName} згадує вас у коментарі до «{cardTitle}»
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
        {env("NEXT_PUBLIC_INSTANCE_NAME") && (
          <Heading
            style={{
              marginTop: "2.5rem",
              marginBottom: "2.5rem",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#232323",
            }}
          >
            {env("NEXT_PUBLIC_INSTANCE_NAME")}
          </Heading>
        )}
        <Heading
          style={{ fontSize: "24px", fontWeight: "bold", color: "#232323" }}
        >
          Вас згадали в коментарі
        </Heading>
        <Text
          style={{
            fontSize: "0.875rem",
            marginBottom: "1rem",
            color: "#232323",
          }}
        >
          <strong>{commenterName}</strong> згадує вас у коментарі до картки{" "}
          <strong>{cardTitle}</strong> на дошці <strong>{boardName}</strong>.
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
          Переглянути картку
        </Button>
      </Container>
    </Body>
  </Html>
);

export default MentionTemplate;
