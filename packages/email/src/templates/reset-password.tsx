import { EmailLayout } from "./layout";

export const ResetPasswordTemplate = ({
  resetPasswordUrl,
}: {
  resetPasswordUrl?: string;
}) => (
  <EmailLayout
    preview="Choose a new password"
    title="Reset your password"
    buttonLabel="Reset password"
    buttonHref={resetPasswordUrl}
    note="If you didn't try to reset your password, you can safely ignore this email."
  >
    Click the button below to choose a new password.
  </EmailLayout>
);

export default ResetPasswordTemplate;
