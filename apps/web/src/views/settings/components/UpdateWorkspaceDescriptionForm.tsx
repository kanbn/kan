import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const UpdateWorkspaceDescriptionForm = ({
  workspacePublicId,
  workspaceDescription,
  disabled = false,
}: {
  workspacePublicId: string;
  workspaceDescription: string;
  disabled?: boolean;
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const schema = z.object({
    description: z
      .string()
      .min(3, {
        message: t`Workspace description must be at least 3 characters long`,
      })
      .max(280, {
        message: t`Workspace description cannot exceed 280 characters`,
      }),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      description: workspaceDescription,
    },
  });

  const updateWorkspaceDescription = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Workspace description updated`,
        message: t`Your workspace description has been updated.`,
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
        header: t`Error updating workspace description`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateWorkspaceDescription.mutate({
      workspacePublicId,
      description: data.description,
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input
          {...register("description")}
          errorMessage={errors.description?.message}
          disabled={disabled}
        />
      </div>
      {isDirty && !disabled && (
        <div>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            disabled={updateWorkspaceDescription.isPending}
            isLoading={updateWorkspaceDescription.isPending}
          >
            {t`Update`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateWorkspaceDescriptionForm;
