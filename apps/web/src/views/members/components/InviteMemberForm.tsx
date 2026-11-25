import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import type { Subscription } from "@kan/shared/utils";
import {
  getGetWorkspaceQueryKey,
  useCreateInviteLink,
  useDeactivateInviteLink,
  useGetActiveInviteLink,
  useInviteMember,
} from "@kan/api-client/hooks";
import { env } from "@kan/shared/env";
import { getSubscriptionByPlan } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { getApiErrorStatus } from "~/utils/apiError";
import { useBoardCache } from "~/utils/boardCache";

interface InviteMemberInput {
  email: string;
  workspacePublicId: string;
}

export function InviteMemberForm({
  subscriptions,
  unlimitedSeats,
  memberCount,
  seatLimit,
}: {
  subscriptions: Subscription[] | undefined;
  unlimitedSeats: boolean;
  memberCount: number;
  seatLimit: number | null;
}) {
  const boardCache = useBoardCache();
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const isEmailEnabled = env("NEXT_PUBLIC_DISABLE_EMAIL") !== "true";

  const InviteMemberSchema = z.object({
    email: z.string().email({ message: t`Invalid email address` }),
    workspacePublicId: z.string(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    defaultValues: {
      email: "",
      workspacePublicId: workspace.publicId || "",
    },
    resolver: zodResolver(InviteMemberSchema),
  });

  const refetchBoards = () => boardCache.refetchLists();

  const { data: activeInviteLink, refetch: _refetchInviteLink } =
    useGetActiveInviteLink(workspace.publicId || "", {
      query: { enabled: !!workspace.publicId },
    });

  useEffect(() => {
    if (activeInviteLink) {
      setInviteLink(activeInviteLink.data.inviteLink ?? "");
    }
  }, [activeInviteLink]);

  const inviteMember = useInviteMember({
    mutation: {
      onSuccess: async () => {
        closeModal();
        await queryClient.refetchQueries({
          queryKey: getGetWorkspaceQueryKey(workspace.publicId),
        });
        await refetchBoards();
      },
      onError: (error) => {
        reset();
        if (!inviteLink) closeModal();

        const status = getApiErrorStatus(error);

        if (status === 409) {
          showPopup({
            header: t`Error inviting member`,
            message: t`User is already a member of this workspace`,
            icon: "error",
          });
        } else if (
          status === 403 &&
          error instanceof Error &&
          error.message === "SEAT_LIMIT_REACHED"
        ) {
          showPopup({
            header: t`Seat limit reached`,
            message: t`You've reached your ${seatLimit ?? 0}-seat limit. Please upgrade your plan to add more members.`,
            icon: "error",
          });
        } else {
          showPopup({
            header: t`Error inviting member`,
            message: t`Please try again later, or contact customer support.`,
            icon: "error",
          });
        }
      },
    },
  });

  const createInviteLink = useCreateInviteLink({
    mutation: {
      onSuccess: (result) => {
        setInviteLink(result.data.inviteLink);
      },
      onError: (error) => {
        if (getApiErrorStatus(error) === 403) {
          showPopup({
            header: t`Subscription Required`,
            message: t`Invite links require a Team or Pro subscription. Please upgrade your workspace.`,
            icon: "error",
          });
        } else {
          showPopup({
            header: t`Error creating invite link`,
            message: t`Please try again later.`,
            icon: "error",
          });
        }
      },
    },
  });

  const deactivateInviteLink = useDeactivateInviteLink({
    mutation: {
      onSuccess: () => {
        setInviteLink("");
      },
      onError: () => {
        showPopup({
          header: t`Error deactivating invite link`,
          message: t`Please try again later.`,
          icon: "error",
        });
      },
    },
  });

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const hasTeamSubscription = !!teamSubscription;
  const hasProSubscription = !!proSubscription;
  const isPartnerTier = !!(
    teamSubscription?.partnerTier ?? proSubscription?.partnerTier
  );

  let price = t`$10/month`;
  let billingType = t`monthly billing`;

  if (teamSubscription?.periodStart && teamSubscription.periodEnd) {
    const periodStartDate = new Date(teamSubscription.periodStart);
    const periodEndDate = new Date(teamSubscription.periodEnd);
    const diffInDays = Math.round(
      (periodEndDate.getTime() - periodStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const isYearly = diffInDays > 31;
    price = isYearly ? t`$8/month` : t`$10/month`;
    billingType = isYearly ? t`billed annually` : t`billed monthly`;
  }

  const onSubmit = (member: InviteMemberInput) => {
    inviteMember.mutate({
      workspacePublicId: member.workspacePublicId,
      data: { email: member.email },
    });
  };

  const isFreePlan =
    env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
    !hasTeamSubscription &&
    !hasProSubscription;

  const toggleInviteLink = () => {
    if (isFreePlan) return;

    const mutation = inviteLink ? deactivateInviteLink : createInviteLink;
    mutation.mutate({ workspacePublicId: workspace.publicId });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showPopup({
        header: t`Invite link copied`,
        message: t`Invite link copied to clipboard`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Error`,
        message: t`Failed to copy invite link`,
        icon: "error",
      });
    }
  };

  useEffect(() => {
    const emailElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#email");
    if (emailElement) emailElement.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 dark:text-dark-1000">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">{t`Add member`}</h2>
          <button
            type="button"
            className="hover:bg-li ght-300 rounded-sm p-1 focus:outline-hidden dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={16} className="dark:text-dark-9000 text-light-900" />
          </button>
        </div>
        {isEmailEnabled && (
          <Input
            id="email"
            placeholder={t`Email`}
            disabled={isFreePlan}
            {...register("email", { required: true })}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSubmit(onSubmit)();
              }
            }}
            errorMessage={errors.email?.message}
          />
        )}
        {!isFreePlan && inviteLink && (
          <div className="mt-3">
            <div className="flex items-center rounded-md bg-light-200 py-1 pr-1 pl-3 dark:bg-dark-200">
              <input
                readOnly
                value={inviteLink}
                aria-label={t`Invite link`}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-xs text-light-950 focus:ring-0 focus-visible:outline-hidden dark:text-dark-950"
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={copyToClipboard}
              >
                {copied ? t`Copied` : t`Copy`}
              </Button>
            </div>
            <p className="mt-2 pl-3 text-xs text-light-900 dark:text-dark-900">
              {t`Anyone with this link can join your workspace`}
            </p>
          </div>
        )}

        {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          (isPartnerTier && seatLimit !== null ? (
            <div className="mt-3 text-xs text-light-900 dark:text-dark-900">
              <div className="flex items-center justify-between">
                <span className="font-medium text-light-1000 dark:text-dark-1000">
                  {hasTeamSubscription ? t`Team Plan` : t`Pro Plan`}
                </span>
                <span className="text-light-900 dark:text-dark-900">
                  {memberCount} / {seatLimit} {t`seats`}
                </span>
              </div>
            </div>
          ) : !unlimitedSeats ? (
            <div className="mt-3 text-xs text-light-900 dark:text-dark-900">
              {hasTeamSubscription || hasProSubscription ? (
                <div>
                  <span className="font-medium text-light-1000 dark:text-dark-1000">
                    {hasTeamSubscription ? t`Team Plan` : t`Pro Plan ∞`}
                  </span>
                  <p className="mt-1">
                    {t`Adding a new member will cost an additional ${price} (${billingType}) per seat.`}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-light-950 dark:text-dark-950">
                    {t`Free Plan`}
                  </span>
                  <p className="mt-1">
                    {t`Inviting members requires a Team plan. You'll be redirected to upgrade your workspace.`}
                  </p>
                </div>
              )}
            </div>
          ) : null)}
      </div>

      <div className="mt-5 flex items-center justify-end space-x-4 border-t border-light-400 px-5 py-4 dark:border-dark-400">
        {!isFreePlan && (
          <Toggle
            label={
              inviteLink ? t`Deactivate invite link` : t`Create invite link`
            }
            isChecked={!!inviteLink}
            onChange={toggleInviteLink}
            disabled={
              createInviteLink.isPending || deactivateInviteLink.isPending
            }
          />
        )}
        <div>
          {isFreePlan ? (
            <Button
              size="sm"
              type="button"
              href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/members")}`}
            >
              {t`Choose plan`}
            </Button>
          ) : (
            <Button
              size="sm"
              type="submit"
              disabled={inviteMember.isPending || !isEmailEnabled}
              isLoading={inviteMember.isPending}
            >
              {t`Invite member`}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
