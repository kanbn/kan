import type { BoardCard, BoardData } from "../types";
import Card from "./Card";

interface CardPreviewProps {
  card: BoardCard;
  cardPrefix: string;
  customFields: BoardData["customFields"];
}

export default function CardPreview({
  card,
  cardPrefix,
  customFields,
}: CardPreviewProps) {
  return (
    <Card
      title={card.title}
      ticketNumber={
        card.cardNumber != null ? `${cardPrefix}-${card.cardNumber}` : null
      }
      labels={card.labels}
      members={card.members}
      checklists={card.checklists}
      description={card.description ?? null}
      comments={card.comments}
      attachments={card.attachments}
      dueDate={card.dueDate ?? null}
      customFields={customFields}
      customFieldValues={card.customFieldValues}
    />
  );
}
