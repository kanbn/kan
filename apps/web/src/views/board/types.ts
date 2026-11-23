import type { BoardDetail } from "~/utils/boardCache";

export type BoardList = BoardDetail["lists"][number];

export type BoardCard = BoardList["cards"][number];
