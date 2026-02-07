import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useRef, useState } from "react";
import { HiOutlinePaperClip } from "react-icons/hi";
import { HiCheckBadge } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";
import LoadingSpinner from "~/components/LoadingSpinner";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export function AttachmentUpload({ cardPublicId }: { cardPublicId: string }) {
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
      const response = await fetch(
        `${baseUrl}/api/upload/attachment?cardPublicId=${encodeURIComponent(cardPublicId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type,
            "x-original-filename": file.name,
          },
          body: file,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      void invalidateCard(utils, cardPublicId);
      showPopup({
        header: t`Attachment uploaded`,
        message: t`Your file has been uploaded successfully.`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload attachment. Please try again.`,
        icon: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Upload the first file (or could upload all files)
    const firstFile = files[0];
    if (!firstFile) return;
    await uploadFile(firstFile);
  };

  return (
    <div className="mb-6">
      <input
        ref={inputRef}
        type="file"
        id="attachment-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={twMerge(
          "rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-light-300 bg-light-100 dark:border-dark-300 dark:bg-dark-100"
            : "border-transparent",
        )}
      >
        <div className="flex items-center justify-between p-2">
          <Button
            type="button"
            variant="ghost"
            iconLeft={
              <HiCheckBadge className="h-4 w-4 text-light-950 dark:text-dark-950" />
            }
            iconOnly
            size="sm"
            onClick={() => openModal("ADD_CHECKLIST")}
          />
          <Button
            type="button"
            variant="ghost"
            iconLeft={
              uploading ? (
                <span
                  key="uploading"
                  className="text-light-950 dark:text-dark-950"
                >
                  <LoadingSpinner size="md" />
                </span>
              ) : (
                <HiOutlinePaperClip
                  key="idle"
                  className="h-4 w-4 !animate-none text-light-950 dark:text-dark-950"
                />
              )
            }
            disabled={uploading}
            iconOnly
            size="sm"
            onClick={() => inputRef.current?.click()}
          />
        </div>
      </div>
    </div>
  );
}
