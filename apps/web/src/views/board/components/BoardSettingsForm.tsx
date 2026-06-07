import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { z } from "zod";

import { colours } from "@kan/shared/constants";

import Button from "~/components/Button";
import Input from "~/components/Input";
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
      backgroundColor: backgroundColor ?? "",
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

  const resetBackground = () => {
    updateBoard.mutate({
      boardPublicId,
      backgroundColor: null,
    });
  };

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
    </form>
  );
}
