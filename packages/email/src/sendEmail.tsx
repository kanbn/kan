import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { createLogger } from "@kan/logger";

const log = createLogger("email");

import JoinWorkspaceTemplate from "./templates/join-workspace";
import MagicLinkTemplate from "./templates/magic-link";
import MentionTemplate from "./templates/mention";
import ResetPasswordTemplate from "./templates/reset-password";

type Templates = "MAGIC_LINK" | "JOIN_WORKSPACE" | "RESET_PASSWORD" | "MENTION";

const emailTemplates: Record<Templates, React.ComponentType<any>> = {
  MAGIC_LINK: MagicLinkTemplate,
  JOIN_WORKSPACE: JoinWorkspaceTemplate,
  RESET_PASSWORD: ResetPasswordTemplate,
  MENTION: MentionTemplate,
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure:
    process.env.SMTP_SECURE === undefined
      ? true
      : process.env.SMTP_SECURE?.toLowerCase() === "true",
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized:
      process.env.SMTP_REJECT_UNAUTHORIZED === undefined
        ? true
        : process.env.SMTP_REJECT_UNAUTHORIZED?.toLowerCase() === "true",
  },
  ...(process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD && {
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    }),
});

// Send through the Brevo HTTP API. Some hosts block outbound SMTP
// ports; the HTTP API uses port 443, which always works.
const sendViaBrevoApi = async (to: string, subject: string, html: string) => {
  const fromRaw = process.env.EMAIL_FROM ?? "";
  const match = /^(.*)<(.+)>$/.exec(fromRaw);
  const sender = match
    ? { name: match[1]?.trim(), email: match[2]?.trim() ?? "" }
    : { email: fromRaw };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  const result = (await res.json()) as { messageId?: string };
  return {
    accepted: [to],
    messageId: result.messageId ?? "",
    response: "brevo-api",
  };
};

export const sendEmail = async (
  to: string,
  subject: string,
  template: Templates,
  data: Record<string, string>,
) => {
  log.info({ to, subject, template }, "Sending email");
  try {
    const EmailTemplate = emailTemplates[template];

    const html = await render(<EmailTemplate {...data} />, { pretty: true });

    const options = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const response = process.env.BREVO_API_KEY
      ? await sendViaBrevoApi(to, subject, html)
      : await transporter.sendMail(options);

    if (!response.accepted.length) {
      throw new Error(`Failed to send email: ${response.response}`);
    }

    log.info({ to, subject, template, messageId: response.messageId }, "Email sent");
    return response;
  } catch (error) {
    log.error({ err: error, to, from: process.env.EMAIL_FROM, subject, template }, "Email sending failed");
    throw error;
  }
};
