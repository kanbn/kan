import { randomUUID } from "crypto";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { NextApiRequest } from "next";

import type { dbClient } from "@kan/db/client";
import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

const log = createLogger("api");

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null | undefined;
  stripeCustomerId?: string | null | undefined;
}

const createAuthWithHeaders = (
  auth: ReturnType<typeof initAuth>,
  headers: Headers,
) => {
  return {
    api: {
      getSession: () => auth.api.getSession({ headers }),
      signInMagicLink: (input: { email: string; callbackURL: string }) =>
        auth.api.signInMagicLink({
          headers,
          body: { email: input.email, callbackURL: input.callbackURL },
        }),
      listActiveSubscriptions: (input: { workspacePublicId: string }) =>
        auth.api.listActiveSubscriptions({
          headers,
          query: { referenceId: input.workspacePublicId },
        }),
      setPassword: (input: { newPassword: string }) =>
        auth.api.setPassword({
          headers,
          body: { newPassword: input.newPassword },
        }),
    },
  };
};

interface CreateContextOptions {
  user: User | null | undefined;
  db: dbClient;
  auth: ReturnType<typeof createAuthWithHeaders>;
  headers: Headers;
  transport?: "trpc" | "rest";
}

export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    user: opts.user,
    db: opts.db,
    auth: opts.auth,
    headers: opts.headers,
    transport: opts.transport ?? "trpc",
    requestId: randomUUID(),
  };
};

const db = createDrizzleClient();
const baseAuth = initAuth(db);

export const createTRPCContext = async ({ req }: CreateNextContextOptions) => {
  const headers = new Headers(req.headers as Record<string, string>);
  const auth = createAuthWithHeaders(baseAuth, headers);

  const session = await auth.api.getSession();

  return createInnerTRPCContext({
    db,
    user: session?.user,
    auth,
    headers,
    transport: "trpc",
  });
};

export const createNextApiContext = async (req: NextApiRequest) => {
  const headers = new Headers(req.headers as Record<string, string>);
  const auth = createAuthWithHeaders(baseAuth, headers);

  const session = await auth.api.getSession();

  return createInnerTRPCContext({
    db,
    user: session?.user,
    auth,
    headers,
    transport: "trpc",
  });
};

export const createRESTContext = async ({ req }: CreateNextContextOptions) => {
  const headers = new Headers(req.headers as Record<string, string>);
  const auth = createAuthWithHeaders(baseAuth, headers);

  let session;
  try {
    session = await auth.api.getSession();
  } catch (error) {
    log.warn(
      { err: error },
      "Failed to get session, treating as unauthenticated",
    );
  }

  return createInnerTRPCContext({
    db,
    user: session?.user,
    auth,
    headers,
    transport: "rest",
  });
};
