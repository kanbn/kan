import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const INITIAL_BOARD_BACKGROUND_COLOR = "#0d9488";

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function BoardSettingsForm({
  boardPublicId,
  backgroundColor,
  queryParams,
}: {
  boardPublicId: string;
  backgroundColor: string | null;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const schema = z.object({
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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
      backgroundColor: backgroundColor ?? INITIAL_BOARD_BACKGROUND_COLOR,
    },
    mode: "onChange",
  });

  const updateBoard = api.board.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update board settings`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      closeModal();
      await utils.board.byId.invalidate(queryParams);
      await utils.board.bySlug.invalidate();
    },
  });

  const onSubmit = (data: FormValues) => {
    updateBoard.mutate({
      boardPublicId,
      backgroundColor: data.backgroundColor,
    });
  };

  const resetBackground = () => {
    updateBoard.mutate({
      boardPublicId,
      backgroundColor: null,
    });
  };

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#board-background-color");
    if (nameElement) nameElement.focus();
  }, []);

  const selectedColor = watch("backgroundColor");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
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
        <div className="flex items-center gap-3">
          <Input
            id="board-background-color"
            type="color"
            {...register("backgroundColor")}
            onChange={(e) => {
              setValue("backgroundColor", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            className="h-10 w-14 cursor-pointer rounded-md border border-light-600 p-1 dark:border-dark-600"
          />
          <div
            className="h-10 flex-1 rounded-md border border-light-400 dark:border-dark-400"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
        {errors.backgroundColor?.message && (
          <p className="mt-2 text-sm text-red-500">{errors.backgroundColor.message}</p>
        )}
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            isLoading={updateBoard.isPending}
            onClick={resetBackground}
          >
            {t`Reset`}
          </Button>
          <Button
            type="submit"
            isLoading={updateBoard.isPending}
            disabled={!isDirty || updateBoard.isPending}
          >
            {t`Save`}
          </Button>
        </div>
      </div>
    </form>
  );
}
