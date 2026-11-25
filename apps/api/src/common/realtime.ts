import { AsyncLocalStorage } from "node:async_hooks";
import type { MessageEvent, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Observable } from "rxjs";
import { Injectable } from "@nestjs/common";
import {
  defer,
  filter,
  finalize,
  map,
  merge,
  Subject,
  takeUntil,
  timer,
} from "rxjs";

import { createLogger } from "@kan/logger";

const log = createLogger("realtime");

const PING_MS = 25_000;
// Reconnecting checks access again. Spread out, so that streams opened together,
// as after a deploy, don't all reconnect together.
const MAX_STREAM_MS = 15 * 60_000;
const SPREAD_MS = 5 * 60_000;
export const MAX_STREAMS_PER_USER = 20;

interface BoardChange {
  boardId: number;
  cardPublicId?: string;
  tabId?: string;
}

// ponytail: in-process, so it only reaches people connected to this API
// instance; use Redis pub/sub if it scales out
const changes = new Subject<BoardChange>();
const closing = new Subject<{ userId?: string; boardId?: number }>();
const openStreams = new Map<string, number>();

const tabIds = new AsyncLocalStorage<string | undefined>();

// Lets the tab that made a change ignore it.
@Injectable()
export class TabIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    tabIds.run(req.header("x-tab-id")?.slice(0, 64), next);
  }
}

// Call once the change is saved. Only IDs are sent: viewers refetch, which
// checks their permissions.
export function publishBoardChange(boardId: number, cardPublicId?: string) {
  changes.next({ boardId, cardPublicId, tabId: tabIds.getStore() });
}

// Closes the matching streams, or all of them.
export function closeBoardStreams(
  match: { userId?: string; boardId?: number } = {},
) {
  closing.next(match);
}

export const hasMaxStreams = (userId: string) =>
  (openStreams.get(userId) ?? 0) >= MAX_STREAMS_PER_USER;

export function openBoardStream(
  userId: string,
  boardId: number,
): Observable<MessageEvent> {
  return defer(() => {
    const count = (openStreams.get(userId) ?? 0) + 1;
    openStreams.set(userId, count);
    log.debug({ userId, boardId, count }, "Stream opened");

    return merge(
      changes.pipe(
        filter((change) => change.boardId === boardId),
        map(({ cardPublicId, tabId }) => ({ data: { cardPublicId, tabId } })),
      ),
      timer(0, PING_MS).pipe(map(() => ({ comment: "ping" }))),
    ).pipe(
      takeUntil(
        merge(
          timer(MAX_STREAM_MS + Math.random() * SPREAD_MS),
          closing.pipe(
            filter(
              (match) =>
                (match.userId ?? userId) === userId &&
                (match.boardId ?? boardId) === boardId,
            ),
          ),
        ),
      ),
      finalize(() => {
        const left = (openStreams.get(userId) ?? 1) - 1;
        if (left) openStreams.set(userId, left);
        else openStreams.delete(userId);
        log.debug({ userId, boardId, count: left }, "Stream closed");
      }),
    );
  });
}
