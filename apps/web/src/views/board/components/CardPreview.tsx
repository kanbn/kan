import type { BoardCard } from "../types";
import Card from "./Card";

interface CardPreviewProps {
  card: BoardCard;
  cardPrefix: string;
}

export default function CardPreview({ card, cardPrefix }: CardPreviewProps) {
  return (
    <Card
      title={card.title}
      ticketNumber={
        card.cardNumber != null ? `${cardPrefix}-${card.cardNumber}` : null
      }
      labels={card.labels}
      members={card.members}
      checklists={card.checklists ?? []}
      description={card.description ?? null}
      comments={card.comments ?? []}
      attachments={card.attachments}
      dueDate={card.dueDate ?? null}
    />
  );
}
