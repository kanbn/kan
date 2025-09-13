import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const schema = z.object({
  name: z
    .string()
    .min(3, { message: t`Workspace name must be at least 3 characters long` })
    .max(24, { message: t`Workspace name cannot exceed 24 characters` }),
});

type FormValues = z.infer<typeof schema>;

const UpdateWorkspaceNameForm = ({
  workspacePublicId,
  workspaceName,
}: {
  workspacePublicId: string;
  workspaceName: string;
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: workspaceName,
    },
  });

  const updateWorkspaceName = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Workspace name updated`,
        message: t`Your workspace name has been updated.`,
        icon: "success",
      });
      try {
        await utils.workspace.all.refetch();
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    onError: () => {
      showPopup({
        header: t`Error updating workspace name`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateWorkspaceName.mutate({
      workspacePublicId,
      name: data.name,
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input {...register("name")} errorMessage={errors.name?.message} />
      </div>
      {isDirty && (
        <div>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            disabled={updateWorkspaceName.isPending}
            isLoading={updateWorkspaceName.isPending}
          >
            {t`Update`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateWorkspaceNameForm;
