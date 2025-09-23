import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import type { InviteMemberInput } from "@kan/api/types";
import type { Subscription } from "@kan/shared/utils";
import { authClient } from "@kan/auth/client";
import { getSubscriptionByPlan } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function InviteMemberForm({
  numberOfMembers,
  subscriptions,
  unlimitedSeats,
  userId,
}: {
  numberOfMembers: number;
  subscriptions: Subscription[] | undefined;
  unlimitedSeats: boolean;
  userId: string | undefined;
}) {
  const utils = api.useUtils();
  const [isCreateAnotherEnabled, setIsCreateAnotherEnabled] = useState(false);
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

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

  const refetchBoards = () => utils.board.all.refetch();

  const inviteMember = api.member.invite.useMutation({
    onSuccess: async () => {
      closeModal();
      await utils.workspace.byId.refetch();
      await refetchBoards();
    },
    onError: (error) => {
      reset();
      if (!isCreateAnotherEnabled) closeModal();

      if (error.data?.code === "CONFLICT") {
        showPopup({
          header: t`Error inviting member`,
          message: t`User is already a member of this workspace`,
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
  });

  const teamSubscription = getSubscriptionByPlan(subscriptions, "team");
  const proSubscription = getSubscriptionByPlan(subscriptions, "pro");

  const hasTeamSubscription = !!teamSubscription;
  const hasProSubscription = !!proSubscription;

  let isYearly = false;
  let price = t`$10/month`;
  let billingType = t`monthly billing`;

  if (teamSubscription?.periodStart && teamSubscription?.periodEnd) {
    const periodStartDate = new Date(teamSubscription.periodStart);
    const periodEndDate = new Date(teamSubscription.periodEnd);
    const diffInDays = Math.round(
      (periodEndDate.getTime() - periodStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    isYearly = diffInDays > 31;
    price = isYearly ? t`$8/month` : t`$10/month`;
    billingType = isYearly ? t`billed annually` : t`billed monthly`;
  }

  const onSubmit = (member: InviteMemberInput) => {
    inviteMember.mutate(member);
  };

  const handleUpgrade = async () => {
    const { data, error } = await authClient.subscription.upgrade({
      plan: "team",
      referenceId: workspace.publicId,
      metadata: { userId },
      seats: numberOfMembers,
      successUrl: "/members",
      cancelUrl: "/members",
      returnUrl: "/members",
      disableRedirect: true,
    });

    if (data?.url) {
      window.location.href = data.url;
    }

    if (error) {
      showPopup({
        header: t`Error upgrading subscription`,
        message: t`Please try again later, or contact customer support.`,
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
        <div className="text-neutral-9000 flex w-full items-center justify-between pb-4 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Add member`}</h2>
          <button
            type="button"
            className="hover:bg-li ght-300 rounded p-1 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="dark:text-dark-9000 text-light-900" />
          </button>
        </div>
        <Input
          id="email"
          placeholder={t`Email`}
          disabled={
            env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
            !hasTeamSubscription &&
            !hasProSubscription
          }
          {...register("email", { required: true })}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
          errorMessage={errors.email?.message}
        />

        {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && (
          <div className="mt-3 rounded-md bg-light-100 p-3 text-xs text-light-900 dark:bg-dark-200 dark:text-dark-900">
            {hasTeamSubscription || hasProSubscription ? (
              <div>
                <span className="font-medium text-emerald-500 dark:text-emerald-400">
                  {hasTeamSubscription ? t`Team Plan` : t`Pro Plan ∞`}
                </span>
                <p className="mt-1">
                  {unlimitedSeats
                    ? t`You have unlimited seats with your Pro Plan. There is no additional charge for new members!`
                    : t`Adding a new member will cost an additional ${price} (${billingType}) per seat.`}
                </p>
              </div>
            ) : (
              <div>
                <span className="font-medium text-light-950 dark:text-dark-950">
                  {t`Free Plan`}
                </span>
                <p className="mt-1">
                  {t`Inviting members requires a Team Plan. You'll be redirected to upgrade your workspace.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        {(hasTeamSubscription || hasProSubscription) &&
          env("NEXT_PUBLIC_KAN_ENV") === "cloud" && (
            <Toggle
              label={t`Invite another`}
              isChecked={isCreateAnotherEnabled}
              onChange={() =>
                setIsCreateAnotherEnabled(!isCreateAnotherEnabled)
              }
            />
          )}
        <div>
          {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          !hasTeamSubscription &&
          !hasProSubscription ? (
            <Button
              type="button"
              onClick={handleUpgrade}
              className="inline-flex w-full justify-center rounded-md bg-light-1000 px-3 py-2 text-sm font-semibold text-light-50 shadow-sm focus-visible:outline-none dark:bg-dark-1000 dark:text-dark-50"
            >
              {t`Upgrade to Team Plan`}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={inviteMember.isPending}
              isLoading={inviteMember.isPending}
              className="inline-flex w-full justify-center rounded-md bg-light-1000 px-3 py-2 text-sm font-semibold text-light-50 shadow-sm focus-visible:outline-none dark:bg-dark-1000 dark:text-dark-50"
            >
              {t`Invite member`}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
