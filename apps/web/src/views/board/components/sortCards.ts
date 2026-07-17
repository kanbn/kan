import type { SortValue } from "./Sort";

interface SortableCard {
  publicId: string;
  index: number;
  title: string;
  isDone?: boolean;
  dueDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export function sortCards<T extends SortableCard>(
  cards: T[],
  sort: SortValue,
): T[] {
  if (sort === "manual") return cards;

  const sortByKey = (input: T[]): T[] => {
    const [field, dir] = sort.split("-") as [
      "updated" | "created" | "title" | "dueDate",
      "asc" | "desc",
    ];

    const factor = dir === "asc" ? 1 : -1;

    return [...input].sort((a, b) => {
      if (field === "title") {
        return factor * a.title.localeCompare(b.title);
      }

      let av: number | null;
      let bv: number | null;

      switch (field) {
        case "updated":
          av = a.updatedAt ? a.updatedAt.getTime() : null;
          bv = b.updatedAt ? b.updatedAt.getTime() : null;
          break;
        case "created":
          av = a.createdAt ? a.createdAt.getTime() : null;
          bv = b.createdAt ? b.createdAt.getTime() : null;
          break;
        case "dueDate":
          av = a.dueDate ? a.dueDate.getTime() : null;
          bv = b.dueDate ? b.dueDate.getTime() : null;
          break;
      }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      return factor * (av - bv);
    });
  };

  const notDone = cards.filter((card) => !card.isDone);
  const done = cards.filter((card) => card.isDone);

  return [...sortByKey(notDone), ...sortByKey(done)];
}
