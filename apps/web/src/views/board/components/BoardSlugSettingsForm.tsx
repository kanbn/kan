import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useForm } from "react-hook-form";
import { HiCheck, HiLink, HiXMark } from "react-icons/hi2";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface QueryParams {
  boardPublicId: string;
}

export function BoardSlugSettingsForm({
  boardPublicId,
  boardSlug,
  workspaceSlug,
  visibility,
  queryParams,
}: {
  boardPublicId: string;
  boardSlug: string;
  workspaceSlug: string;
  visibility: string;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const schema = z.object({
    slug: z
      .string()
      .min(3, {
        message: t`Board URL must be at least 3 characters long`,
      })
      .max(60, { message: t`Board URL cannot exceed 60 characters` })
      .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/, {
        message: t`Board URL can only contain letters, numbers, and hyphens`,
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
      slug: boardSlug,
    },
    mode: "onChange",
  });

  const slug = watch("slug");
  const [debouncedSlug] = useDebounce(slug, 500);

  const updateBoardSlug = api.board.update.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Board URL updated`,
        message: t`The URL of your board has been updated.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to update board URL`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      // closeModal();
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const checkBoardSlugAvailability = api.board.checkSlugAvailability.useQuery(
    {
      boardSlug: debouncedSlug,
      boardPublicId,
    },
    {
      enabled: !!debouncedSlug && debouncedSlug !== boardSlug && !errors.slug,
    },
  );

  const isBoardSlugAvailable = checkBoardSlugAvailability.data;

  const onSubmitBoardSlug = (data: FormValues) => {
    if (!isBoardSlugAvailable) return;
    if (isBoardSlugAvailable.isReserved) return;

    updateBoardSlug.mutate({
      slug: data.slug,
      boardPublicId,
    });
  };

  const linkBaseUrl = env("NEXT_PUBLIC_BASE_URL");

  const isPublic = visibility === "public";
  const boardUrl = isPublic
    ? `${linkBaseUrl}/${workspaceSlug}/${boardSlug}`
    : `${linkBaseUrl}/boards/${boardPublicId}`;

  return (
    <form className="mb-10">
      <div className="mb-3 text-sm text-light-900 dark:text-dark-900">
        {t`Board URL`}
      </div>

      <div className="items-left flex">
        <Input
          id="board-slug"
          {...register("slug")}
          errorMessage={
            errors.slug?.message ||
            (isBoardSlugAvailable?.isReserved
              ? t`This board URL has already been taken`
              : undefined)
          }
          prefix={`${env("NEXT_PUBLIC_KAN_ENV") === "cloud" ? "kan.bn" : env("NEXT_PUBLIC_BASE_URL")}/${workspaceSlug}/`}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmitBoardSlug)();
            }
          }}
          iconRight={
            !!errors.slug?.message || isBoardSlugAvailable?.isReserved ? (
              <HiXMark className="h-4 w-4 text-red-500" />
            ) : (
              <HiCheck className="h-4 w-4 dark:text-dark-1000" />
            )
          }
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard
              .writeText(boardUrl)
              .then(() =>
                showPopup({
                  header: t`Link copied`,
                  icon: "success",
                  message: t`Board URL copied to clipboard`,
                }),
              )
              .catch(() => undefined);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-light-200 dark:hover:bg-dark-200"
          aria-label={t`Copy board link`}
        >
          <HiLink className="h-[13px] w-[13px]" />
        </button>
      </div>
      <div className="flex pt-5">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            href="/settings/workspace"
            onClick={closeModal}
          >
            {t`Edit workspace URL`}
          </Button>
          {isDirty &&
            !updateBoardSlug.isPending &&
            errors.slug?.message === undefined &&
            !isBoardSlugAvailable?.isReserved &&
            !checkBoardSlugAvailability.isLoading && (
              <Button
                type="button"
                onClick={handleSubmit(onSubmitBoardSlug)}
                isLoading={updateBoardSlug.isPending}
              >
                {t`Update`}
              </Button>
            )}
        </div>
      </div>
    </form>
  );
}
