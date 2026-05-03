import type { IconType } from "react-icons";
import { t } from "@lingui/core/macro";
import {
  HiOutlineBeaker,
  HiOutlineBolt,
  HiOutlineBugAnt,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCodeBracket,
  HiOutlineLightBulb,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { CardType } from "@kan/shared/constants";

const cardTypeStyles: Record<CardType, string> = {
  spike:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  research:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  coding:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  analyze:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  bug: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  feedback:
    "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30",
  suggestion:
    "bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-500/10 dark:text-lime-300 dark:ring-lime-500/30",
};

const cardTypeIcons: Record<CardType, IconType> = {
  spike: HiOutlineBolt,
  research: HiOutlineBeaker,
  coding: HiOutlineCodeBracket,
  analyze: HiOutlineChartBarSquare,
  bug: HiOutlineBugAnt,
  feedback: HiOutlineChatBubbleLeftRight,
  suggestion: HiOutlineLightBulb,
};

export const getCardTypeLabel = (type: CardType) => {
  const labels: Record<CardType, string> = {
    spike: t`Spike`,
    research: t`Research`,
    coding: t`Coding`,
    analyze: t`Analyze`,
    bug: t`Bug`,
    feedback: t`Feedback`,
    suggestion: t`Suggestion`,
  };

  return labels[type];
};

export const CardTypeIcon = ({
  type,
  className,
}: {
  type: CardType;
  className?: string;
}) => {
  const Icon = cardTypeIcons[type];

  return <Icon className={twMerge("h-3.5 w-3.5", className)} />;
};

const CardTypeBadge = ({
  type,
  showLabel = true,
  size = "md",
  className,
}: {
  type: CardType;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}) => (
  <span
    className={twMerge(
      "inline-flex w-fit items-center rounded-full font-medium ring-1 ring-inset",
      size === "sm"
        ? "gap-x-1 px-1.5 py-0.5 text-[10px]"
        : "gap-x-1.5 px-2 py-1 text-[11px]",
      cardTypeStyles[type],
      className,
    )}
  >
    <CardTypeIcon type={type} className={size === "sm" ? "h-3 w-3" : ""} />
    {showLabel && <span>{getCardTypeLabel(type)}</span>}
  </span>
);

export default CardTypeBadge;
