import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const UpdateDisplayNameForm = ({ displayName }: { displayName: string }) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const schema = z.object({
    name: z
      .string()
      .min(3, {
        message: t`Display name must be at least 3 characters long`,
      })
      .max(280, {
        message: t`Display name cannot exceed 280 characters`,
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
      name: displayName,
    },
  });

  const updateDisplayName = api.user.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Display name updated`,
        message: t`Your display name has been updated.`,
        icon: "success",
      });
      try {
        await utils.user.getUser.refetch();
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    onError: () => {
      showPopup({
        header: t`Error updating display name`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateDisplayName.mutate({
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
            disabled={updateDisplayName.isPending}
            isLoading={updateDisplayName.isPending}
          >
            {t`Update`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateDisplayNameForm;
