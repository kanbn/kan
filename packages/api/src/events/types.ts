export type BoardEvent = (
  | {
      scope: "board";
      type: "card.created" | "card.updated" | "card.deleted";
      boardId: number;
      cardPublicId: string;
      listPublicId?: string;
      changes?: Partial<{
        title: string | null | undefined;
        description: string | null | undefined;
        listPublicId: string | undefined;
        index: number | undefined;
      }>;
    }
  | {
      scope: "board";
      type: "list.created" | "list.updated" | "list.deleted";
      boardId: number;
      listPublicId: string;
      name?: string;
      index?: number;
    }
  | {
      scope: "board";
      type: "checklist.changed";
      boardId: number;
      cardPublicId: string;
    }
  | {
      scope: "board";
      type: "label.changed";
      boardId: number;
      labelPublicId: string;
    }
  | {
      scope: "board";
      type: "board.created";
      boardId: number;
      boardPublicId: string;
    }
  | {
      scope: "board";
      type: "board.updated" | "board.deleted";
      boardId: number;
      boardPublicId: string;
    }
  | {
      scope: "board";
      type: "member.invited" | "member.removed" | "member.role.changed";
      workspaceMemberPublicId: string;
    }) & { actorUserId?: string };

export type CardEvent = (
  | {
      scope: "card";
      type: "comment.added" | "comment.updated" | "comment.deleted";
      cardId: number;
      cardPublicId: string;
      commentPublicId: string;
      comment?: string;
    }
  | {
      scope: "card";
      type: "label.added" | "label.removed";
      cardId: number;
      cardPublicId: string;
      labelPublicId: string;
    }
  | {
      scope: "card";
      type: "member.added" | "member.removed";
      cardId: number;
      cardPublicId: string;
      workspaceMemberPublicId: string;
    }
  | {
      scope: "card";
      type: "checklist.changed";
      cardId: number;
      cardPublicId: string;
    }
  | {
      scope: "card";
      type: "updated" | "deleted";
      cardId: number;
      cardPublicId: string;
      changes?: Partial<{
        title: string | null | undefined;
        description: string | null | undefined;
        listPublicId: string | undefined;
        index: number | undefined;
      }>;
    }
  | {
      scope: "card";
      type: "attachment.changed";
      cardId: number;
      cardPublicId: string;
      attachmentPublicId?: string;
    }) & { actorUserId?: string };

export type WorkspaceEventScope = "board" | "card";

export type WorkspaceEvent =
  | ({ workspacePublicId: string } & { scope: "board"; event: BoardEvent })
  | ({ workspacePublicId: string } & { scope: "card"; event: CardEvent });

export type NotificationEvent = {
  scope: "notification";
  type: "notification.created";
  notificationPublicId: string;
};
