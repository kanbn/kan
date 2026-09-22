import type { RouterOutputs } from "~/utils/api";

export type BoardData = RouterOutputs["board"]["byId"];

export type BoardList = BoardData["lists"][number];

export type BoardCard = BoardList["cards"][number];
