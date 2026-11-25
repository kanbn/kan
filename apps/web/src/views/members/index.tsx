import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  HiBolt,
  HiChevronDown,
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { Subscription } from "@kan/shared/utils";
import {
  getGetWorkspaceQueryKey,
  useGetWorkspace,
  useUpdateMemberRole,
} from "@kan/api-client/hooks";
import { authClient } from "@kan/auth/client";
import { env } from "@kan/shared/env";
import {
  getSeatLimit,
  getSubscriptionByPlan,
  hasUnlimitedSeats,
} from "@kan/shared/utils";

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
import { getAvatarUrl } from "~/utils/helpers";
import { DeleteMemberConfirmation } from "./components/DeleteMemberConfirmation";
import { EditMemberPermissionsModal } from "./components/EditMemberPermissionsModal";
import { InviteMemberForm } from "./components/InviteMemberForm";

export default function MembersPage() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const { data, isLoading } = useGetWorkspace(workspace.publicId, {
    query: {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      select: (res) => res.data,
    },
  });

  const { data: session } = authClient.useSession();

  const { canEditMember } = usePermissions();

  const queryClient = useQueryClient();

  const updateRoleMutation = useUpdateMemberRole({
    mutation: {
      onSuccess: async () => {
        if (workspace.publicId && workspace.publicId.length >= 12) {
          await queryClient.invalidateQueries({
            queryKey: getGetWorkspaceQueryKey(workspace.publicId),
          });
        }

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
    },
  });

  const subscriptions = data?.subscriptions as Subscription[] | undefined;

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const unlimitedSeats = hasUnlimitedSeats(subscriptions);

  const isProPlan =
    !!proSubscription ||
    workspace.plan === "pro" ||
    workspace.plan === "enterprise";
  const isTeamPlan = !!teamSubscription || workspace.plan === "team";
  const isPaidPlan = isProPlan || isTeamPlan;

  const activeMembers = data?.members.length ?? 0;
  const seatLimit = getSeatLimit(subscriptions);
  const memberCount =
    data?.members.filter((m) => m.status === "active" || m.status === "invited")
      .length ?? 0;
  const totalSeats =
    teamSubscription?.seats ??
    proSubscription?.seats ??
    (isPaidPlan ? null : 1);

  const renderTableRow = ({
    key,
    memberPublicId,
    memberId,
    memberName,
    memberEmail,
    memberImage,
    memberRole,
    memberStatus,
    showSkeleton,
    showPendingIcon,
  }: {
    key?: string;
    memberPublicId?: string;
    memberId?: string | null | undefined;
    memberName?: string | null | undefined;
    memberEmail?: string | null | undefined;
    memberImage?: string | null | undefined;
    memberRole?: string;
    memberStatus?: string;
    showSkeleton?: boolean;
    showPendingIcon?: boolean;
  }) => {
    const handleRoleChange = (newRole: "admin" | "member" | "guest") => {
      if (!memberPublicId) return;

      updateRoleMutation.mutate({
        workspacePublicId: workspace.publicId,
        memberPublicId,
        data: { role: newRole },
      });
    };

    const showEmail =
      workspace.role === "admin" || data?.showEmailsToMembers === true;

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
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "mr-2 truncate text-sm font-medium text-neutral-900 dark:text-dark-1000",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
                      showPendingIcon && "text-light-900 dark:text-dark-900",
                    )}
                  >
                    {memberName || (showEmail ? memberEmail : null)}
                  </p>
                </div>
                {((showEmail && !!memberName) || showSkeleton) && (
                  <p
                    className={twMerge(
                      "truncate text-xs text-light-900 dark:text-dark-900",
                      showSkeleton &&
                        "h-3 w-[175px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    {memberEmail}
                  </p>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="min-w-[130px] overflow-visible sm:min-w-[220px]">
          <div className="flex w-full items-center justify-between px-2">
            <div className="flex flex-col items-start gap-x-2 gap-y-0.5 sm:flex-row sm:items-center">
              {showSkeleton ? (
                <span
                  className={twMerge(
                    "inline-flex items-center rounded-md",
                    "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
                  )}
                />
              ) : (
                <div className="relative inline-flex items-center rounded-md hover:text-light-1000 has-focus-visible:ring-2 has-focus-visible:ring-light-600 dark:has-focus-visible:ring-dark-600">
                  <span className="-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-light-950 dark:text-dark-950">
                    {memberRole &&
                      memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
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
                      className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-[10px] leading-none opacity-0 focus:outline-hidden focus-visible:outline-hidden sm:text-[11px]"
                    >
                      <option value="admin">{t`Admin`}</option>
                      <option value="member">{t`Member`}</option>
                      <option value="guest">{t`Guest`}</option>
                    </select>
                  )}
                </div>
              )}
              {(memberStatus === "invited" || memberStatus === "paused") && (
                <span className="inline-flex items-center rounded-full bg-light-300 px-2 py-0.5 text-[11px] text-light-950 dark:bg-dark-200 dark:text-dark-900">
                  {memberStatus === "invited" ? t`Pending` : t`Paused`}
                </span>
              )}
            </div>
            <div
              className={twMerge(
                "relative transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100",
                (workspace.role !== "admin" || showSkeleton) && "hidden",
              )}
            >
              {session?.user.id !== memberId && (
                <Dropdown
                  items={[
                    {
                      label: t`Edit permissions`,
                      action: () =>
                        openModal(
                          "EDIT_MEMBER_PERMISSIONS",
                          memberPublicId,
                          memberEmail ?? "",
                        ),
                    },
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
                  ariaLabel={t`Member options`}
                  buttonClassName="h-6 w-6 hover:bg-light-400 dark:hover:bg-dark-300"
                >
                  <HiEllipsisHorizontal
                    size={16}
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
      <PageHead title={t`Members | ${workspace.name}`} />
      <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
        <div className="mb-8 flex w-full justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold tracking-tight text-neutral-900 sm:text-base dark:text-dark-1000">
              {t`Members`}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && !!data && (
              <>
                {!isPaidPlan && (
                  <Link
                    href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/members")}`}
                    className="hidden items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-center text-[11px] text-emerald-700 lg:flex dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    <HiBolt />
                    <span className="ml-1 font-medium">{t`Upgrade`}</span>
                  </Link>
                )}
                <div
                  className={twMerge(
                    "flex items-center rounded-full border px-2 py-0.5 text-center text-[11px]",
                    isPaidPlan
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "border-light-300 bg-light-50 text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900",
                  )}
                >
                  <span className="font-medium">
                    {isProPlan
                      ? t`Pro Plan`
                      : isTeamPlan
                        ? t`Team Plan`
                        : t`Free Plan`}
                  </span>
                </div>
                {isPaidPlan && (unlimitedSeats || totalSeats !== null) && (
                  <div className="flex items-center rounded-full border border-light-300 bg-light-50 px-2 py-0.5 text-center text-[11px] text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
                    <span className="font-medium">
                      {unlimitedSeats
                        ? t`Unlimited seats`
                        : `${activeMembers}/${totalSeats} ${t`seats`}`}
                    </span>
                  </div>
                )}
              </>
            )}
            <Button
              size="sm"
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
                      data?.members.map((member) => {
                        const isPendingInvite = member.status === "invited";

                        return renderTableRow({
                          key: member.publicId,
                          memberPublicId: member.publicId,
                          memberId: member.user?.id,
                          memberName: member.user?.name,
                          memberEmail: member.user?.email ?? member.email,
                          memberImage: member.user?.image,
                          memberRole: member.role,
                          memberStatus: member.status,
                          showPendingIcon: isPendingInvite,
                        });
                      })}

                    {isLoading && (
                      <>
                        {renderTableRow({ showSkeleton: true })}
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
              subscriptions={subscriptions}
              unlimitedSeats={unlimitedSeats}
              memberCount={memberCount}
              seatLimit={seatLimit}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "REMOVE_MEMBER"}
          >
            <DeleteMemberConfirmation />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_MEMBER_PERMISSIONS"}
            centered
          >
            <EditMemberPermissionsModal />
          </Modal>
        </>
      </div>
    </>
  );
}
