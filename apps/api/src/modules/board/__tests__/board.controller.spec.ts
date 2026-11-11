import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import {
  BoardController,
  PublicBoardController,
  WorkspaceBoardController,
} from "../board.controller.js";
import {
  BoardDetailQuerySchema,
  BoardListQuerySchema,
} from "../dto/board.dto.js";

const guardsOf = (target: object) =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

describe("board controllers", () => {
  it("guard every board route except the public slug view", () => {
    expect(guardsOf(WorkspaceBoardController)).toContain(AuthGuard);
    expect(guardsOf(BoardController)).toContain(AuthGuard);
    expect(guardsOf(PublicBoardController)).toEqual([]);
  });
});

describe("board query DTOs", () => {
  it("accept a single filter value or repeated values", () => {
    expect(
      BoardDetailQuerySchema.parse({ members: "member_12345" }).members,
    ).toEqual(["member_12345"]);
    expect(
      BoardDetailQuerySchema.parse({ labels: ["label_123456", "label_654321"] })
        .labels,
    ).toHaveLength(2);
    expect(BoardDetailQuerySchema.parse({}).cardView).toBe("full");
  });

  it("parse archived from its query-string form", () => {
    expect(BoardListQuerySchema.parse({ archived: "true" }).archived).toBe(
      true,
    );
    expect(BoardListQuerySchema.parse({ archived: "false" }).archived).toBe(
      false,
    );
  });
});
