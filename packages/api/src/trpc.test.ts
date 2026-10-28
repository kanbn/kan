import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const info = vi.fn();
const error = vi.fn();
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ info, error })),
}));

const { createTRPCRouter, publicProcedure } = await import("./trpc.js");

const router = createTRPCRouter({
  save: publicProcedure
    .input(z.object({ token: z.string(), name: z.string() }))
    .mutation(({ input }) => input.token),
});

describe("logging middleware", () => {
  it("redacts secrets in the logged input and passes the original to the procedure", async () => {
    const caller = router.createCaller({} as never);

    const result = await caller.save({ token: "ghp_secret", name: "Board" });

    expect(result).toBe("ghp_secret");
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { token: "[REDACTED]", name: "Board" },
      }),
      "tRPC OK",
    );
  });
});
