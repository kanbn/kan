import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import { HiArrowUpTray, HiCheck, HiMiniPlus, HiXMark } from "react-icons/hi2";

import type { GetCardByIdOutput } from "@kan/api/types";
import { colours } from "@kan/shared/constants";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { uploadAttachment } from "~/utils/attachmentUpload";
import { getContrastingTextColour } from "~/utils/cardCovers";
import { invalidateCard } from "~/utils/cardInvalidation";

interface ImageAttachment {
  publicId: string;
  contentType: string;
  originalFilename: string | null;
  url: string | null;
}

const supportedImageContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const supportedImageFilename = /\.(?:avif|gif|jpe?g|png|webp)$/i;

interface CardCoverSelectorProps {
  cardPublicId: string;
  cover: GetCardByIdOutput["cover"] | undefined;
  attachments?: ImageAttachment[];
  isLoading?: boolean;
  disabled?: boolean;
}

export function CardCoverSelector({
  cardPublicId,
  cover,
  attachments,
  isLoading = false,
  disabled = false,
}: CardCoverSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const selectedColour = cover?.kind === "colour" ? cover.colourCode : null;
  const selectedAttachmentPublicId =
    cover?.kind === "attachment" ? cover.attachmentPublicId : null;
  const imageAttachments =
    attachments?.filter(
      (attachment) =>
        attachment.url &&
        (supportedImageContentTypes.has(attachment.contentType) ||
          supportedImageFilename.test(attachment.originalFilename ?? "")),
    ) ?? [];

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
        utils.board.coverUrls.invalidate(),
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

  const setAttachment = (attachmentPublicId: string) => {
    updateCover.mutate({
      cardPublicId,
      cover: {
        kind: "attachment",
        attachmentPublicId,
        size: cover?.size ?? "normal",
      },
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);

    let attachment: Awaited<ReturnType<typeof uploadAttachment>>;
    try {
      attachment = await uploadAttachment(cardPublicId, file);
    } catch {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload attachment. Please try again.`,
        icon: "error",
      });
      setIsUploading(false);
      return;
    }

    try {
      await updateCover.mutateAsync({
        cardPublicId,
        cover: {
          kind: "attachment",
          attachmentPublicId: attachment.publicId,
          size: cover?.size ?? "normal",
        },
      });
    } catch {
      // The mutation reports the error and restores the previous cover.
    } finally {
      setIsUploading(false);
    }
  };

  const clearCover = () => {
    updateCover.mutate({ cardPublicId, cover: null });
  };

  const setSize = (size: "normal" | "full") => {
    if (cover?.kind === "colour") {
      updateCover.mutate({
        cardPublicId,
        cover: { kind: "colour", colourCode: cover.colourCode, size },
      });
    } else if (cover?.kind === "attachment") {
      updateCover.mutate({
        cardPublicId,
        cover: {
          kind: "attachment",
          attachmentPublicId: cover.attachmentPublicId,
          size,
        },
      });
    }
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
        {cover ? (
          <>
            {selectedColour && (
              <span
                className="mr-2 h-4 w-7 rounded-sm border border-black/10 dark:border-white/10"
                style={{ backgroundColor: selectedColour }}
                aria-hidden="true"
              />
            )}
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
          <div className="absolute right-0 top-full z-20 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-md border border-light-200 bg-light-50 p-3 shadow-lg dark:border-dark-200 dark:bg-dark-100">
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
                  disabled={!cover || updateCover.isPending}
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
            <p className="mt-4 text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Images`}
            </p>
            {imageAttachments.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {imageAttachments.map((attachment) => {
                  const isSelected =
                    selectedAttachmentPublicId === attachment.publicId;

                  return (
                    <button
                      key={attachment.publicId}
                      type="button"
                      aria-label={
                        attachment.originalFilename ?? t`Image attachment`
                      }
                      aria-pressed={isSelected}
                      title={attachment.originalFilename ?? undefined}
                      onClick={() => setAttachment(attachment.publicId)}
                      disabled={updateCover.isPending || isUploading}
                      className={`relative h-14 overflow-hidden rounded border bg-light-200 disabled:opacity-60 dark:bg-dark-200 ${isSelected ? "border-light-1000 ring-2 ring-light-1000 dark:border-dark-1000 dark:ring-dark-1000" : "border-light-300 hover:border-light-600 focus-visible:border-light-600 dark:border-dark-300 dark:hover:border-dark-600 dark:focus-visible:border-dark-600"}`}
                    >
                      {/* The picker uses the signed attachment URL as-is. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url ?? undefined}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-light-50 text-light-1000 shadow dark:bg-dark-50 dark:text-dark-1000">
                          <HiCheck className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-light-700 dark:text-dark-700">
                {t`Upload an image or attach one to this card.`}
              </p>
            )}
            <input
              ref={uploadInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading || updateCover.isPending}
            />
            <button
              type="button"
              onClick={() => uploadInput.current?.click()}
              disabled={isUploading || updateCover.isPending}
              className="mt-3 flex h-8 w-full items-center rounded-[5px] px-2 text-sm text-light-900 hover:bg-light-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-900 dark:hover:bg-dark-200"
            >
              <HiArrowUpTray className="mr-2 h-4 w-4" />
              {isUploading ? t`Uploading…` : t`Upload image`}
            </button>
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
