const LABELS = {
  marketing: { name: "Marketing", colourCode: "#ea580c" },
  product: { name: "Product", colourCode: "#4f46e5" },
  design: { name: "Design", colourCode: "#db2777" },
  docs: { name: "Docs", colourCode: "#0d9488" },
  bug: { name: "Bug", colourCode: "#dc2626" },
  partners: { name: "Partners", colourCode: "#ca8a04" },
};

type Person = "designer" | "engineer" | "marketer" | "manager" | "claude";

interface CardOptions {
  label: keyof typeof LABELS;
  people?: Person[];
  description?: boolean;
  comments?: boolean;
  attachments?: number;
  /** Completed and total checklist items. */
  checklist?: [number, number];
}

const card = (id: string, title: string, options: CardOptions) => ({
  id,
  title,
  label: LABELS[options.label],
  members: (options.people ?? []).map((person) => ({
    publicId: person,
    email: "",
    status: "active",
    user: null,
  })),
  summary: {
    hasDescription: options.description ?? false,
    hasComments: options.comments ?? false,
    attachmentCount: options.attachments ?? 0,
    completedChecklistItemCount: options.checklist?.[0] ?? 0,
    checklistItemCount: options.checklist?.[1] ?? 0,
  },
});

export interface HeroList {
  id: string;
  name: string;
  cards: ReturnType<typeof card>[];
}

export const HERO_LISTS: HeroList[] = [
  {
    id: "todo",
    name: "To do",
    cards: [
      card("LAU-14", "Draft the changelog", {
        label: "docs",
        people: ["claude"],
        description: true,
        checklist: [0, 3],
      }),
      card("LAU-16", "Record the demo video", {
        label: "marketing",
        people: ["marketer"],
        description: true,
        comments: true,
      }),
      card("LAU-17", "Line up launch partners", {
        label: "partners",
        people: ["manager"],
        checklist: [2, 6],
      }),
      card("LAU-19", "Update the help centre", {
        label: "docs",
        people: ["claude"],
        description: true,
      }),
      card("LAU-20", "Plan the launch day livestream", {
        people: ["manager"],
        label: "marketing",
        comments: true,
      }),
    ],
  },
  {
    id: "doing",
    name: "In progress",
    cards: [
      card("LAU-9", "Build the pricing page", {
        label: "product",
        people: ["designer", "engineer"],
        description: true,
        comments: true,
        checklist: [3, 4],
      }),
      card("LAU-12", "Fix signup on mobile", {
        label: "bug",
        people: ["engineer"],
        description: true,
        attachments: 1,
      }),
      card("LAU-11", "Write the launch post", {
        label: "marketing",
        people: ["marketer"],
        description: true,
        comments: true,
      }),
    ],
  },
  {
    id: "review",
    name: "In review",
    cards: [
      card("LAU-7", "Onboarding emails", {
        label: "product",
        people: ["manager"],
        description: true,
        checklist: [5, 5],
      }),
      card("LAU-8", "Homepage copy", {
        label: "marketing",
        people: ["marketer", "claude"],
        comments: true,
      }),
    ],
  },
  {
    id: "done",
    name: "Done",
    cards: [
      card("LAU-5", "Design the launch graphics", {
        label: "design",
        people: ["designer"],
        attachments: 4,
      }),
      card("LAU-3", "Finalise pricing", {
        label: "product",
        people: ["manager"],
        description: true,
        comments: true,
      }),
      card("LAU-2", "Triage beta feedback", {
        label: "bug",
        people: ["claude"],
        checklist: [12, 12],
      }),
      card("LAU-1", "Pick a launch date", {
        label: "marketing",
        people: ["marketer"],
        description: true,
      }),
    ],
  },
];

type HeroStep =
  | { type: "tick"; cardId: string }
  | { type: "move"; cardId: string; listId: string };

export const HERO_STEPS: HeroStep[] = [
  { type: "move", cardId: "LAU-14", listId: "doing" },
  { type: "tick", cardId: "LAU-14" },
  { type: "tick", cardId: "LAU-14" },
  { type: "tick", cardId: "LAU-14" },
  { type: "move", cardId: "LAU-14", listId: "review" },
  { type: "tick", cardId: "LAU-9" },
  { type: "move", cardId: "LAU-9", listId: "review" },
  { type: "move", cardId: "LAU-14", listId: "done" },
  { type: "move", cardId: "LAU-16", listId: "doing" },
  { type: "tick", cardId: "LAU-17" },
];

const applyStep = (lists: HeroList[], step: HeroStep): HeroList[] => {
  if (step.type === "tick")
    return lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) =>
        card.id === step.cardId
          ? {
              ...card,
              summary: {
                ...card.summary,
                completedChecklistItemCount:
                  card.summary.completedChecklistItemCount + 1,
              },
            }
          : card,
      ),
    }));

  const moved = lists
    .flatMap((list) => list.cards)
    .filter(({ id }) => id === step.cardId);
  return lists.map((list) => {
    const cards = list.cards.filter(({ id }) => id !== step.cardId);
    return {
      ...list,
      cards: list.id === step.listId ? [...moved, ...cards] : cards,
    };
  });
};

/** The board after the first `count` steps. */
export const getHeroLists = (count: number) =>
  HERO_STEPS.slice(0, count).reduce(applyStep, HERO_LISTS);
