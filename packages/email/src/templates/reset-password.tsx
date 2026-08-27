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

export const ResetPasswordTemplate = ({
  resetPasswordUrl,
}: {
  resetPasswordUrl?: string;
  resetPasswordToken?: string;
}) => (
  <Html lang="uk">
    <Head />
    <Preview>Скидання пароля</Preview>
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
          Скидання пароля
        </Heading>
        <Text
          style={{
            fontSize: "0.875rem",
            marginBottom: "2rem",
            color: "#232323",
          }}
        >
          Натисніть кнопку нижче, щоб скинути пароль.
        </Text>
        <Button
          target="_blank"
          href={resetPasswordUrl}
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
          Скинути пароль
        </Button>
        <Text
          style={{
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#7e7e7e",
          }}
        >
          Якщо ви не запитували скидання пароля, просто проігноруйте цей лист.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ResetPasswordTemplate;
