import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import type { InviteMemberInput } from "@kan/api/types";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function InviteMemberForm() {
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

  const onSubmit = async (_data: InviteMemberInput) => {
    const { data, error } = await authClient.subscription.upgrade({
      plan: "team",
      // subscriptionId: "sub_123",
      metadata: { userId: "123" },
      seats: 1,
      successUrl: "/members",
      cancelUrl: "/members",
      returnUrl: "/members",
      disableRedirect: true,
    });

    if (data?.url) {
      window.location.href = data.url;
    }

    // console.log(data, error);
    // inviteMember.mutate(data);
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
          {...register("email", { required: true })}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
          errorMessage={errors.email?.message}
        />
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Toggle
          label={t`Invite another`}
          isChecked={isCreateAnotherEnabled}
          onChange={() => setIsCreateAnotherEnabled(!isCreateAnotherEnabled)}
        />
        <div>
          <Button
            type="submit"
            isLoading={inviteMember.isPending}
            className="inline-flex w-full justify-center rounded-md bg-light-1000 px-3 py-2 text-sm font-semibold text-light-50 shadow-sm focus-visible:outline-none dark:bg-dark-1000 dark:text-dark-50"
          >
            {t`Invite member`}
          </Button>
        </div>
      </div>
    </form>
  );
}
