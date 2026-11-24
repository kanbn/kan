import { EmailLayout } from "./layout";

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
  <EmailLayout
    preview={`${commenterName} mentioned you in a comment on ${cardTitle}`}
    title={`${commenterName} mentioned you`}
    buttonLabel="View card"
    buttonHref={cardUrl}
  >
    In a comment on <strong>{cardTitle}</strong> in the board{" "}
    <strong>{boardName}</strong>.
  </EmailLayout>
);

export default MentionTemplate;
