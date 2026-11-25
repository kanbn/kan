import type { CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";

import type { DragData } from "./types";

function getData(
  entity: { data: { current: unknown } } | undefined,
): DragData | undefined {
  return entity?.data.current as DragData | undefined;
}

export function createBoardCollisionDetection(lastOverIdRef: {
  current: UniqueIdentifier | null;
}): CollisionDetection {
  return (args) => {
    const activeData = getData(args.active);

    if (activeData?.type === "LIST") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => getData(container)?.type === "LIST",
        ),
      });
    }

    // A card can be dropped anywhere in a list's column, not just over its
    // cards: pick the list whose column the pointer is in (or nearest to,
    // across the gaps), then the closest card in it.
    const pointer = args.pointerCoordinates;
    if (pointer) {
      let column: { listPublicId: string; id: UniqueIdentifier } | undefined;
      let bestDistance = Infinity;
      for (const container of args.droppableContainers) {
        const data = getData(container);
        const rect = args.droppableRects.get(container.id);
        if (data?.type !== "LIST_BODY" || !rect) continue;
        const distance = Math.max(
          rect.left - pointer.x,
          0,
          pointer.x - (rect.left + rect.width),
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          column = { listPublicId: data.listPublicId, id: container.id };
        }
      }

      if (column) {
        const listPublicId = column.listPublicId;
        const cards = args.droppableContainers.filter((container) => {
          const data = getData(container);
          return data?.type === "CARD" && data.listPublicId === listPublicId;
        });
        const overId =
          (cards.length > 0
            ? closestCenter({ ...args, droppableContainers: cards })[0]?.id
            : undefined) ?? column.id;
        lastOverIdRef.current = overId;
        return [{ id: overId }];
      }
    }

    const pointerIntersections = pointerWithin(args);
    const intersections =
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args);

    let overId = getFirstCollision(intersections, "id");

    if (overId != null) {
      const overContainer = args.droppableContainers.find(
        (container) => container.id === overId,
      );
      const overData = getData(overContainer);

      if (overData?.type === "LIST_BODY") {
        const cardContainers = args.droppableContainers.filter((container) => {
          const data = getData(container);
          return (
            data?.type === "CARD" && data.listPublicId === overData.listPublicId
          );
        });

        if (cardContainers.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: cardContainers,
          })[0]?.id;

          if (closest != null) {
            overId = closest;
          }
        }
      }

      lastOverIdRef.current = overId;
      return [{ id: overId }];
    }

    return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
  };
}
