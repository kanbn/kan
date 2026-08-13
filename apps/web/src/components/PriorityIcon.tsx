import React from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export type Priority = "urgent" | "high" | "medium" | "low";

interface PriorityIconProps {
  priority: Priority;
  className?: string;
  size?: number;
}

export function PriorityIcon({
  priority,
  className = "",
  size = 14,
}: PriorityIconProps) {
  if (priority === "urgent") {
    return <HiOutlineExclamationTriangle size={size} className={className} />;
  }

  // Signal bars: 3 bars total
  // low: 1 filled, 2 dim
  // medium: 2 filled, 1 dim
  // high: 3 filled, 0 dim
  const filledBars = priority === "high" ? 3 : priority === "medium" ? 2 : 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Bar 1 (Shortest / Low) */}
      <rect
        x="2"
        y="10"
        width="3"
        height="5"
        rx="1"
        className={filledBars >= 1 ? "opacity-100" : "opacity-25"}
      />
      {/* Bar 2 (Medium) */}
      <rect
        x="6.5"
        y="6.5"
        width="3"
        height="8.5"
        rx="1"
        className={filledBars >= 2 ? "opacity-100" : "opacity-25"}
      />
      {/* Bar 3 (Tallest / High) */}
      <rect
        x="11"
        y="3"
        width="3"
        height="12"
        rx="1"
        className={filledBars >= 3 ? "opacity-100" : "opacity-25"}
      />
    </svg>
  );
}

export default PriorityIcon;
