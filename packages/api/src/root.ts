import { attachmentRouter } from "./routers/attachment";
import { boardRouter } from "./routers/board";
import { cardRouter } from "./routers/card";
import { checklistRouter } from "./routers/checklist";
import { dashboardRouter } from "./routers/dashboard";
import { feedbackRouter } from "./routers/feedback";
import { googleCalendarRouter } from "./routers/googleCalendar";
import { healthRouter } from "./routers/health";
import { importRouter } from "./routers/import";
import { integrationRouter } from "./routers/integration";
import { labelRouter } from "./routers/label";
import { listRouter } from "./routers/list";
import { memberRouter } from "./routers/member";
import { notificationRouter } from "./routers/notification";
import { permissionRouter } from "./routers/permission";
import { productivityRouter } from "./routers/productivity";
import { userRouter } from "./routers/user";
import { webhookRouter } from "./routers/webhook";
import { workspaceRouter } from "./routers/workspace";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  attachment: attachmentRouter,
  board: boardRouter,
  card: cardRouter,
  checklist: checklistRouter,
  dashboard: dashboardRouter,
  feedback: feedbackRouter,
  googleCalendar: googleCalendarRouter,
  health: healthRouter,
  label: labelRouter,
  list: listRouter,
  member: memberRouter,
  import: importRouter,
  notification: notificationRouter,
  permission: permissionRouter,
  productivity: productivityRouter,
  user: userRouter,
  webhook: webhookRouter,
  workspace: workspaceRouter,
  integration: integrationRouter,
});

export type AppRouter = typeof appRouter;
