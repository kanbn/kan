import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import type { Placement, Instance as TippyInstance } from "tippy.js";
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
  const tippyRef = useRef<TippyInstance | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (!triggerRef.current) return;

    const container = document.createElement("div");
    const root = createRoot(container);
    rootRef.current = root;

    const instance = tippy(triggerRef.current, {
      content: container,
      placement,
      delay,
      interactive: false,
      theme: "tooltip",
      touch: false,
    });
    tippyRef.current = instance;

    if (contentRef.current) {
      root.render(contentRef.current);
    } else {
      instance.disable();
    }

    return () => {
      instance.destroy();
      tippyRef.current = null;
      root.unmount();
      rootRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, delay]);

  useEffect(() => {
    if (!content) {
      tippyRef.current?.disable();
      return;
    }
    if (tippyRef.current) {
      tippyRef.current.enable();
      rootRef.current?.render(content);
    }
  }, [content]);

  return (
    <div ref={triggerRef} className="inline-flex">
      {children}
    </div>
  );
}
