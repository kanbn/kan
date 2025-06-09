import { t } from "@lingui/core/macro";
import { HiEllipsisHorizontal, HiOutlinePlusSmall } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getAvatarUrl } from "~/utils/helpers";
import { DeleteMemberConfirmation } from "./components/DeleteMemberConfirmation";
import { InviteMemberForm } from "./components/InviteMemberForm";

export default function MembersPage() {
  const { modalContentType, openModal } = useModal();
  const { workspace } = useWorkspace();

  const { data, isLoading } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    // { enabled: workspace?.publicId ? true : false },
  );

  const TableRow = ({
    memberPublicId,
    memberId,
    memberName,
    memberEmail,
    memberImage,
    memberRole,
    memberStatus,
    isLastRow,
    showSkeleton,
  }: {
    memberPublicId?: string;
    memberId?: string | null | undefined;
    memberName?: string | null | undefined;
    memberEmail?: string | null | undefined;
    memberImage?: string | null | undefined;
    memberRole?: string;
    memberStatus?: string;
    isLastRow?: boolean;
    showSkeleton?: boolean;
  }) => {
    const { data: session } = authClient.useSession();
    return (
      <tr className="rounded-b-lg">
        <td className={twMerge("w-[65%]", isLastRow ? "rounded-bl-lg" : "")}>
          <div className="flex items-center p-4">
            <div className="flex-shrink-0">
              {showSkeleton ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-light-200 dark:bg-dark-200" />
              ) : (
                <Avatar
                  name={memberName ?? ""}
                  email={memberEmail ?? ""}
                  imageUrl={memberImage ? getAvatarUrl(memberImage) : undefined}
                />
              )}
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "mr-2 text-sm font-medium text-neutral-900 dark:text-dark-1000",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    {memberName}
                  </p>
                </div>
                <p
                  className={twMerge(
                    "truncate text-sm text-dark-900",
                    showSkeleton &&
                      "h-3 w-[175px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                  )}
                >
                  {memberEmail}
                </p>
              </div>
            </div>
          </div>
        </td>
        <td
          className={twMerge(
            "w-[35%] min-w-[150px]",
            isLastRow && "rounded-br-lg",
          )}
        >
          <div className="flex w-full items-center justify-between px-3">
            <div>
              <span
                className={twMerge(
                  "inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
                  showSkeleton &&
                    "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
                )}
              >
                {memberRole &&
                  memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
              </span>
              {memberStatus === "invited" && (
                <span className="ml-2 inline-flex items-center rounded-md bg-gray-500/10 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 ring-1 ring-inset ring-gray-500/20">
                  {t`Pending`}
                </span>
              )}
            </div>
            <div
              className={twMerge(
                "relative",
                (workspace.role !== "admin" || showSkeleton) && "hidden",
              )}
            >
              {session?.user.id !== memberId && (
                <Dropdown
                  items={[
                    {
                      label: t`Remove member`,
                      action: () =>
                        openModal(
                          "REMOVE_MEMBER",
                          memberPublicId,
                          memberEmail ?? "",
                        ),
                    },
                  ]}
                >
                  <HiEllipsisHorizontal
                    size={25}
                    className="text-light-900 dark:text-dark-900"
                  />
                </Dropdown>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <PageHead title={t`Members | ${workspace.name ?? "Workspace"}`} />
      <div className="m-auto h-full max-w-[1600px] px-5 py-8 md:px-28 md:py-12">
        <div className="mb-8 flex w-full justify-between">
          <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
            {t`Members`}
          </h1>
          <div className="flex">
            <Button
              onClick={() => openModal("INVITE_MEMBER")}
              iconLeft={<HiOutlinePlusSmall className="h-4 w-4" />}
              disabled={workspace.role !== "admin"}
            >
              {t`Invite`}
            </Button>
          </div>
        </div>

        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-visible sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="h-full shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-light-600 dark:divide-dark-600">
                  <thead className="rounded-t-lg bg-light-300 dark:bg-dark-200">
                    <tr>
                      <th
                        scope="col"
                        className="w-[65%] rounded-tl-lg py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light-900 dark:text-dark-900 sm:pl-6"
                      >
                        {t`User`}
                      </th>
                      <th
                        scope="col"
                        className="w-[35%] rounded-tr-lg px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                      >
                        {t`Role`}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-600 bg-light-50 dark:divide-dark-600 dark:bg-dark-100">
                    {!isLoading &&
                      data?.members.map((member, index) => (
                        <TableRow
                          key={member.publicId}
                          memberPublicId={member.publicId}
                          memberId={member.user?.id}
                          memberName={member.user?.name}
                          memberEmail={member.user?.email ?? member.email}
                          memberImage={member.user?.image}
                          memberRole={member.role}
                          memberStatus={member.status}
                          isLastRow={index === data.members.length - 1}
                        />
                      ))}

                    {isLoading && (
                      <>
                        <TableRow showSkeleton />
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

        <Modal>
          {modalContentType === "NEW_WORKSPACE" && <NewWorkspaceForm />}
          {modalContentType === "INVITE_MEMBER" && <InviteMemberForm />}
          {modalContentType === "REMOVE_MEMBER" && <DeleteMemberConfirmation />}
        </Modal>
      </div>
    </>
  );
}
