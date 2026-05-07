import { twMerge } from "tailwind-merge";

export type WipState = "normal" | "warning" | "danger";

export const normalizeWipLimit = (
  wipLimit?: number | null,
): number | null => {
  if (!wipLimit || wipLimit <= 0) return null;

  return wipLimit;
};

export const getWipState = (
  cardCount: number,
  wipLimit?: number | null,
): WipState => {
  const normalizedWipLimit = normalizeWipLimit(wipLimit);

  if (!normalizedWipLimit) return "normal";
  if (cardCount >= normalizedWipLimit * 1.5) return "danger";
  if (cardCount > normalizedWipLimit) return "warning";

  return "normal";
};

const stateStyles: Record<
  WipState,
  {
    container: string;
    badge: string;
    progressTrack: string;
    progressFill: string;
  }
> = {
  normal: {
    container: "text-light-950 dark:text-dark-950",
    badge:
      "bg-light-200/80 text-light-1000 dark:bg-dark-200 dark:text-dark-1000",
    progressTrack: "bg-light-400/70 dark:bg-dark-300",
    progressFill: "bg-light-900 dark:bg-dark-900",
  },
  warning: {
    container: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    progressTrack: "bg-amber-100 dark:bg-amber-500/10",
    progressFill: "bg-amber-500",
  },
  danger: {
    container: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    progressTrack: "bg-red-100 dark:bg-red-500/10",
    progressFill: "bg-red-500",
  },
};

export function ListWipSummary({
  cardCount,
  wipLimit,
  className,
}: {
  cardCount: number;
  wipLimit?: number | null;
  className?: string;
}) {
  const normalizedWipLimit = normalizeWipLimit(wipLimit);
  const state = getWipState(cardCount, normalizedWipLimit);
  const styles = stateStyles[state];
  const progress = normalizedWipLimit
    ? Math.min((cardCount / normalizedWipLimit) * 100, 100)
    : 0;

  return (
    <div
      className={twMerge(
        "flex items-center gap-2 text-xs font-medium transition-colors duration-200",
        styles.container,
        className,
      )}
    >
      <span
        className={twMerge(
          "inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-2 py-0.5 transition-colors duration-200",
          styles.badge,
        )}
      >
        {normalizedWipLimit ? `${cardCount}/${normalizedWipLimit}` : cardCount}
      </span>

      {normalizedWipLimit ? (
        <div
          className={twMerge(
            "h-1.5 flex-1 overflow-hidden rounded-full transition-colors duration-200",
            styles.progressTrack,
          )}
        >
          <div
            className={twMerge(
              "h-full rounded-full transition-all duration-200",
              styles.progressFill,
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
