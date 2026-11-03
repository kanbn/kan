import { useParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { HiEllipsisHorizontal, HiOutlinePlusSmall } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
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
  const utils = api.useUtils();

  const enabled = boardPublicId.length >= 12;

  const { data: board } = api.board.byId.useQuery(
    { boardPublicId },
    { enabled },
  );

  const {
    data: boardMembers,
    isLoading,
    error: boardMembersError,
  } = api.boardMember.all.useQuery({ boardPublicId }, { enabled, retry: false });

  // board.byId only returns people already on the board, so fetch the full roster separately.
  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: workspace.publicId.length >= 12 },
  );
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

  const updateRole = api.boardMember.updateRole.useMutation({
    onSuccess: () => utils.boardMember.all.invalidate({ boardPublicId }),
    onError: (error) => {
      showPopup({
        header: t`Unable to update role`,
        message: error.message,
        icon: "error",
      });
    },
  });

  const handleRoleChange = (
    workspaceMemberPublicId: string,
    role: "admin" | "member",
  ) => {
    updateRole.mutate({ boardPublicId, workspaceMemberPublicId, role });
  };

  const TableRow = ({
    memberPublicId,
    memberId,
    memberName,
    memberEmail,
    memberImage,
    memberRole,
    isLastRow,
    showSkeleton,
  }: {
    memberPublicId?: string;
    memberId?: string | null;
    memberName?: string | null;
    memberEmail?: string | null;
    memberImage?: string | null;
    memberRole?: string;
    isLastRow?: boolean;
    showSkeleton?: boolean;
  }) => {
    const isSelf = memberId === session?.user.id;
    const canManageRow = isBoardAdmin && !isSelf;

    return (
      <tr className="rounded-b-lg">
        <td
          className={twMerge(
            "w-full sm:w-[65%]",
            isLastRow ? "rounded-bl-lg" : "",
          )}
        >
          <div className="flex items-center p-2 sm:p-4">
            <div className="flex-shrink-0">
              {showSkeleton ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-light-200 dark:bg-dark-200 sm:h-9 sm:w-9" />
              ) : (
                <Avatar
                  name={memberName ?? ""}
                  email={memberEmail ?? ""}
                  imageUrl={memberImage ? getAvatarUrl(memberImage) : undefined}
                />
              )}
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p
                className={twMerge(
                  "truncate text-xs font-medium text-neutral-900 dark:text-dark-1000 sm:text-sm",
                  showSkeleton &&
                    "h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                )}
              >
                {memberName}
              </p>
              {!showSkeleton && (
                <p className="truncate text-xs text-dark-900 sm:text-sm">
                  {memberEmail}
                </p>
              )}
            </div>
          </div>
        </td>
        <td
          className={twMerge(
            "w-auto min-w-[120px] overflow-visible sm:w-[35%] sm:min-w-[150px]",
            isLastRow && "rounded-br-lg",
          )}
        >
          <div className="flex w-full items-center justify-between px-2 sm:px-3">
            {showSkeleton ? (
              <span className="h-5 w-[50px] animate-pulse rounded-md bg-light-200 ring-0 dark:bg-dark-200" />
            ) : (
              <div className="relative inline-flex items-center">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 sm:text-[11px]">
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
                    className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-[10px] leading-none opacity-0 focus:outline-none focus-visible:outline-none sm:text-[11px]"
                  >
                    <option value="admin">{t`Admin`}</option>
                    <option value="member">{t`Member`}</option>
                  </select>
                )}
              </div>
            )}

            <div className={twMerge("relative", !canManageRow && "hidden")}>
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
              >
                <HiEllipsisHorizontal
                  size={20}
                  className="text-light-900 dark:text-dark-900 sm:size-[20px]"
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
            <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
              {t`Board members`}
            </h1>
          </div>
          {!boardMembersError && (
            <Button
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
                <div className="h-full shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-light-600 overflow-visible dark:divide-dark-600">
                    <thead className="rounded-t-lg bg-light-300 dark:bg-dark-200">
                      <tr>
                        <th
                          scope="col"
                          className="w-full rounded-tl-lg py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light-900 dark:text-dark-900 sm:w-[65%] sm:pl-6"
                        >
                          {t`User`}
                        </th>
                        <th
                          scope="col"
                          className="w-auto whitespace-nowrap rounded-tr-lg px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900 sm:w-[35%]"
                        >
                          {t`Role`}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-600 overflow-visible bg-light-50 dark:divide-dark-600 dark:bg-dark-100">
                      {!isLoading &&
                        boardMembers?.map((member, index) => (
                          <TableRow
                            key={member.publicId}
                            memberPublicId={member.publicId}
                            memberId={member.user?.id}
                            memberName={formatMemberDisplayName(
                              member.user?.name ?? null,
                              member.user?.email ?? member.email,
                            )}
                            memberEmail={member.user?.email ?? member.email}
                            memberImage={member.user?.image}
                            memberRole={member.role}
                            isLastRow={index === boardMembers.length - 1}
                          />
                        ))}

                      {isLoading && (
                        <>
                          <TableRow showSkeleton />
                          <TableRow showSkeleton isLastRow />
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
