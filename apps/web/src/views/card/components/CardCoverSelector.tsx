import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiCheck, HiMiniPlus, HiXMark } from "react-icons/hi2";

import type { GetCardByIdOutput } from "@kan/api/types";
import { colours } from "@kan/shared/constants";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { getContrastingTextColour } from "~/utils/cardCovers";
import { invalidateCard } from "~/utils/cardInvalidation";

interface CardCoverSelectorProps {
  cardPublicId: string;
  cover: GetCardByIdOutput["cover"] | undefined;
  isLoading?: boolean;
  disabled?: boolean;
}

export function CardCoverSelector({
  cardPublicId,
  cover,
  isLoading = false,
  disabled = false,
}: CardCoverSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const selectedColour = cover?.kind === "colour" ? cover.colourCode : null;

  const updateCover = api.card.updateCover.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel({ cardPublicId });
      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        const nextCover = update.cover
          ? {
              ...update.cover,
              size: update.cover.size ?? oldCard.cover?.size ?? "normal",
            }
          : null;

        return { ...oldCard, cover: nextCover };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update card cover`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await Promise.all([
        utils.board.byId.invalidate(),
        utils.board.bySlug.invalidate(),
      ]);
    },
  });

  const setColour = (colourCode: string) => {
    updateCover.mutate({
      cardPublicId,
      cover: {
        kind: "colour",
        colourCode,
        size: cover?.size ?? "normal",
      },
    });
  };

  const clearCover = () => {
    updateCover.mutate({ cardPublicId, cover: null });
  };

  const setSize = (size: "normal" | "full") => {
    if (!selectedColour) return;

    updateCover.mutate({
      cardPublicId,
      cover: { kind: "colour", colourCode: selectedColour, size },
    });
  };

  if (isLoading) {
    return (
      <div className="flex w-full">
        <div className="h-8 w-[175px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-center text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={t`Card cover`}
        aria-expanded={isOpen}
        className={`flex h-8 w-full items-center rounded-[5px] border border-light-50 px-2 text-left text-sm text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}
      >
        {selectedColour ? (
          <>
            <span
              className="mr-2 h-4 w-7 rounded-sm border border-black/10 dark:border-white/10"
              style={{ backgroundColor: selectedColour }}
              aria-hidden="true"
            />
            {t`Change cover`}
          </>
        ) : (
          <>
            <HiMiniPlus size={22} className="pr-2" />
            {t`Add cover`}
          </>
        )}
      </button>
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-md border border-light-200 bg-light-50 p-3 shadow-lg dark:border-dark-200 dark:bg-dark-100">
            {selectedColour && (
              <div
                className="mb-3 h-16 rounded border border-black/10 dark:border-white/10"
                style={{ backgroundColor: selectedColour }}
                aria-hidden="true"
              />
            )}
            <p className="text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Size`}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-light-200 p-1 dark:bg-dark-200">
              {(["normal", "full"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={cover?.size === size}
                  onClick={() => setSize(size)}
                  disabled={!selectedColour || updateCover.isPending}
                  className={`rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${cover?.size === size ? "bg-light-50 text-light-1000 shadow-sm dark:bg-dark-100 dark:text-dark-1000" : "text-light-800 hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000"}`}
                >
                  {size === "normal" ? t`Normal` : t`Full`}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {colours.map((colour) => {
                const isSelected = selectedColour === colour.code;
                return (
                  <button
                    key={colour.code}
                    type="button"
                    aria-label={colour.name}
                    aria-pressed={isSelected}
                    title={colour.name}
                    onClick={() => setColour(colour.code)}
                    disabled={updateCover.isPending}
                    className="flex h-8 w-9 items-center justify-center rounded border border-black/10 hover:ring-2 hover:ring-light-600 focus-visible:ring-2 focus-visible:ring-light-600 disabled:opacity-60 dark:border-white/10 dark:hover:ring-dark-600 dark:focus-visible:ring-dark-600"
                    style={{ backgroundColor: colour.code }}
                  >
                    {isSelected && (
                      <HiCheck
                        className="h-4 w-4"
                        style={{ color: getContrastingTextColour(colour.code) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={clearCover}
              disabled={!cover || updateCover.isPending}
              className="mt-3 flex h-8 w-full items-center rounded-[5px] px-2 text-sm text-light-900 hover:bg-light-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-900 dark:hover:bg-dark-200"
            >
              <HiXMark className="mr-2 h-4 w-4" />
              {t`Remove cover`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
