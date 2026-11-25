import type { CollisionDetection } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import { createBoardCollisionDetection } from "./collision";

type Args = Parameters<CollisionDetection>[0];

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// Two 280px columns 20px apart. List "a" has two cards; list "b" is empty.
const containers = [
  {
    id: "body-a",
    data: { type: "LIST_BODY", listPublicId: "a" },
    rect: rect(0, 50, 280, 200),
  },
  {
    id: "card-1",
    data: { type: "CARD", listPublicId: "a" },
    rect: rect(0, 50, 280, 80),
  },
  {
    id: "card-2",
    data: { type: "CARD", listPublicId: "a" },
    rect: rect(0, 140, 280, 80),
  },
  {
    id: "body-b",
    data: { type: "LIST_BODY", listPublicId: "b" },
    rect: rect(300, 50, 280, 32),
  },
];

const detect = (x: number, y: number) =>
  createBoardCollisionDetection({ current: null })({
    active: {
      id: "dragged",
      data: { current: { type: "CARD", listPublicId: "c" } },
    },
    collisionRect: rect(x - 140, y - 40, 280, 80),
    droppableRects: new Map(containers.map((c) => [c.id, c.rect])),
    droppableContainers: containers.map((c) => ({
      id: c.id,
      data: { current: c.data },
    })),
    pointerCoordinates: { x, y },
  } as unknown as Args);

describe("card collision detection", () => {
  it("drops on the last card when the pointer is below a list's cards", () => {
    expect(detect(140, 700)).toEqual([{ id: "card-2" }]);
  });

  it("picks the nearest column when the pointer is in the gap", () => {
    expect(detect(285, 100)).toEqual([{ id: "card-1" }]);
    expect(detect(296, 100)).toEqual([{ id: "body-b" }]);
  });

  it("drops into an empty list anywhere down its column", () => {
    expect(detect(440, 800)).toEqual([{ id: "body-b" }]);
  });
});
