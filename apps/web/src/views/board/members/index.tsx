import { useParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { HiEllipsisHorizontal, HiOutlinePlusSmall } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import {
  getGetBoardMembersQueryKey,
  useGetBoard,
  useGetBoardMembers,
  useGetWorkspace,
  useUpdateBoardMemberRole,
} from "@kan/api-client/hooks";
import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { AddBoardMemberForm } from "./components/AddBoardMemberForm";
import { RemoveBoardMemberConfirmation } from "./components/RemoveBoardMemberConfirmation";

export default function BoardMembersView() {
  const params = useParams() as { boardId: string } | null;
  const boardPublicId = params?.boardId ?? "";

  const { workspace } = useWorkspace();
  const { data: session } = authClient.useSession();
  const { modalContentType, openModal, isOpen } = useModal();
  const { showPopup } = usePopup();
  const queryClient = useQueryClient();

  const enabled = boardPublicId.length >= 12;

  const { data: board } = useGetBoard(boardPublicId, undefined, {
    query: { enabled, select: (res) => res.data },
  });

  const {
    data: boardMembersResult,
    isLoading,
    error: boardMembersError,
  } = useGetBoardMembers(boardPublicId, { query: { enabled, retry: false } });
  const boardMembers = boardMembersResult?.data;

  // board.byId only returns people already on the board, so fetch the full roster separately.
  const { data: workspaceData } = useGetWorkspace(workspace.publicId, {
    query: {
      enabled: workspace.publicId.length >= 12,
      select: (res) => res.data,
    },
  });
  const workspaceMembers = workspaceData?.members ?? [];

  const myMembership = boardMembers?.find(
    (member) => member.user?.id === session?.user.id,
  );
  const isBoardAdmin =
    workspace.role === "admin" || myMembership?.role === "admin";

  const availableWorkspaceMembers = workspaceMembers.filter(
    (member) =>
      member.status === "active" &&
      member.user !== null &&
      !boardMembers?.some(
        (boardMember) => boardMember.publicId === member.publicId,
      ),
  );

  const updateRole = useUpdateBoardMemberRole({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGetBoardMembersQueryKey(boardPublicId),
        }),
      onError: (error) => {
        showPopup({
          header: t`Unable to update role`,
          message:
            error instanceof Error
              ? error.message
              : t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
    },
  });

  const handleRoleChange = (
    workspaceMemberPublicId: string,
    role: "admin" | "member",
  ) => {
    updateRole.mutate({
      boardPublicId,
      workspaceMemberPublicId,
      data: { role },
    });
  };

  const renderTableRow = ({
    key,
    memberPublicId,
    memberId,
    memberName,
    memberEmail,
    memberImage,
    memberRole,
    showSkeleton,
  }: {
    key?: string;
    memberPublicId?: string;
    memberId?: string | null;
    memberName?: string | null;
    memberEmail?: string | null;
    memberImage?: string | null;
    memberRole?: string;
    showSkeleton?: boolean;
  }) => {
    const isSelf = memberId === session?.user.id;
    const canManageRow = isBoardAdmin && !isSelf;

    return (
      <tr
        key={key}
        className="group/row h-14 transition-colors hover:bg-light-200 dark:hover:bg-dark-100"
      >
        <td className="w-full max-w-0">
          <div className="flex items-center px-2">
            <div className="flex shrink-0">
              {showSkeleton ? (
                <div className="h-6 w-6 animate-pulse rounded-full bg-light-200 dark:bg-dark-200" />
              ) : (
                <Avatar
                  size="sm"
                  name={memberName ?? ""}
                  email={memberEmail ?? ""}
                  imageUrl={memberImage ? getAvatarUrl(memberImage) : undefined}
                />
              )}
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p
                className={twMerge(
                  "truncate text-sm font-medium text-neutral-900 dark:text-dark-1000",
                  showSkeleton &&
                    "h-3 w-[125px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
                )}
              >
                {memberName}
              </p>
              {!showSkeleton && (
                <p className="truncate text-xs text-light-900 dark:text-dark-900">
                  {memberEmail}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="min-w-[130px] overflow-visible sm:min-w-[220px]">
          <div className="flex w-full items-center justify-between px-2">
            {showSkeleton ? (
              <span className="h-5 w-[50px] animate-pulse rounded-md bg-light-200 ring-0 dark:bg-dark-200" />
            ) : (
              <div className="relative inline-flex items-center rounded-md hover:text-light-1000 has-focus-visible:ring-2 has-focus-visible:ring-light-600 dark:has-focus-visible:ring-dark-600">
                <span className="-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-light-950 dark:text-dark-950">
                  {memberRole === "admin" ? t`Admin` : t`Member`}
                </span>
                {canManageRow && (
                  <select
                    value={memberRole}
                    onChange={(e) =>
                      memberPublicId &&
                      handleRoleChange(
                        memberPublicId,
                        e.target.value as "admin" | "member",
                      )
                    }
                    disabled={updateRole.isPending}
                    aria-label={t`Role`}
                    className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-[10px] leading-none opacity-0 focus:outline-hidden focus-visible:outline-hidden sm:text-[11px]"
                  >
                    <option value="admin">{t`Admin`}</option>
                    <option value="member">{t`Member`}</option>
                  </select>
                )}
              </div>
            )}

            <div
              className={twMerge(
                "relative transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100",
                !canManageRow && "hidden",
              )}
            >
              <Dropdown
                items={[
                  {
                    label: t`Remove from board`,
                    action: () =>
                      memberPublicId &&
                      openModal(
                        "REMOVE_BOARD_MEMBER",
                        memberPublicId,
                        memberName ?? memberEmail ?? "",
                      ),
                  },
                ]}
                ariaLabel={t`Board member options`}
                buttonClassName="h-6 w-6 hover:bg-light-400 dark:hover:bg-dark-300"
              >
                <HiEllipsisHorizontal
                  size={16}
                  className="text-light-900 dark:text-dark-900"
                />
              </Dropdown>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <PageHead title={t`Board members | ${board?.name ?? t`Board`}`} />
      <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
        <div className="mb-8 flex w-full justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold tracking-tight text-neutral-900 sm:text-base dark:text-dark-1000">
              {t`Board members`}
            </h1>
          </div>
          {!boardMembersError && (
            <Button
              size="sm"
              onClick={() => openModal("ADD_BOARD_MEMBER")}
              iconLeft={<HiOutlinePlusSmall className="h-4 w-4" />}
              disabled={!isBoardAdmin}
            >
              {t`Add member`}
            </Button>
          )}
        </div>

        {boardMembersError ? (
          <p className="text-sm text-light-900 dark:text-dark-900">
            {t`You're not a member of this board yet. Ask a board admin to add you.`}
          </p>
        ) : (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full overflow-x-auto px-4 py-2 pb-16 align-middle sm:px-6 lg:px-8">
                <div className="-mx-2 h-full">
                  <table className="min-w-full overflow-visible">
                    <thead className="border-b border-light-400 dark:border-dark-300">
                      <tr>
                        <th
                          scope="col"
                          className="w-full px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                        >
                          {t`User`}
                        </th>
                        <th
                          scope="col"
                          className="px-2 pb-2 text-left text-xs font-medium whitespace-nowrap text-light-900 dark:text-dark-900"
                        >
                          {t`Role`}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-300 overflow-visible dark:divide-dark-200">
                      {!isLoading &&
                        boardMembers?.map((member) =>
                          renderTableRow({
                            key: member.publicId,
                            memberPublicId: member.publicId,
                            memberId: member.user?.id,
                            memberName: formatMemberDisplayName(
                              member.user?.name ?? null,
                              member.user?.email ?? member.email,
                            ),
                            memberEmail: member.user?.email ?? member.email,
                            memberImage: member.user?.image,
                            memberRole: member.role,
                          }),
                        )}

                      {isLoading && (
                        <>
                          {renderTableRow({ showSkeleton: true })}
                          {renderTableRow({ showSkeleton: true })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "ADD_BOARD_MEMBER"}
        >
          <AddBoardMemberForm
            boardPublicId={boardPublicId}
            availableMembers={availableWorkspaceMembers.map((member) => ({
              publicId: member.publicId,
              label: `${formatMemberDisplayName(member.user?.name ?? null, member.user?.email ?? member.email ?? null)} (${member.user?.email ?? member.email})`,
            }))}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "REMOVE_BOARD_MEMBER"}
        >
          <RemoveBoardMemberConfirmation boardPublicId={boardPublicId} />
        </Modal>
      </div>
    </>
  );
}
