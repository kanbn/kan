import type { Subscription } from "rxjs";
import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import {
  boards,
  cards,
  lists,
  users,
  workspaceMembers,
  workspaces,
} from "@kan/db/schema";
import * as notifications from "@kan/server/utils/notifications";
import * as permissions from "@kan/server/utils/permissions";
import * as sharedUtils from "@kan/shared/utils";

import { openBoardStream } from "../../../common/realtime.js";
import { db } from "../../../common/session.util.js";
import { AttachmentService } from "../../attachment/attachment.service.js";
import { BoardService } from "../../board/board.service.js";
import { CardService } from "../../card/card.service.js";
import { ChecklistService } from "../../checklist/checklist.service.js";
import { LabelService } from "../../label/label.service.js";
import { ListService } from "../../list/list.service.js";

const board = new BoardService();
const list = new ListService();
const card = new CardService();
const label = new LabelService();
const checklist = new ChecklistService();
const attachment = new AttachmentService();

// Every public method of the services that change boards. A new one has to be
// added to one of these, so it isn't forgotten.
const READS = {
  board: [
    "all",
    "archivedCards",
    "byId",
    "bySlug",
    "checkSlugAvailability",
    // Nobody is watching a board that doesn't exist yet.
    "create",
  ],
  list: [],
  card: ["byId", "getActivities"],
  label: ["byPublicId"],
  checklist: [],
  attachment: ["generateUploadUrl"],
};
const PRIVATE = [
  "constructor",
  "getEditableCard",
  "sendCardWebhook",
  "assertCanEditCard",
  "keyPrefix",
  "bucket",
  "saveAttachment",
];

const uid = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const must = <T>(value: T | undefined | null): T => {
  if (value == null) throw new Error("Expected a value");
  return value;
};

let userId: string;
let workspacePublicId: string;
let workspaceId: number;
let memberPublicId: string;
let boardId: number;
let boardPublicId: string;
let listPublicId: string;
let cardPublicId: string;
let events: unknown[];
let subscription: Subscription | undefined;

beforeAll(async () => {
  const suffix = uid();
  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: "Editor",
      email: `editor-${suffix}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  userId = must(user).id;
  workspacePublicId = uid();
  const [workspace] = await db
    .insert(workspaces)
    .values({
      publicId: workspacePublicId,
      name: "Workspace",
      slug: `realtime-${suffix}`,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();
  workspaceId = must(workspace).id;
  memberPublicId = uid();
  await db.insert(workspaceMembers).values({
    publicId: memberPublicId,
    email: must(user).email,
    userId,
    workspaceId,
    role: "admin",
    status: "active",
    createdBy: userId,
    createdAt: new Date(),
  });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  for (const fn of [
    "assertPermission",
    "assertBoardAccess",
    "assertCanEdit",
    "assertCanDelete",
  ] as const)
    vi.spyOn(permissions, fn).mockResolvedValue(undefined);
  vi.spyOn(permissions, "filterBoardAssignable").mockImplementation(((
    _db: unknown,
    _board: unknown,
    members: unknown[],
  ) => Promise.resolve(members)) as never);
  vi.spyOn(notifications, "sendMentionEmails").mockResolvedValue(undefined);
  vi.spyOn(sharedUtils, "uploadObject").mockResolvedValue(undefined);
  vi.spyOn(sharedUtils, "deleteObject").mockResolvedValue(undefined);
  vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "bucket");

  boardPublicId = uid();
  const [createdBoard] = await db
    .insert(boards)
    .values({
      publicId: boardPublicId,
      name: "Board",
      slug: boardPublicId,
      createdBy: userId,
      workspaceId,
    })
    .returning();
  boardId = must(createdBoard).id;
  listPublicId = uid();
  const [createdList] = await db
    .insert(lists)
    .values({
      publicId: listPublicId,
      name: "List",
      index: 0,
      createdBy: userId,
      boardId,
    })
    .returning();
  cardPublicId = uid();
  await db.insert(cards).values({
    publicId: cardPublicId,
    title: "Card",
    index: 0,
    createdBy: userId,
    listId: must(createdList).id,
  });

  subscription?.unsubscribe();
  events = [];
  subscription = openBoardStream(userId, boardId).subscribe(({ data }) => {
    if (data) events.push(data);
  });
});

afterAll(async () => {
  vi.unstubAllEnvs();
  subscription?.unsubscribe();
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
});

const actor = () => ({ userId, userName: "Editor" });
const byCard = () => ({ cardPublicId, ...actor() });
const newLabel = () =>
  label.create({ name: "Bug", colourCode: "#fff", boardPublicId, userId });
const newChecklist = () => checklist.create({ name: "Todo", ...byCard() });
const newItem = async () =>
  checklist.createItem({
    checklistPublicId: (await newChecklist()).publicId,
    title: "Item",
    userId,
  });
const newComment = () => card.addComment({ comment: "Hi", ...byCard() });
const file = {
  filename: "a.txt",
  originalFilename: "a.txt",
  contentType: "text/plain",
  size: 1,
};
const newAttachment = () =>
  attachment.confirm({
    ...file,
    s3Key: `${workspacePublicId}/${cardPublicId}/a.txt`,
    ...byCard(),
  });

// Returns the call to make once the board is set up for it.
const WRITES: Record<
  keyof typeof READS,
  Record<
    string,
    () => Promise<() => Promise<unknown>> | (() => Promise<unknown>)
  >
> = {
  board: {
    update: () => () => board.update({ boardPublicId, name: "New", userId }),
    delete: () => () => board.delete({ boardPublicId, userId }),
    move: async () => {
      const publicId = uid();
      await db.insert(workspaces).values({
        publicId,
        name: "Target",
        slug: `target-${publicId}`,
        createdBy: userId,
        createdAt: new Date(),
      });
      return () =>
        board.move({
          boardPublicId,
          targetWorkspacePublicId: publicId,
          userId,
        });
    },
  },
  list: {
    create: () => () => list.create({ name: "Next", boardPublicId, userId }),
    update: () => () => list.update({ listPublicId, name: "New", userId }),
    delete: () => () => list.delete({ listPublicId, userId }),
  },
  card: {
    create: () => () =>
      card.create({
        title: "Card",
        description: "",
        listPublicId,
        labelPublicIds: [],
        memberPublicIds: [],
        position: "end",
        ...actor(),
      }),
    update: () => () => card.update({ title: "New", ...byCard() }),
    delete: () => () => card.delete(byCard()),
    archive: () => () => card.archive(byCard()),
    unarchive: async () => {
      await card.archive(byCard());
      return () => card.unarchive(byCard());
    },
    duplicate: () => () =>
      card.duplicate({
        listPublicId,
        copyLabels: false,
        copyMembers: false,
        copyChecklists: false,
        ...byCard(),
      }),
    addComment: () => newComment,
    updateComment: async () => {
      const { publicId } = await newComment();
      return () =>
        card.updateComment({
          commentPublicId: publicId,
          comment: "Edited",
          ...byCard(),
        });
    },
    deleteComment: async () => {
      const { publicId } = await newComment();
      return () =>
        card.deleteComment({ commentPublicId: publicId, ...byCard() });
    },
    addOrRemoveLabel: async () => {
      const { publicId } = await newLabel();
      return () =>
        card.addOrRemoveLabel({ labelPublicId: publicId, ...byCard() });
    },
    addOrRemoveMember: () => () =>
      card.addOrRemoveMember({
        workspaceMemberPublicId: memberPublicId,
        ...byCard(),
      }),
  },
  label: {
    create: () => newLabel,
    update: async () => {
      const { publicId } = await newLabel();
      return () =>
        label.update({
          labelPublicId: publicId,
          name: "New",
          colourCode: "#000",
          userId,
        });
    },
    delete: async () => {
      const { publicId } = await newLabel();
      return () => label.delete({ labelPublicId: publicId, userId });
    },
  },
  checklist: {
    create: () => newChecklist,
    update: async () => {
      const { publicId } = await newChecklist();
      return () =>
        checklist.update({ checklistPublicId: publicId, name: "New", userId });
    },
    delete: async () => {
      const { publicId } = await newChecklist();
      return () => checklist.delete({ checklistPublicId: publicId, userId });
    },
    createItem: async () => {
      const { publicId } = await newChecklist();
      return () =>
        checklist.createItem({
          checklistPublicId: publicId,
          title: "Item",
          userId,
        });
    },
    updateItem: async () => {
      const { publicId } = await newItem();
      return () =>
        checklist.updateItem({
          checklistItemPublicId: publicId,
          completed: true,
          userId,
        });
    },
    deleteItem: async () => {
      const { publicId } = await newItem();
      return () =>
        checklist.deleteItem({ checklistItemPublicId: publicId, userId });
    },
  },
  attachment: {
    upload: () => () =>
      attachment.upload({ ...file, body: null as never, ...byCard() }),
    confirm: () => newAttachment,
    delete: async () => {
      const { publicId } = await newAttachment();
      return () => attachment.delete({ attachmentPublicId: publicId, userId });
    },
  },
};

const services = { board, list, card, label, checklist, attachment };
const serviceNames = Object.keys(services) as (keyof typeof services)[];

it.each(serviceNames)("every %s method is listed here", (name) => {
  const methods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(services[name]),
  ).filter((method) => !PRIVATE.includes(method));

  expect(methods.sort()).toEqual(
    [...READS[name], ...Object.keys(WRITES[name])].sort(),
  );
});

describe.each(serviceNames)("%s", (name) => {
  it.each(Object.keys(WRITES[name]))("%s publishes once", async (method) => {
    const run = await must(WRITES[name][method])();
    events.length = 0;

    await run();

    expect(events).toHaveLength(1);
    if (["checklist", "attachment"].includes(name))
      expect(events).toEqual([{ cardPublicId }]);
  });
});

it("publishes nothing when the change fails", async () => {
  vi.mocked(permissions.assertCanEdit).mockRejectedValue(new Error("No"));
  vi.spyOn(cardAttachmentRepo, "create").mockResolvedValue(undefined);

  await expect(card.update({ title: "New", ...byCard() })).rejects.toThrow();
  await expect(newAttachment()).rejects.toThrow();

  expect(events).toEqual([]);
});

it("tells both boards when a card moves between them", async () => {
  const otherPublicId = uid();
  const [other] = await db
    .insert(boards)
    .values({
      publicId: otherPublicId,
      name: "Other",
      slug: otherPublicId,
      createdBy: userId,
      workspaceId,
    })
    .returning();
  const target = await list.create({
    name: "Target",
    boardPublicId: otherPublicId,
    userId,
  });
  const otherEvents: unknown[] = [];
  const otherSubscription = openBoardStream(userId, must(other).id).subscribe(
    ({ data }) => data && otherEvents.push(data),
  );

  await card.update({ listPublicId: must(target).publicId, ...byCard() });
  otherSubscription.unsubscribe();

  expect(events).toEqual([{ cardPublicId }]);
  expect(otherEvents).toEqual([{ cardPublicId }]);
});

it("closes the streams of a board that moves to another workspace", async () => {
  const move = await must(WRITES.board.move)();

  await move();

  expect(subscription?.closed).toBe(true);
});

it("doesn't publish a favourite, which only its owner sees", async () => {
  await board.update({ boardPublicId, favorite: true, userId });

  expect(events).toEqual([]);
});
