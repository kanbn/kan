import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import { HiArrowUpTray, HiCheck, HiXMark } from "react-icons/hi2";

import { colours } from "@kan/shared/constants";

import type { RouterOutputs } from "~/utils/api";
import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type BoardBackgroundValue = RouterOutputs["board"]["byId"]["background"];

const supportedImageContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const maxImageBytes = 50 * 1024 * 1024;

export function BoardBackgroundForm({
  boardPublicId,
  background,
}: {
  boardPublicId: string;
  background: BoardBackgroundValue | undefined;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const selectedColour =
    background?.kind === "colour" ? background.colourCode : null;
  const selectedPaletteColour = colours.some(
    (colour) => colour.code === selectedColour,
  );

  const invalidateBoards = async () => {
    await Promise.all([
      utils.board.all.invalidate(),
      utils.board.byId.invalidate(),
      utils.board.bySlug.invalidate(),
      utils.workspace.bySlug.invalidate(),
      utils.boardBackground.urls.invalidate(),
    ]);
  };

  const updateBackground = api.board.update.useMutation({
    onSuccess: async () => {
      await invalidateBoards();
      closeModal();
    },
    onError: () => {
      showPopup({
        header: t`Unable to update board background`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });
  const generateUploadUrl = api.boardBackground.generateUploadUrl.useMutation();
  const confirmUpload = api.boardBackground.confirm.useMutation();

  const setColour = (colourCode: string) => {
    updateBackground.mutate({
      boardPublicId,
      background: { kind: "colour", colourCode },
    });
  };

  const clearBackground = () => {
    updateBackground.mutate({ boardPublicId, background: null });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!supportedImageContentTypes.has(file.type)) {
      showPopup({
        header: t`Unsupported image`,
        message: t`Choose a JPEG, PNG, WebP, GIF, or AVIF image.`,
        icon: "error",
      });
      return;
    }

    if (file.size > maxImageBytes) {
      showPopup({
        header: t`Image is too large`,
        message: t`Choose an image smaller than 50 MB.`,
        icon: "error",
      });
      return;
    }

    setIsUploading(true);
    try {
      const upload = await generateUploadUrl.mutateAsync({
        boardPublicId,
        filename: file.name,
        contentType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif"
          | "image/avif",
        size: file.size,
      });
      const response = await fetch(upload.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");

      await confirmUpload.mutateAsync({
        boardPublicId,
        key: upload.key,
        size: file.size,
      });
      await invalidateBoards();
      closeModal();
    } catch {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload the board background. Please try again.`,
        icon: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isPending = updateBackground.isPending || isUploading;

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-medium">{t`Change background`}</h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
            onClick={closeModal}
            aria-label={t`Close`}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        {selectedColour && !selectedPaletteColour && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Imported colour`}
            </p>
            <div
              className="flex h-10 items-center justify-center rounded-md border border-black/10 text-xs font-medium text-white shadow-sm dark:border-white/10"
              style={{ backgroundColor: selectedColour }}
            >
              {selectedColour}
            </div>
          </div>
        )}

        <p className="mb-2 text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Colours`}
        </p>
        <div className="grid grid-cols-4 gap-2">
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
                disabled={isPending}
                className="flex h-10 items-center justify-center rounded-md border border-black/10 hover:ring-2 hover:ring-light-600 focus-visible:ring-2 focus-visible:ring-light-600 disabled:opacity-60 dark:border-white/10 dark:hover:ring-dark-600 dark:focus-visible:ring-dark-600"
                style={{ backgroundColor: colour.code }}
              >
                {isSelected && <HiCheck className="h-5 w-5 text-white" />}
              </button>
            );
          })}
        </div>

        <input
          ref={uploadInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={handleUpload}
          disabled={isPending}
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-5"
          iconLeft={<HiArrowUpTray className="h-4 w-4" />}
          onClick={() => uploadInput.current?.click()}
          isLoading={isUploading}
          disabled={isPending}
        >
          {isUploading ? t`Uploading…` : t`Upload image`}
        </Button>
      </div>

      <div className="mt-5 flex justify-end border-t border-light-600 px-5 py-5 dark:border-dark-600">
        <Button
          type="button"
          variant="secondary"
          onClick={clearBackground}
          isLoading={updateBackground.isPending}
          disabled={!background || isPending}
        >
          {t`Remove background`}
        </Button>
      </div>
    </div>
  );
}
