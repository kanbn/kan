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

transporter.verify(function (error, success) {
  if (error) {
    log.error({ err: error, host: process.env.SMTP_HOST, port: process.env.SMTP_PORT }, "SMTP Transporter verification failed");
  } else {
    log.info({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT }, "SMTP Transporter is ready to send emails");
  }
});

export const sendEmail = async (
  to: string,
  subject: string,
  template: Templates,
  data: Record<string, string>,
) => {
  log.info({ to, subject, template }, "Attempting to send email");
  try {
    const EmailTemplate = emailTemplates[template];

    log.debug({ template }, "Rendering email template");
    const html = await render(<EmailTemplate {...data} />, { pretty: true });

    const from = process.env.EMAIL_FROM;
    if (!from) {
      log.warn("EMAIL_FROM environment variable is not defined");
    }

    const options = {
      from,
      to,
      subject,
      html,
    };

    log.debug({ from, to, subject }, "Calling transporter.sendMail");
    const response = await transporter.sendMail(options);
    log.debug({ messageId: response.messageId, accepted: response.accepted, rejected: response.rejected }, "Nodemailer response received");

    if (!response.accepted.length) {
      log.error({ response }, "Email was not accepted by SMTP server");
      throw new Error(`Failed to send email: ${response.response}`);
    }

    log.info({ to, subject, template, messageId: response.messageId }, "Email sent successfully");
    return response;
  } catch (error) {
    log.error({ err: error, to, from: process.env.EMAIL_FROM, subject, template }, "Email sending process failed");
    throw error;
  }
};
