import Image from "next/image";
import { t } from "@lingui/core/macro";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  HiCalendarDays,
  HiEllipsisHorizontal,
  HiMagnifyingGlass,
  HiOutlineEye,
  HiOutlinePlusSmall,
  HiOutlineViewColumns,
} from "react-icons/hi2";
import { IoFilterOutline } from "react-icons/io5";
import { SiClaude } from "react-icons/si";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";

import PatternedBackground from "~/components/PatternedBackground";
import Card from "~/views/board/components/Card";
import { getHeroLists, HERO_STEPS } from "./hero-board-data";
import { NAV_ICON_PATHS } from "./hero-board-icons";

// Laid out at real app size, then scaled to fit, like a screenshot.
const CANVAS_WIDTH = 1560;
const CANVAS_HEIGHT = 870;
const MIN_SCALE = 0.55;

const STEP_MS = 1800;
// Extra ticks on the finished board before it starts again
const HOLD_STEPS = 2;

const BUTTON =
  "inline-flex items-center gap-2 rounded-md border border-light-600 bg-light-50 px-3 py-2 text-xs font-semibold text-light-1000 shadow-xs dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000";

const PersonIcon = ({ person }: { person: string }) =>
  person === "claude" ? (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d97757]">
      <SiClaude className="h-3.5 w-3.5" />
    </span>
  ) : (
    <Image
      src={`/hero/${person}.jpg`}
      alt=""
      width={24}
      height={24}
      unoptimized
      draggable={false}
      className="rounded-full"
    />
  );

// Measured inside the canvas, so its scale and the page's scroll don't matter.
const measureCards = (canvas: HTMLElement) => {
  const origin = canvas.getBoundingClientRect();
  const ratio = origin.width / CANVAS_WIDTH;
  const cards = [...canvas.querySelectorAll<HTMLElement>("[data-hero-card]")];
  return new Map(
    cards.map((el) => {
      const rect = el.getBoundingClientRect();
      return [
        el.dataset.heroCard ?? "",
        {
          el,
          x: (rect.left - origin.left) / ratio,
          y: (rect.top - origin.top) / ratio,
        },
      ];
    }),
  );
};

export default function HeroBoard() {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const previous = useRef<ReturnType<typeof measureCards> | null>(null);
  const isPaused = useRef(false);
  const [scale, setScale] = useState(0.675);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.max(MIN_SCALE, el.clientWidth / CANVAS_WIDTH)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = frame.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let isVisible = false;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = !!entry?.isIntersecting;
    });
    observer.observe(el);
    const interval = setInterval(() => {
      if (!canvas.current || !isVisible || isPaused.current || document.hidden)
        return;
      previous.current = measureCards(canvas.current);
      setStep((prev) => (prev + 1) % (HERO_STEPS.length + HOLD_STEPS + 1));
    }, STEP_MS);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Slides each card from where it was before the step.
  useLayoutEffect(() => {
    if (!canvas.current || !previous.current) return;
    const before = previous.current;
    previous.current = null;
    measureCards(canvas.current).forEach(({ el, x, y }, id) => {
      const prev = before.get(id);
      if (!prev) return;
      const dx = prev.x - x;
      const dy = prev.y - y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      const changesList = Math.abs(dx) >= 1;
      el.style.zIndex = changesList ? "20" : "";
      const animation = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          ...(changesList
            ? [
                {
                  transform: `translate(${dx / 2}px, ${dy / 2}px) rotate(2deg)`,
                },
              ]
            : []),
          { transform: "none" },
        ],
        { duration: 700, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
      animation.onfinish = () => {
        el.style.zIndex = "";
      };
    });
  }, [step]);

  return (
    <div
      ref={frame}
      role="img"
      aria-label={t`An example Kan board`}
      onMouseEnter={() => {
        isPaused.current = true;
      }}
      onMouseLeave={() => {
        isPaused.current = false;
      }}
      className="relative cursor-default overflow-hidden bg-light-100 select-none dark:bg-dark-100"
      style={{ height: CANVAS_HEIGHT * scale }}
    >
      <div
        ref={canvas}
        className="absolute top-0 left-0 flex origin-top-left p-3"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <Sidebar />

        <div className="relative flex-1 overflow-hidden rounded-lg border border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50">
          <PatternedBackground />
          <div className="relative flex items-center justify-between p-8">
            <p className="text-base leading-[2.3rem] font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
              Launch week
            </p>
            <div className="flex items-center gap-2">
              <span className={BUTTON}>
                <HiOutlineEye className="h-4 w-4" />
                Visibility
              </span>
              <span className="flex items-center gap-0.5 rounded-md border border-light-600 bg-light-50 p-0.5 text-xs font-semibold dark:border-dark-600 dark:bg-dark-50">
                <span className="flex items-center gap-2 rounded-[4px] bg-light-200 px-2.5 py-1.5 text-light-1000 dark:bg-dark-200 dark:text-dark-1000">
                  <HiOutlineViewColumns className="h-4 w-4" />
                  Lists
                </span>
                <span className="flex items-center gap-2 px-2.5 py-1.5 text-light-900 dark:text-dark-900">
                  <HiCalendarDays className="h-4 w-4" />
                  Calendar
                </span>
              </span>
              <span className={BUTTON}>
                <IoFilterOutline className="h-4 w-4" />
                Filter
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-light-1000 px-3 py-2 text-xs font-semibold text-light-50 dark:bg-dark-1000 dark:text-dark-50">
                <HiOutlinePlusSmall className="h-4 w-4" />
                New list
              </span>
              <HiEllipsisHorizontal className="ml-2 h-5 w-5 text-light-900 dark:text-dark-900" />
            </div>
          </div>

          <div className="relative flex items-start pl-8">
            {getHeroLists(step).map((list) => (
              <div
                key={list.id}
                className="mr-5 w-[18rem] shrink-0 rounded-lg bg-light-200 px-2 py-2 dark:bg-dark-100"
              >
                <div className="mb-1 flex items-center px-3 py-1">
                  <span className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
                    {list.name}
                  </span>
                  <span className="ml-3 text-[11px] text-light-800 tabular-nums dark:text-dark-800">
                    {list.cards.length}
                  </span>
                </div>
                {list.cards.map((card) => (
                  <div
                    key={card.id}
                    data-hero-card={card.id}
                    className="relative mb-2"
                  >
                    <Card
                      title={card.title}
                      ticketNumber={card.id}
                      labels={[card.label]}
                      members={card.members.map((member) => ({
                        ...member,
                        icon: <PersonIcon person={member.publicId} />,
                      }))}
                      summary={card.summary}
                      checklists={[]}
                      description={null}
                      comments={[]}
                      attachments={[]}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-1 px-2.5 py-1 text-xs text-light-800 dark:text-dark-800">
                  <HiOutlinePlusSmall className="h-3.5 w-3.5" />
                  Add card
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// The app's collapsed sidebar
const Sidebar = () => (
  <div className="flex w-12 shrink-0 flex-col items-center justify-between pr-3">
    <div className="w-9">
      <div className="flex h-[45px] items-center justify-center pb-3">
        <TbLayoutSidebarLeftExpand
          size={18}
          className="text-light-900 dark:text-dark-900"
        />
      </div>
      <div className="mx-1 mb-4 border-b border-light-300 dark:border-dark-400" />
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-light-200 text-light-1000 dark:bg-dark-200 dark:text-dark-1000">
        <HiMagnifyingGlass className="h-4 w-4" />
      </div>
      <div className="mb-[18px] flex h-9 w-9 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-700 text-xs leading-none font-bold text-white">
          L
        </span>
      </div>
      <div className="space-y-1">
        {NAV_ICON_PATHS.map((path, index) => (
          <div
            key={index}
            className={`flex h-[34px] items-center justify-center rounded-md ${index === 0 ? "bg-light-200 dark:bg-dark-200" : ""}`}
          >
            <svg
              viewBox="0 0 500 500"
              className="h-[18px] w-[18px] fill-[#111] dark:fill-white"
            >
              <path d={path} />
            </svg>
          </div>
        ))}
      </div>
    </div>
    <span className="mb-1.5">
      <PersonIcon person="designer" />
    </span>
  </div>
);
