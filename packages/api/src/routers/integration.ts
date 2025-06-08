import { TRPCError } from "@trpc/server";

import * as integrationsRepo from "@kan/db/repository/integration.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const integrationRouter = createTRPCRouter({
  providers: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    if (!user)
      throw new TRPCError({
        message: "User not authenticated",
        code: "UNAUTHORIZED",
      });

    const integrations = await integrationsRepo.getProvidersForUser(
      ctx.db,
      user.id,
    );

    return integrations;
  }),
});
