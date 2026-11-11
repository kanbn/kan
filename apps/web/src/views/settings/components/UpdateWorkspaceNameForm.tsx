import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  getGetWorkspacesQueryKey,
  useUpdateWorkspace,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";

const schema = z.object({
  name: z
    .string()
    .min(3, { message: t`Workspace name must be at least 3 characters long` })
    .max(64, { message: t`Workspace name cannot exceed 64 characters` }),
});

type FormValues = z.infer<typeof schema>;

const UpdateWorkspaceNameForm = ({
  workspacePublicId,
  workspaceName,
  disabled = false,
}: {
  workspacePublicId: string;
  workspaceName: string;
  disabled?: boolean;
}) => {
  const queryClient = useQueryClient();
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

  const updateWorkspaceName = useUpdateWorkspace({
    mutation: {
      onSuccess: async () => {
        showPopup({
          header: t`Workspace name updated`,
          message: t`Your workspace name has been updated.`,
          icon: "success",
        });
        try {
          await queryClient.refetchQueries({
            queryKey: getGetWorkspacesQueryKey(),
          });
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
    },
  });

  const onSubmit = (data: FormValues) => {
    updateWorkspaceName.mutate({
      workspacePublicId,
      data: { name: data.name },
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input
          aria-label={t`Workspace name`}
          {...register("name")}
          errorMessage={errors.name?.message}
          disabled={disabled}
        />
      </div>
      {isDirty && !disabled && (
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
