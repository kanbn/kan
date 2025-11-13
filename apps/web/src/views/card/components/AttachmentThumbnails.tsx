import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment, useEffect, useState } from "react";
import {
  HiArrowDownTray,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineTrash,
  HiXMark,
} from "react-icons/hi2";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface Attachment {
  publicId: string;
  contentType: string;
  url: string | null;
  originalFilename: string | null;
  s3Key: string;
}

export function AttachmentThumbnails({
  attachments,
  cardPublicId,
}: {
  attachments?: Attachment[];
  cardPublicId: string;
}) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const imageAttachments =
    attachments?.filter(
      (attachment) =>
        attachment.contentType.startsWith("image/") && attachment.url,
    ) ?? [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const deleteAttachment = api.attachment.delete.useMutation({
    onMutate: async (args) => {
      await utils.card.byId.cancel({ cardPublicId });
      const currentState = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;
        const updatedAttachments = oldCard.attachments.filter(
          (attachment) => attachment.publicId !== args.attachmentPublicId,
        );
        return { ...oldCard, attachments: updatedAttachments };
      });

      return { previousState: currentState };
    },
    onError: (_error, _args, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousState);
      showPopup({
        header: t`Unable to delete attachment`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: () => {
      // Close viewer if the deleted image was being viewed
      setSelectedIndex(null);
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => {
          if (prev === null) return null;
          return prev === 0 ? imageAttachments.length - 1 : prev - 1;
        });
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => {
          if (prev === null) return null;
          return prev === imageAttachments.length - 1 ? 0 : prev + 1;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, imageAttachments.length]);

  if (imageAttachments.length === 0) {
    return null;
  }

  const openViewer = (index: number) => {
    setSelectedIndex(index);
  };

  const closeViewer = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    const newIndex =
      selectedIndex === 0 ? imageAttachments.length - 1 : selectedIndex - 1;
    setSelectedIndex(newIndex);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    const newIndex =
      selectedIndex === imageAttachments.length - 1 ? 0 : selectedIndex + 1;
    setSelectedIndex(newIndex);
  };

  const handleDownload = (attachment: Attachment) => {
    if (!attachment.url) {
      showPopup({
        header: t`Download failed`,
        message: t`No download URL available for this attachment.`,
        icon: "error",
      });
      return;
    }

    // Open the URL directly - the browser will handle the download
    // if the S3 object has Content-Disposition: attachment header
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  const selectedAttachment =
    selectedIndex !== null ? imageAttachments[selectedIndex] : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {imageAttachments.map((attachment, index) => {
          if (!attachment.url) return null;
          return (
            <AttachmentThumbnail
              key={attachment.publicId}
              attachment={{
                publicId: attachment.publicId,
                url: attachment.url,
                originalFilename: attachment.originalFilename ?? "",
              }}
              onClick={() => openViewer(index)}
            />
          );
        })}
      </div>

      <Transition.Root show={selectedIndex !== null} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            // Dialog closing is handled by the background overlay click
          }}
          static
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-light-50 transition-opacity dark:bg-dark-50"
              onClick={(e) => {
                // Only close if clicking directly on the background, not on buttons
                if (e.target === e.currentTarget) {
                  closeViewer();
                }
              }}
            />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div
              className="fixed left-2 top-2 z-20 flex gap-1"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedIndex !== null && selectedAttachment && (
                <>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteAttachment.mutate({
                        attachmentPublicId: selectedAttachment.publicId,
                      });
                    }}
                    className="rounded-full bg-light-50 p-1.5 text-light-1000 transition-colors hover:bg-light-100 focus:outline-none dark:bg-dark-50 dark:text-dark-1000 dark:hover:bg-dark-100"
                    aria-label="Delete image"
                    disabled={deleteAttachment.isPending}
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(selectedAttachment);
                    }}
                    className="rounded-full bg-light-50 p-1.5 text-light-1000 transition-colors hover:bg-light-100 focus:outline-none dark:bg-dark-50 dark:text-dark-1000 dark:hover:bg-dark-100"
                    aria-label="Download image"
                  >
                    <HiArrowDownTray className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="fixed right-2 top-2 z-20 flex gap-1">
              {imageAttachments.length > 1 && selectedIndex !== null && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="rounded-full bg-light-50 p-1.5 text-light-1000 transition-colors hover:bg-light-100 focus:outline-none dark:bg-dark-50 dark:text-dark-1000 dark:hover:bg-dark-100"
                  aria-label="Previous image"
                >
                  <HiChevronLeft className="h-4 w-4" />
                </button>
              )}

              {imageAttachments.length > 1 && selectedIndex !== null && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="rounded-full bg-light-50 p-1.5 text-light-1000 transition-colors hover:bg-light-100 focus:outline-none dark:bg-dark-50 dark:text-dark-1000 dark:hover:bg-dark-100"
                  aria-label="Next image"
                >
                  <HiChevronRight className="h-4 w-4" />
                </button>
              )}

              {selectedIndex !== null && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeViewer();
                  }}
                  className="rounded-full bg-light-50 p-1.5 text-light-1000 transition-colors hover:bg-light-100 focus:outline-none dark:bg-dark-50 dark:text-dark-1000 dark:hover:bg-dark-100"
                  aria-label="Close"
                >
                  <HiXMark className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className="relative w-full max-w-7xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedAttachment?.url && (
                    <div className="relative">
                      <div className="relative mx-auto max-h-[90vh] w-full">
                        <Image
                          src={selectedAttachment.url}
                          alt={
                            selectedAttachment.originalFilename ?? "Attachment"
                          }
                          width={1920}
                          height={1080}
                          className="mx-auto max-h-[90vh] w-auto object-contain"
                          unoptimized
                        />
                      </div>

                      {imageAttachments.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1.5 text-[10px] text-white">
                          {selectedIndex !== null && selectedIndex + 1} /{" "}
                          {imageAttachments.length}
                        </div>
                      )}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

function AttachmentThumbnail({
  attachment,
  onClick,
}: {
  attachment: { publicId: string; url: string; originalFilename: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative h-16 w-16 overflow-hidden rounded-xl border border-light-300 transition-transform hover:scale-105 dark:border-dark-300"
      aria-label={`View ${attachment.originalFilename}`}
    >
      <Image
        src={attachment.url}
        alt={attachment.originalFilename}
        fill
        className="object-cover"
        sizes="64px"
      />
    </button>
  );
}
