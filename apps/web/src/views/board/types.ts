import type { BoardDetail } from "~/utils/boardCache";

export type BoardData = BoardDetail;

export type BoardList = BoardData["lists"][number];

export type BoardCard = BoardList["cards"][number];
