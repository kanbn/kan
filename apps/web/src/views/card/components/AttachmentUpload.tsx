import { t } from "@lingui/core/macro";
import { useRef, useState } from "react";
import { HiOutlinePaperClip } from "react-icons/hi";

import Button from "~/components/Button";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export function AttachmentUpload({ cardPublicId }: { cardPublicId: string }) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const generateUploadUrl = api.attachment.generateUploadUrl.useMutation();
  const confirmAttachment = api.attachment.confirm.useMutation({
    onSuccess: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
      showPopup({
        header: t`Attachment uploaded`,
        message: t`Your file has been uploaded successfully.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload attachment. Please try again.`,
        icon: "error",
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    setUploading(true);

    try {
      // Generate presigned URL
      const { url, key } = await generateUploadUrl.mutateAsync({
        cardPublicId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      // Upload file to S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Confirm attachment in database
      await confirmAttachment.mutateAsync({
        cardPublicId,
        s3Key: key,
        filename: file.name,
        originalFilename: file.name,
        contentType: file.type,
        size: file.size,
      });
    } catch {
      showPopup({
        header: t`Upload failed`,
        message: t`Failed to upload attachment. Please try again.`,
        icon: "error",
      });
      setUploading(false);
    }
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
      <div>
        <Button
          type="button"
          variant="ghost"
          iconLeft={<HiOutlinePaperClip className="h-4 w-4" />}
          isLoading={uploading}
          disabled={uploading}
          iconOnly
          size="sm"
          onClick={() => inputRef.current?.click()}
        />
      </div>
    </div>
  );
}
