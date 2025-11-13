import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { HiChevronLeft, HiChevronRight, HiXMark } from "react-icons/hi2";

interface Attachment {
  publicId: string;
  contentType: string;
  url: string | null;
  originalFilename: string | null;
  s3Key: string;
}

export function AttachmentThumbnails({
  attachments,
}: {
  attachments?: Attachment[];
}) {
  const imageAttachments =
    attachments?.filter(
      (attachment) =>
        attachment.contentType.startsWith("image/") && attachment.url,
    ) ?? [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
        <Dialog as="div" className="relative z-50" onClose={() => {}} static>
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
              onClick={closeViewer}
            />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="fixed right-4 top-4 z-20 flex gap-2">
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
