import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import { OptionalAuthGuard } from "../../../common/guards/optional-auth.guard.js";
import * as sessionUtil from "../../../common/session.util.js";
import { CardController, CardReadController } from "../card.controller.js";
import { CreateCardSchema } from "../dto/card.dto.js";

const guardsOf = (target: object) =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

const contextFor = (request: object) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as never;

describe("card controllers", () => {
  it("require auth for writes and optional auth for reads", () => {
    expect(guardsOf(CardController)).toContain(AuthGuard);
    expect(guardsOf(CardReadController)).toEqual([OptionalAuthGuard]);
  });
});

describe("OptionalAuthGuard", () => {
  it("lets anonymous requests through without a user", async () => {
    vi.spyOn(sessionUtil, "resolveUserFromHeaders").mockResolvedValue({
      user: null,
    });
    const request: { headers: object; user?: unknown } = { headers: {} };

    expect(await new OptionalAuthGuard().canActivate(contextFor(request))).toBe(
      true,
    );
    expect(request.user).toBeUndefined();
  });

  it("attaches the user when the request is authenticated", async () => {
    const user = { id: "user_1" };
    vi.spyOn(sessionUtil, "resolveUserFromHeaders").mockResolvedValue({
      user,
    } as never);
    const request: { headers: object; user?: unknown } = { headers: {} };

    await new OptionalAuthGuard().canActivate(contextFor(request));

    expect(request.user).toBe(user);
  });
});

describe("CreateCardSchema", () => {
  it("parses an ISO due date into a Date and rejects other formats", () => {
    const base = {
      title: "Card",
      description: "",
      listPublicId: "list_1234567",
      labelPublicIds: [],
      memberPublicIds: [],
      position: "end",
    };

    expect(
      CreateCardSchema.parse({ ...base, dueDate: "2026-03-01T00:00:00.000Z" })
        .dueDate,
    ).toEqual(new Date("2026-03-01T00:00:00.000Z"));
    expect(CreateCardSchema.parse({ ...base, dueDate: null }).dueDate).toBe(
      null,
    );
    expect(
      CreateCardSchema.safeParse({ ...base, dueDate: "next tuesday" }).success,
    ).toBe(false);
  });
});
