import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import type { Placement } from "tippy.js";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";

interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  placement?: Placement;
  delay?: number | [number, number];
}

export function Tooltip({
  children,
  content,
  placement = "bottom",
  delay = [500, 0],
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!triggerRef.current) return;

    if (!content) return;

    const container = document.createElement("div");
    const root = createRoot(container);
    rootRef.current = root;
    root.render(content);

    const instance = tippy(triggerRef.current, {
      content: container,
      placement,
      delay,
      interactive: false,
      theme: "tooltip",
      touch: false,
    });

    return () => {
      instance.destroy();
      rootRef.current?.unmount();
    };
  }, [content, placement, delay]);

  return (
    <div ref={triggerRef} className="inline-flex">
      {children}
    </div>
  );
}
