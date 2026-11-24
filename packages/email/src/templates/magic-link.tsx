import { EmailLayout } from "./layout";

export const MagicLinkTemplate = ({
  magicLoginUrl,
}: {
  magicLoginUrl?: string;
}) => (
  <EmailLayout
    preview="Use this link to sign in"
    title="Sign in to your account"
    buttonLabel="Sign in"
    buttonHref={magicLoginUrl}
    note="If you didn't try to sign in, you can safely ignore this email."
  >
    Click the button below to sign in. You don&apos;t need a password.
  </EmailLayout>
);

export default MagicLinkTemplate;
