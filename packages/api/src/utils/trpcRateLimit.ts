import type { TRPCDefaultErrorShape, TRPCRootConfig } from "@trpc/server";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTRPCErrorShape, TRPCError } from "@trpc/server";

const getRequestPaths = (req: NextApiRequest): (string | undefined)[] => {
  const path = req.query.trpc;

  if (Array.isArray(path)) return path;
  if (typeof path === "string") return path.split(",");
  return [undefined];
};

interface RateLimitRootTypes {
  ctx: object;
  meta: object;
  errorShape: TRPCDefaultErrorShape;
  transformer: boolean;
}

export const createTRPCRateLimitResponder =
  <TRoot extends RateLimitRootTypes>(config: TRPCRootConfig<TRoot>) =>
  (req: NextApiRequest, res: NextApiResponse, message: string) => {
    const responses = getRequestPaths(req).map((path) => {
      const error = new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message,
      });
      const shape = getTRPCErrorShape({
        config,
        error,
        type: "unknown",
        path,
        input: undefined,
        ctx: undefined,
      });

      const serializedShape: unknown =
        config.transformer.output.serialize(shape);
      return { error: serializedShape };
    });

    const response = req.query.batch === "1" ? responses : responses[0];
    return res.status(429).json(response);
  };
