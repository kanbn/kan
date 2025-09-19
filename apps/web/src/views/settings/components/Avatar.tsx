import Image from "next/image";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useCallback, useRef, useState } from "react";
import ReactCrop from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { getAvatarUrl } from "~/utils/helpers";

interface PercentCrop {
  unit: "%";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LocalPixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReactCropProps {
  crop: PercentCrop | undefined;
  onChange: (crop: LocalPixelCrop, percentCrop: PercentCrop) => void;
  aspect?: number;
  className?: string;
  circularCrop?: boolean;
  children: React.ReactNode;
}

const AnyReactCrop = ReactCrop as unknown as React.FC<ReactCropProps>;

export default function Avatar({
  userId,
  userImage,
}: {
  userId: string | undefined;
  userImage: string | null | undefined;
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const [crop, setCrop] = useState<PercentCrop>();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const updateUser = api.user.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Profile image updated`,
        message: t`Your profile image has been updated.`,
        icon: "success",
      });
      try {
        await utils.user.getUser.refetch();
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    onError: () => {
      showPopup({
        header: t`Error updating profile image`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const avatarUrl = userImage ? getAvatarUrl(userImage) : undefined;

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0] ?? null;
    if (!file || !userId) {
      return showPopup({
        header: t`Error uploading profile image`,
        message: t`Please select a file to upload.`,
        icon: "error",
      });
    }
    // Open crop dialog with preview
    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setSelectedPreviewUrl(objUrl);
    setCropDialogOpen(true);
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      // Create a centered square crop at ~90% of the smaller dimension
      // Compute width% so that the square fits within the image
      let widthPercent: number;
      let heightPercent: number;
      if (naturalWidth >= naturalHeight) {
        // landscape: height is limiting
        heightPercent = 90;
        widthPercent = (naturalHeight / naturalWidth) * heightPercent;
      } else {
        // portrait: width is limiting
        widthPercent = 90;
        heightPercent = (naturalWidth / naturalHeight) * widthPercent;
      }
      const x = (100 - widthPercent) / 2;
      const y = (100 - heightPercent) / 2;
      setCrop({ unit: "%", x, y, width: widthPercent, height: heightPercent });
    },
    [],
  );

  const getCroppedBlob = useCallback(async (): Promise<Blob> => {
    if (!imgRef.current || !crop) throw new Error("No crop to save");
    const image = imgRef.current;

    const canvas = document.createElement("canvas");
    const cropXpx = (crop.x / 100) * image.naturalWidth;
    const cropYpx = (crop.y / 100) * image.naturalHeight;
    const cropWpx = (crop.width / 100) * image.naturalWidth;
    const cropHpx = (crop.height / 100) * image.naturalHeight;
    canvas.width = Math.max(1, Math.floor(cropWpx));
    canvas.height = Math.max(1, Math.floor(cropHpx));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // For better quality on HiDPI screens
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.width * pixelRatio;
    canvas.height = canvas.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      cropXpx,
      cropYpx,
      cropWpx,
      cropHpx,
      0,
      0,
      canvas.width / pixelRatio,
      canvas.height / pixelRatio,
    );

    const mime = selectedFile?.type ?? "image/jpeg";
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        mime,
      );
    });
    return blob;
  }, [crop, selectedFile]);

  const resetCropState = useCallback(() => {
    setCrop(undefined);
    setSelectedFile(null);
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedPreviewUrl(null);
  }, [selectedPreviewUrl]);

  const handleCancelCrop = useCallback(() => {
    setCropDialogOpen(false);
    resetCropState();
  }, [resetCropState]);

  const handleSaveCrop = useCallback(async () => {
    try {
      if (!userId || !selectedFile) return;
      setUploading(true);
      const blob = await getCroppedBlob();

      const originalExt = selectedFile.name.split(".").pop() ?? "jpg";
      const fileName = `${userId}/avatar-${generateUID()}.${originalExt}`;

      const response = await fetch(
        env("NEXT_PUBLIC_BASE_URL") + "/api/upload/image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename: fileName, contentType: blob.type }),
        },
      );

      if (!response.ok) throw new Error("Failed to get pre-signed URL");

      const { url } = (await response.json()) as { url: string };

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: blob,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload profile image");

      updateUser.mutate({ image: fileName });
      setCropDialogOpen(false);
      resetCropState();
    } catch (error) {
      console.error(error);
      showPopup({
        header: t`Error uploading profile image`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    } finally {
      setUploading(false);
    }
  }, [
    getCroppedBlob,
    resetCropState,
    selectedFile,
    showPopup,
    updateUser,
    userId,
  ]);

  return (
    <div>
      <div className="relative">
        <input
          className="absolute z-10 h-16 w-16 cursor-pointer rounded-full opacity-0"
          type="file"
          id="single"
          accept="image/*"
          onChange={onFileChange}
          disabled={uploading}
        />
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <span className="inline-block h-16 w-16 overflow-hidden rounded-full bg-light-400 dark:bg-dark-400">
            <svg
              className="h-full w-full text-dark-700"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
        )}
      </div>

      {/* Crop Dialog */}
      {cropDialogOpen && (
        <Modal modalSize="md" positionFromTop="sm" isVisible>
          <div className="p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-light-1000 dark:text-dark-1000">
                {t`Crop your avatar`}
              </h3>
              <p className="mt-1 text-sm text-light-800 dark:text-dark-800">
                {t`Adjust the square crop to fit your avatar.`}
              </p>
            </div>
            <div className="max-h-[80vh]">
              <div className="rounded-md border border-light-600 p-2 dark:border-dark-600">
                <AnyReactCrop
                  crop={crop}
                  onChange={(_crop: LocalPixelCrop, percentCrop: PercentCrop) =>
                    setCrop(percentCrop)
                  }
                  aspect={1}
                  circularCrop
                  className="w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={selectedPreviewUrl ?? undefined}
                    alt="Avatar to crop"
                    onLoad={onImageLoad}
                    className="h-auto max-h-[50vh] w-full object-contain"
                  />
                </AnyReactCrop>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelCrop}
                disabled={uploading}
              >
                {t`Cancel`}
              </Button>
              <Button onClick={handleSaveCrop} isLoading={uploading}>
                {t`Save`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
