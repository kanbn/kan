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
