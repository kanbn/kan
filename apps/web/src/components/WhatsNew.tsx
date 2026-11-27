import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HiChevronLeft, HiChevronRight, HiXMark } from "react-icons/hi2";

import type { WhatsNewEntry } from "~/whats-new";
import Modal from "~/components/modal";
import { useModal } from "~/providers/modal";
import { whatsNew } from "~/whats-new";

const SEEN_KEY = "whatsNewSeen";
const SEEN_EVENT = `${SEEN_KEY}-change`;
const latest = whatsNew[0];

// Without storage, a dismissal only lasts until the next reload.
let seenFallback: string | null = null;

const getSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) ?? seenFallback;
  } catch {
    return seenFallback;
  }
};

const markSeen = () => {
  seenFallback = latest?.id ?? null;
  try {
    if (latest) localStorage.setItem(SEEN_KEY, latest.id);
  } catch {
    // seenFallback covers it.
  }
  window.dispatchEvent(new Event(SEEN_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(SEEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SEEN_EVENT, onChange);
  };
};

function Media({ entry }: { entry: WhatsNewEntry }) {
  const { resolvedTheme } = useTheme();
  if (!entry.media) return null;
  const src = resolvedTheme === "light" ? entry.media.light : entry.media.dark;
  return (
    <video
      key={src}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className="aspect-video w-full bg-light-200 object-cover dark:bg-dark-200"
    />
  );
}

const ordinal = new Intl.PluralRules("en-GB", { type: "ordinal" });
const suffix = { one: "st", two: "nd", few: "rd", other: "th" } as const;

// "25th Nov" in English, the locale's own short date otherwise.
function formatDate(date: string, locale: string) {
  const d = new Date(`${date}T12:00:00`);
  if (!locale.startsWith("en"))
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${day}${suffix[ordinal.select(day) as keyof typeof suffix]} ${month}`;
}

// Mounted only while the modal is open, so it always starts at the newest entry.
function WhatsNewEntries({ onOpen }: { onOpen: () => void }) {
  const { closeModal } = useModal();
  const { i18n } = useLingui();
  const [index, setIndex] = useState(0);
  const entry = whatsNew[index];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(onOpen, []);

  if (!entry) return null;
  const pageButton =
    "rounded p-0.5 hover:bg-light-200 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-dark-300";
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="grid grid-cols-3 items-center border-b border-light-300 px-3 py-1.5 text-[11px] text-light-900 dark:border-dark-300 dark:text-dark-900">
        <span>{formatDate(entry.date, i18n.locale)}</span>
        <div className="flex items-center justify-center gap-1 tabular-nums">
          <button
            type="button"
            aria-label={t`Newer`}
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className={pageButton}
          >
            <HiChevronLeft className="h-3 w-3" />
          </button>
          {index + 1} / {whatsNew.length}
          <button
            type="button"
            aria-label={t`Older`}
            disabled={index === whatsNew.length - 1}
            onClick={() => setIndex(index + 1)}
            className={pageButton}
          >
            <HiChevronRight className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          aria-label={t`Close`}
          onClick={closeModal}
          className={`justify-self-end ${pageButton}`}
        >
          <HiXMark className="h-3.5 w-3.5" />
        </button>
      </div>
      {entry.media && (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-lg border border-light-300 dark:border-dark-300">
            <Media entry={entry} />
          </div>
        </div>
      )}
      <div className="px-5 pt-4 pb-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">
          {entry.title}
        </h2>
        <p className="mt-1.5 text-sm text-light-950 dark:text-dark-950">
          {entry.body}
        </p>
        {entry.href && (
          <a
            href={entry.href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-light-900 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000"
          >
            {t`Learn more`}
          </a>
        )}
      </div>
    </div>
  );
}

export default function WhatsNew({ isCollapsed }: { isCollapsed: boolean }) {
  const { openModal, isOpen, modalContentType } = useModal();
  // The server snapshot counts everything as seen, so nothing flashes before hydration.
  const seen = useSyncExternalStore(subscribe, getSeen, () => latest?.id);
  const seenIndex = whatsNew.findIndex((e) => e.id === seen);
  // Entries above the last one seen; all of them if it's gone or never set.
  const unseenCount = seenIndex === -1 ? whatsNew.length : seenIndex;
  const unseen = unseenCount > 0;

  const isModalOpen = isOpen && modalContentType === "WHATS_NEW";

  return (
    <>
      {unseen && latest && isCollapsed && (
        <button
          type="button"
          title={t`What's new: ${latest.title}`}
          aria-label={t`What's new`}
          onClick={() => openModal("WHATS_NEW")}
          className="mb-2 hidden h-[34px] w-full items-center justify-center rounded-md hover:bg-light-200 md:flex dark:hover:bg-dark-200"
        >
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-light-300 px-1 text-[10px] font-medium text-light-900 tabular-nums dark:bg-dark-300 dark:text-dark-900">
            {unseenCount}
          </span>
        </button>
      )}
      {unseen && latest && (
        <div
          className={`group relative mb-2 overflow-hidden rounded-lg ${isCollapsed ? "md:hidden" : ""} border border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-100`}
        >
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => openModal("WHATS_NEW")}
          >
            <div className="px-3 py-2.5 pr-6">
              <p className="text-[11px] text-light-900 dark:text-dark-900">
                {t`What's new`}
              </p>
              <p className="mt-0.5 text-xs font-medium text-neutral-900 dark:text-dark-1000">
                {latest.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-light-900 dark:text-dark-900">
                {latest.body}
              </p>
            </div>
          </button>
          <button
            type="button"
            aria-label={t`Dismiss`}
            onClick={markSeen}
            className="absolute top-1.5 right-1.5 rounded-md bg-light-50/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 dark:bg-dark-100/80"
          >
            <HiXMark className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
          </button>
        </div>
      )}

      <Modal
        modalSize="md"
        className="max-w-[500px]"
        isVisible={isModalOpen}
        closeOnClickOutside
      >
        <WhatsNewEntries onOpen={markSeen} />
      </Modal>
    </>
  );
}
