import { render } from "@react-email/render";
import nodemailer from "nodemailer";

import { cloudMailerClient } from "./cloudMailerClient";
import JoinWorkspaceTemplate from "./templates/join-workspace";
import MagicLinkTemplate from "./templates/magic-link";
import ResetPasswordTemplate from "./templates/reset-password";

type Templates = "MAGIC_LINK" | "JOIN_WORKSPACE" | "RESET_PASSWORD";

const emailTemplates: Record<Templates, React.FC> = {
  MAGIC_LINK: MagicLinkTemplate,
  JOIN_WORKSPACE: JoinWorkspaceTemplate,
  RESET_PASSWORD: ResetPasswordTemplate,
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE !== "false",
  ...(process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD && {
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    }),
});

export const sendEmail = async (
  to: string,
  subject: string,
  template: Templates,
  data: Record<string, string>,
) => {
  try {
    const EmailTemplate = emailTemplates[template];

    const html = await render(<EmailTemplate {...data} />, { pretty: true });

    const options = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    // if (cloudMailerClient) {
    //   const response = await cloudMailerClient.emails.send({
    //     ...options,
    //     body: html,
    //   });

    //   return response;
    // }

    const response = await transporter.sendMail(options);

    if (!response.accepted.length) {
      throw new Error(`Failed to send email: ${response.response}`);
    }

    return response;
  } catch (error) {
    console.error("Email sending failed:", {
      to,
      from: process.env.EMAIL_FROM,
      subject,
      template,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
