// Newest first. Media lives in public/whats-new: 16:9 mp4 clips in both themes,
// played as a muted loop.
export interface WhatsNewEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  media?: { light: string; dark: string };
  href?: string;
}

export const whatsNew: WhatsNewEntry[] = [
  {
    id: "board-labels",
    date: "2026-11-27",
    title: "Board labels",
    body: "Group boards with labels like Client or Internal, then filter the boards page by them from the new Filters menu.",
    media: {
      light: "/whats-new/board-labels-light.mp4",
      dark: "/whats-new/board-labels-dark.mp4",
    },
  },
  {
    id: "live-updates",
    date: "2026-11-27",
    title: "Live updates",
    body: "Boards, the calendar and card pages now update as teammates and agents make changes. No more refreshing to see what's changed.",
    media: {
      light: "/whats-new/live-updates-light.mp4",
      dark: "/whats-new/live-updates-dark.mp4",
    },
  },
  {
    id: "archive-cards",
    date: "2026-11-25",
    title: "Archive cards",
    body: "Archive finished cards to keep your lists tidy. Find them again under Archived cards in the board menu, and restore them any time.",
    media: {
      light: "/whats-new/archive-cards-light.mp4",
      dark: "/whats-new/archive-cards-dark.mp4",
    },
  },
  {
    id: "quick-actions",
    date: "2026-11-25",
    title: "Card quick actions",
    body: "Right-click any card to change its labels, members, due date or list, or to copy, duplicate, archive or delete it.",
    media: {
      light: "/whats-new/quick-actions-light.mp4",
      dark: "/whats-new/quick-actions-dark.mp4",
    },
  },
];
