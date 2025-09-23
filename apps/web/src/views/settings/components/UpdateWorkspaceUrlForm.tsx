import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useForm } from "react-hook-form";
import { HiCheck, HiMiniStar } from "react-icons/hi2";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const UpdateWorkspaceUrlForm = ({
  workspacePublicId,
  workspaceUrl,
  workspacePlan,
}: {
  workspacePublicId: string;
  workspaceUrl: string;
  workspacePlan: "free" | "pro" | "enterprise";
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { openModal } = useModal();

  const schema = z.object({
    slug: z
      .string()
      .min(3, {
        message: t`URL must be at least 3 characters long`,
      })
      .max(24, { message: t`URL cannot exceed 24 characters` })
      .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/, {
        message: t`URL can only contain letters, numbers, and hyphens`,
      }),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      slug: workspaceUrl,
    },
    mode: "onChange",
  });

  const slug = watch("slug");

  const updateWorkspaceSlug = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Workspace slug updated`,
        message: t`Your workspace slug has been updated.`,
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
        header: t`Error updating workspace URL`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const [debouncedSlug] = useDebounce(slug, 500);

  const isTyping = slug !== debouncedSlug;

  const checkWorkspaceSlugAvailability =
    api.workspace.checkSlugAvailability.useQuery(
      {
        workspaceSlug: debouncedSlug,
      },
      {
        enabled:
          !!debouncedSlug && debouncedSlug !== workspaceUrl && !errors.slug,
      },
    );

  const isWorkspaceSlugAvailable = checkWorkspaceSlugAvailability.data;

  const onSubmit = (data: FormValues) => {
    if (!isWorkspaceSlugAvailable?.isAvailable) return;

    if (workspacePlan !== "pro" && env("NEXT_PUBLIC_KAN_ENV") === "cloud")
      return openModal("UPGRADE_TO_PRO", data.slug);

    updateWorkspaceSlug.mutate({
      workspacePublicId,
      slug: data.slug,
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input
          {...register("slug")}
          className={`${
            isWorkspaceSlugAvailable?.isAvailable ||
            (workspacePlan === "pro" && slug === workspaceUrl)
              ? "focus:ring-yellow-500 dark:focus:ring-yellow-500"
              : ""
          }`}
          errorMessage={
            errors.slug?.message ||
            (isWorkspaceSlugAvailable?.isAvailable === false
              ? t`This workspace username has already been taken`
              : undefined)
          }
          prefix={
            env("NEXT_PUBLIC_KAN_ENV") === "cloud"
              ? "kan.bn/"
              : `${env("NEXT_PUBLIC_BASE_URL")}/`
          }
          iconRight={
            isWorkspaceSlugAvailable?.isAvailable ||
            (workspacePlan === "pro" && slug === workspaceUrl) ? (
              <HiMiniStar className="h-4 w-4 text-yellow-500" />
            ) : isWorkspaceSlugAvailable?.isAvailable ? (
              <HiCheck className="h-4 w-4 dark:text-dark-1000" />
            ) : null
          }
        />
      </div>
      {isDirty && (
        <div>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            disabled={
              updateWorkspaceSlug.isPending ||
              checkWorkspaceSlugAvailability.isPending ||
              isWorkspaceSlugAvailable?.isAvailable === false ||
              isTyping
            }
            isLoading={updateWorkspaceSlug.isPending}
          >
            {t`Update`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateWorkspaceUrlForm;
