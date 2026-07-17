import Link from "next/link";
import { t } from "@lingui/core/macro";
import { HiMinusCircle } from "react-icons/hi2";

interface Blocker {
  publicId: string;
  title: string;
  cardNumber: number | null;
  isDone?: boolean;
}

interface BlockingIndicatorProps {
  blocking: Blocker[];
  cardPrefix?: string | null;
}

// Read-only indicator shown below a card's title listing the OTHER cards that
// this card is blocking (the union of direct card-to-card blocking and cards
// whose checklist items are blocked by this card).
export default function BlockingIndicator({
  blocking,
  cardPrefix,
}: BlockingIndicatorProps) {
  if (blocking.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        <HiMinusCircle className="h-3.5 w-3.5" />
        <span>{t`Blocking`}</span>
      </div>
      {blocking.map((blockedCard) => (
        <Link
          key={blockedCard.publicId}
          href={`/cards/${blockedCard.publicId}`}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:underline ${
            blockedCard.isDone
              ? "bg-gray-100 text-gray-600 line-through opacity-60 dark:bg-gray-800 dark:text-gray-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          } `}
        >
          {blockedCard.cardNumber != null && cardPrefix
            ? `${cardPrefix}-${blockedCard.cardNumber}`
            : blockedCard.title}
        </Link>
      ))}
    </div>
  );
}
