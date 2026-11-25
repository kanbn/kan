import { EmailLayout } from "./layout";

export const JoinWorkspaceTemplate = ({
  magicLoginUrl,
  inviterName,
  workspaceName,
}: {
  magicLoginUrl?: string;
  inviterName?: string;
  workspaceName?: string;
}) => {
  const workspace = workspaceName || "a workspace";

  return (
    <EmailLayout
      preview={`You've been invited to join ${workspace}`}
      title={
        inviterName
          ? `${inviterName} invited you to join ${workspace}`
          : `You've been invited to join ${workspace}`
      }
      buttonLabel={`Join ${workspaceName || "workspace"}`}
      buttonHref={magicLoginUrl}
      note="If you don't want to join this workspace, you can safely ignore this email."
    >
      Click the button below to add this workspace to your account.
    </EmailLayout>
  );
};

export default JoinWorkspaceTemplate;
