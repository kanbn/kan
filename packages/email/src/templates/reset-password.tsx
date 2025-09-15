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

export const ResetPasswordTemplate = ({
  resetPasswordUrl,
  resetPasswordToken,
}: {
  resetPasswordUrl?: string;
  resetPasswordToken?: string;
}) => (
  <Html>
    <Head />
    <Preview>Redefina sua senha Kan</Preview>
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
          Costao Lavanderia
        </Heading>
        <Heading
          style={{ fontSize: "24px", fontWeight: "bold", color: "#232323" }}
        >
          Redefina sua senha Kan
        </Heading>
        <Text
          style={{
            fontSize: "0.875rem",
            marginBottom: "2rem",
            color: "#232323",
          }}
        >
          Clique no botão abaixo para redefinir sua senha.
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
          Redefinir senha
        </Button>
        <Text
          style={{
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#7e7e7e",
          }}
        >
          Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.
        </Text>
        <Hr
          style={{
            marginTop: "2.5rem",
            marginBottom: "2rem",
            borderWidth: "1px",
          }}
        />
      </Container>
    </Body>
  </Html>
);

export default ResetPasswordTemplate;
