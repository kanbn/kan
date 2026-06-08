import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiCheck, HiLink, HiXMark } from "react-icons/hi2";
import { z } from "zod";

import { colours } from "@kan/shared/constants";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const INITIAL_BOARD_BACKGROUND_COLOR =
  colours.find((colour) => colour.name === "Teal")?.code ?? "#000000";

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function BoardSettingsForm({
  boardPublicId,
  backgroundColor,
  workspaceSlug,
  boardSlug,
  visibility,
  queryParams,
}: {
  boardPublicId: string;
  backgroundColor: string | null;
  workspaceSlug: string;
  boardSlug: string;
  visibility: string;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const schema = z.object({
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      backgroundColor: backgroundColor ?? "",
      slug: boardSlug,
    },
    mode: "onChange",
  });

  const selectedColour = backgroundColor;

  const { data: board, isLoading } = api.board.byId.useQuery(
    { boardPublicId: boardPublicId ?? "" },
    { enabled: !!boardPublicId && boardPublicId.length >= 12 },
  );

  const updateBoard = api.board.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update board settings`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
      await utils.board.bySlug.invalidate();
    },
  });

  const setColour = (colourCode: string | null) => {
    updateBoard.mutate({
      boardPublicId,
      backgroundColor: colourCode,
    });
  };

  const slug = watch("slug");

  const [debouncedSlug] = useDebounce(slug, 500);

  const updateBoardSlug = api.board.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update board URL`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      closeModal();
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

  useEffect(() => {
    const backgroundColorElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#board-background-color");
    if (backgroundColorElement) backgroundColorElement.focus();
  }, []);

  return (
    <form>
      <div className="p-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`Board settings`}
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

        <div className="mb-3 text-sm text-light-900 dark:text-dark-900">
          {t`Background color`}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* None / clear */}
          <button
            type="button"
            aria-label={t`No cover colour`}
            onClick={() => setColour(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-light-400 bg-light-50 text-light-900 hover:border-light-600 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-900 dark:hover:border-dark-600"
          >
            {selectedColour === null ? (
              <HiCheck className="h-4 w-4" />
            ) : (
              <HiXMark className="h-4 w-4" />
            )}
          </button>
          {colours.map((colour) => {
            const isSelected = selectedColour === colour.code;
            return (
              <button
                key={colour.code}
                type="button"
                aria-label={colour.name}
                title={colour.name}
                onClick={() => setColour(colour.code)}
                style={{ backgroundColor: colour.code }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 hover:ring-2 hover:ring-light-600 dark:border-white/10 dark:hover:ring-dark-600"
              >
                {isSelected && <HiCheck className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
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
      </div>
    </form>
  );
}
