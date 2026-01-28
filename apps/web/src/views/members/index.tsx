import Link from "next/link";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import {
  HiBolt,
  HiChevronDown,
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { Subscription } from "@kan/shared/utils";
import { authClient } from "@kan/auth/client";
import { getSubscriptionByPlan, hasUnlimitedSeats } from "@kan/shared/utils";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getAvatarUrl } from "~/utils/helpers";
import { DeleteMemberConfirmation } from "./components/DeleteMemberConfirmation";
import { InviteMemberForm } from "./components/InviteMemberForm";

export default function MembersPage() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const { data, isLoading } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    // { enabled: workspace?.publicId ? true : false },
  );

  const { data: session } = authClient.useSession();

  const { canEditMember } = usePermissions();

  const utils = api.useUtils();

  const updateRoleMutation = api.member.updateRole.useMutation({
    onSuccess: async () => {
      await utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });

      showPopup({
        header: t`Role updated`,
        message: t`The member's role has been updated.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to update role`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const subscriptions = data?.subscriptions as Subscription[] | undefined;

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const unlimitedSeats = hasUnlimitedSeats(subscriptions);

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
    showPendingIcon,
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
    showPendingIcon?: boolean;
  }) => {
    const handleRoleChange = (newRole: "admin" | "member" | "guest") => {
      if (!memberPublicId) return;

      updateRoleMutation.mutate({
        workspacePublicId: workspace.publicId,
        memberPublicId,
        role: newRole,
      });
    };

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
                  icon={showPendingIcon ? "?" : undefined}
                />
              )}
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "mr-2 truncate text-xs font-medium text-neutral-900 dark:text-dark-1000 sm:text-sm",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                      showPendingIcon &&
                        "italic text-neutral-500 dark:text-dark-900",
                    )}
                  >
                    {memberName}
                  </p>
                </div>
                {((workspace.role === "admin" ||
                  data?.showEmailsToMembers === true) ||
                  showSkeleton) && (
                  <p
                    className={twMerge(
                      "truncate text-xs text-dark-900 sm:text-sm",
                      showSkeleton &&
                        "h-3 w-[175px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    {memberEmail}
                  </p>
                )}
              </div>
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
            <div className="flex items-center gap-2">
              {showSkeleton ? (
                <span
                  className={twMerge(
                    "inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 sm:text-[11px]",
                    "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
                  )}
                />
              ) : (
                <div className="relative inline-flex items-center">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 sm:text-[11px]">
                    {memberRole &&
                      memberRole.charAt(0).toUpperCase() +
                        memberRole.slice(1)}
                    {canEditMember && session?.user.id !== memberId && (
                      <HiChevronDown className="h-3 w-3" />
                    )}
                  </span>

                  {canEditMember && session?.user.id !== memberId && (
                    <select
                      value={memberRole}
                      onChange={(e) =>
                        handleRoleChange(
                          e.target.value as "admin" | "member" | "guest",
                        )
                      }
                      disabled={updateRoleMutation.isPending}
                      className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-[10px] leading-none opacity-0 focus:outline-none focus-visible:outline-none sm:text-[11px]"
                    >
                      <option value="admin">{t`Admin`}</option>
                      <option value="member">{t`Member`}</option>
                      <option value="guest">{t`Guest`}</option>
                    </select>
                  )}
                </div>
              )}
              {(memberStatus === "invited" || memberStatus === "paused") && (
                <span className="inline-flex items-center rounded-md bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 ring-1 ring-inset ring-gray-500/20 sm:text-[11px]">
                  {memberStatus === "invited" ? t`Pending` : t`Paused`}
                </span>
              )}
            </div>
            <div
              className={twMerge(
                "relative z-50",
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
                    size={20}
                    className="text-light-900 dark:text-dark-900 sm:size-[25px]"
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
      <PageHead title={t`Members | ${workspace.name ?? t`Workspace`}`} />
      <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
        <div className="mb-8 flex w-full justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
              {t`Members`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && (
              <>
                {!proSubscription && !teamSubscription && (
                  <Link
                    href="/settings/workspace?upgrade=pro"
                    className="hidden items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-center text-xs text-emerald-400 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 lg:flex"
                  >
                    <HiBolt />
                    <span className="ml-1 font-medium">
                      {t`Launch offer: Get unlimited members with Pro`}
                    </span>
                  </Link>
                )}
                <div
                  className={twMerge(
                    "flex items-center rounded-full border px-3 py-1 text-center text-xs",
                    teamSubscription || proSubscription
                      ? "border-emerald-300 bg-emerald-50 text-emerald-400 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "border-light-300 bg-light-50 text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900",
                  )}
                >
                  <span className="font-medium">
                    {proSubscription
                      ? t`Pro Plan`
                      : teamSubscription
                        ? t`Team Plan`
                        : t`Free Plan`}
                    {proSubscription && unlimitedSeats && (
                      <span className="ml-1 text-xs">∞</span>
                    )}
                  </span>
                </div>
              </>
            )}
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
                      data?.members.map((member, index) => {
                        const isPendingInvite = member.status === "invited";

                        return (
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
                            showPendingIcon={isPendingInvite}
                          />
                        );
                      })}

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

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "INVITE_MEMBER"}
          >
            <InviteMemberForm
              userId={session?.user.id}
              numberOfMembers={data?.members.length ?? 1}
              subscriptions={subscriptions}
              unlimitedSeats={unlimitedSeats}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "REMOVE_MEMBER"}
          >
            <DeleteMemberConfirmation />
          </Modal>
        </>
      </div>
    </>
  );
}
