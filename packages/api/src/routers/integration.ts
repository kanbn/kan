import { TRPCError } from "@trpc/server";

import * as integrationsRepo from "@kan/db/repository/integration.repo";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { env } from "next-runtime-env";

const urls = {
  trello: "https://api.trello.com/1/authorize"
}

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
  disconnect: protectedProcedure
    .meta({
      openapi: {
        summary: "Disconnect integration",
        method: "POST",
        path: "/integration/disconnect",
        description: "Disconnects an integration",
        tags: ["Integration"],
        protect: true,
      },
    })
    .input(z.object({ provider: z.enum(["trello"]) }))
    .output(z.object({}))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!user)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const integration = await integrationsRepo.getProviderForUser(
        ctx.db,
        user.id,
        input.provider,
      );

      if (!integration)
        throw new TRPCError({
          message: "Integration not found",
          code: "NOT_FOUND",
        });

      await integrationsRepo.deleteProviderForUser(ctx.db, user.id, input.provider);

      return {};
    }),
  getAuthorizationUrl: protectedProcedure
      .meta({
        openapi: {
          summary: "Get authorization URL for Trello",
          method: "GET",
          path: "/trello/authorize",
          description: "Retrieves the authorization URL for Trello",
          tags: ["Trello"],
          protect: true,
        },
      })
      .input(z.object({ provider: z.enum(["trello"]) }))
      .output(z.object({ url: z.string() }))
      .query(async ({ ctx, input }) => {
        if (input.provider === "trello") {
          const apiKey = process.env.TRELLO_APP_API_KEY;
    
          if (!apiKey)
            throw new TRPCError({
              message: "Trello API key not set in environment variables",
              code: "INTERNAL_SERVER_ERROR",
            });
    
          const user = ctx.user;
    
          if (!user)
            throw new TRPCError({
              message: "User not authenticated",
              code: "UNAUTHORIZED",
            });
    
          const integration = await integrationsRepo.getProviderForUser(
            ctx.db,
            user.id,
            input.provider,
          );
    
          if (integration)
            throw new TRPCError({
              message: "Trello integration already exists",
              code: "BAD_REQUEST",
            });
    
          const url = `${urls[input.provider]}?key=${apiKey}&expiration=never&response_type=token&scope=read&return_url=${env("NEXT_PUBLIC_BASE_URL")}/settings/trello/authorize&callback_method=fragment`;
    
          return { url };
        }

        throw new TRPCError({
          message: "Invalid provider",
          code: "BAD_REQUEST",
        });
      }),
});
