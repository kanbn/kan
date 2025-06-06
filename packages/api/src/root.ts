import { boardRouter } from "./routers/board";
import { cardRouter } from "./routers/card";
import { feedbackRouter } from "./routers/feedback";
import { importRouter } from "./routers/import";
import { labelRouter } from "./routers/label";
import { listRouter } from "./routers/list";
import { memberRouter } from "./routers/member";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace";
import { trelloRouter } from "./routers/trello";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  board: boardRouter,
  card: cardRouter,
  feedback: feedbackRouter,
  label: labelRouter,
  list: listRouter,
  member: memberRouter,
  import: importRouter,
  user: userRouter,
  workspace: workspaceRouter,
  trello: trelloRouter,
});

export type AppRouter = typeof appRouter;
