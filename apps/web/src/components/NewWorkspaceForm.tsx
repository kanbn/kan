import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface FormValues {
  name: string;
}

export function NewWorkspaceForm() {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const { switchWorkspace } = useWorkspace();
  const { register, handleSubmit } = useForm<FormValues>();
  const utils = api.useUtils();

  const createWorkspace = api.workspace.create.useMutation({
    onSuccess: (values) => {
      if (values.publicId && values.name) {
        utils.workspace.all.invalidate();
        switchWorkspace({
          publicId: values.publicId,
          name: values.name,
          description: values.description,
          slug: values.slug,
          plan: values.plan,
        });
        closeModal();
      }
    },
    onError: () => {
      showPopup({
        header: t`Unable to create workspace`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#workspace-name");
    if (nameElement) nameElement.focus();
  }, []);

  const onSubmit = (values: FormValues) => {
    createWorkspace.mutate({
      name: values.name,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`New workspace`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="workspace-name"
          placeholder={t`Workspace name`}
          {...register("name")}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          <Button type="submit" isLoading={createWorkspace.isPending}>
            {t`Create workspace`}
          </Button>
        </div>
      </div>
    </form>
  );
}
