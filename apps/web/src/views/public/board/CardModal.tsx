import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { HiLink, HiXMark } from "react-icons/hi2";

import Badge from "~/components/Badge";
import Editor from "~/components/Editor";
import LabelIcon from "~/components/LabelIcon";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import ActivityList from "~/views/card/components/ActivityList";
import { AttachmentThumbnails } from "~/views/card/components/AttachmentThumbnails";
import Checklists from "~/views/card/components/Checklists";

export function CardModal({
  cardPublicId,
  workspaceSlug,
  boardSlug,
}: {
  cardPublicId: string | null | undefined;
  workspaceSlug: string | null | undefined;
  boardSlug: string | null | undefined;
}) {
  const router = useRouter();
  const { closeModal, isOpen } = useModal();
  const { showPopup } = usePopup();
  const [showFade, setShowFade] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopyCardLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showPopup({
        header: t`Link copied`,
        icon: "success",
        message: t`Card URL copied to clipboard`,
      });
    } catch (error) {
      console.error(error);
      showPopup({
        header: t`Unable to copy link`,
        icon: "error",
        message: t`Please try again.`,
      });
    }
  };

  const { data, isLoading } = api.card.byId.useQuery(
    {
      cardPublicId: cardPublicId ?? "",
    },
    {
      enabled: isOpen && !!cardPublicId && cardPublicId.length >= 12,
    },
  );

  const labels = data?.labels ?? [];

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    const isAtTop = scrollTop <= 5;

    setShowFade(!isAtBottom);
    setShowTopFade(!isAtTop);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [data]);

  return (
    <div className="flex h-full flex-1 flex-row">
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="h-full p-8">
          <div className="mb-6">
            <div className="flex w-full items-center justify-between">
              <div className="absolute right-[2rem] top-[2rem] flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyCardLink}
                  className="rounded p-1.5 transition-all hover:bg-light-200 focus:outline-none dark:hover:bg-dark-100"
                  aria-label="Copy card link"
                >
                  <HiLink className="h-4 w-4 text-light-900 dark:text-dark-900" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 transition-all hover:bg-light-200 focus:outline-none dark:hover:bg-dark-100"
                  onClick={(e) => {
                    e.preventDefault();
                    closeModal();

                    setTimeout(() => {
                      void router.replace(
                        {
                          pathname: router.pathname,
                          query: {
                            ...router.query,
                            workspaceSlug: workspaceSlug ?? "",
                            boardSlug: [boardSlug ?? ""],
                          },
                        },
                        undefined,
                        { shallow: true },
                      );
                    }, 400);
                  }}
                >
                  <HiXMark
                    size={18}
                    className="text-light-900 dark:text-dark-900"
                  />
                </button>
              </div>
              {isLoading ? (
                <div className="flex space-x-2">
                  <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                </div>
              ) : (
                <>
                  <h1 className="pr-8 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                    {data?.title}
                  </h1>
                </>
              )}
            </div>
            {labels.length > 0 && (
              <div className="mt-2">
                {labels.map((label) => (
                  <Badge
                    key={label.publicId}
                    value={label.name}
                    iconLeft={<LabelIcon colourCode={label.colourCode} />}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div
              ref={scrollRef}
              className="h-full max-h-[425px] overflow-y-auto"
            >
              {data?.description && (
                <div className="mb-10 flex w-full max-w-2xl justify-between">
                  <div className="mt-2">
                    <Editor
                      content={data.description}
                      readOnly
                      workspaceMembers={
                        data?.list.board.workspace.members ?? []
                      }
                    />
                  </div>
                </div>
              )}
              {data?.attachments &&
                data.attachments.length > 0 &&
                cardPublicId && (
                  <div className="mb-10 max-w-2xl">
                    <AttachmentThumbnails
                      attachments={data.attachments}
                      cardPublicId={cardPublicId}
                      isReadOnly
                    />
                  </div>
                )}
              {data?.checklists && data.checklists.length > 0 && (
                <Checklists
                  checklists={data.checklists}
                  cardPublicId={cardPublicId ?? ""}
                  viewOnly
                />
              )}
              <div className="border-t-[1px] border-light-600 pb-4 pt-12 dark:border-dark-400">
                <h2 className="text-md pb-4 font-medium text-light-900 dark:text-dark-1000">
                  {t`Activity`}
                </h2>
                <div>
                  {cardPublicId && (
                    <ActivityList
                      cardPublicId={cardPublicId}
                      isLoading={isLoading}
                      isViewOnly={true}
                    />
                  )}
                </div>
              </div>
            </div>
            {showTopFade && (
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-6 bg-gradient-to-b from-white/80 to-transparent dark:from-dark-100/80" />
            )}
            {showFade && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent dark:from-dark-100/80" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
