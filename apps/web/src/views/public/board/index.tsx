import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { keepPreviousData } from "@tanstack/react-query";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { HiLink, HiOutlineLockClosed } from "react-icons/hi2";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import Popup from "~/components/Popup";
import ThemeToggle from "~/components/ThemeToggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { formatToArray } from "~/utils/helpers";
import Card from "~/views/board/components/Card";
import Filters from "~/views/board/components/Filters";
import { CardModal } from "./CardModal";

const IS_CLOUD = env("NEXT_PUBLIC_KAN_ENV") === "cloud";
const HIDE_POWERED_BY =
  env("NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY") === "true";

export default function PublicBoardView() {
  const router = useRouter();
  const { showPopup } = usePopup();
  const [isRouteLoaded, setIsRouteLoaded] = useState(false);
  const { openModal } = useModal();

  const boardSlug = Array.isArray(router.query.boardSlug)
    ? router.query.boardSlug[0]
    : router.query.boardSlug;

  const workspaceSlug = Array.isArray(router.query.workspaceSlug)
    ? router.query.workspaceSlug[0]
    : router.query.workspaceSlug;

  const { data, isLoading } = api.board.bySlug.useQuery(
    {
      boardSlug: boardSlug ?? "",
      workspaceSlug: workspaceSlug ?? "",
      members: formatToArray(router.query.members),
      labels: formatToArray(router.query.labels),
    },
    {
      enabled: router.isReady && !!boardSlug,
      placeholderData: keepPreviousData,
    },
  );

  const CopyBoardLink = () => {
    return (
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
          } catch (error) {
            console.error(error);
          }

          showPopup({
            header: t`Link copied`,
            icon: "success",
            message: t`Board URL copied to clipboard`,
          });
        }}
        className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
        aria-label={`Copy board URL`}
      >
        <HiLink className={`h-4 w-4 text-light-900 dark:text-dark-900`} />
      </button>
    );
  };

  const splitPath = router.asPath.split("/");
  const cardPublicId = splitPath.length > 3 ? splitPath[3] : null;

  useEffect(() => {
    if (!isRouteLoaded && router.isReady) {
      setIsRouteLoaded(true);

      if (cardPublicId) {
        openModal("CARD");
      }
    }
  }, [
    router.isReady,
    isRouteLoaded,
    setIsRouteLoaded,
    cardPublicId,
    openModal,
  ]);

  return (
    <>
      <PageHead
        title={`${data?.name ?? t`Board`} | ${data?.workspace.name ?? t`Workspace`}`}
      />
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
        }
      `}</style>

      <div className="relative flex h-screen flex-col bg-light-100 px-4 pt-4 dark:bg-dark-50">
        <div className="relative h-full overflow-hidden rounded-md border pb-8 dark:border-dark-200">
          <PatternedBackground />
          <div className="z-10 flex w-full justify-between p-8">
            {isLoading || !router.isReady ? (
              <div className="flex space-x-2">
                <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-200 dark:bg-dark-100" />
              </div>
            ) : (
              <h1 className="font-bold leading-[2.3rem] tracking-tight text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000 sm:text-[1.2rem]">
                {data?.name}
              </h1>
            )}
            {data && (
              <div className="z-10 flex items-center space-x-2">
                <div className="inline-flex cursor-default items-center justify-center whitespace-nowrap rounded-md border-[1px] border-light-300 bg-light-50 px-3 py-2 text-sm font-semibold text-light-950 shadow-sm dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950">
                  <span className="mr-2">
                    <HiOutlineLockClosed />
                  </span>
                  {t`View only`}
                </div>
                <Filters
                  labels={data.labels ?? []}
                  members={[]}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>

          <div className="scrollbar-w-none scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-h-[8px] relative h-full flex-1 overflow-y-hidden overflow-x-scroll overscroll-contain scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300">
            {isLoading || !router.isReady ? (
              <div className="ml-[2rem] flex">
                <div className="0 mr-5 h-[500px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                <div className="0 mr-5 h-[275px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                <div className="0 mr-5 h-[375px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              </div>
            ) : !data && !isLoading && router.isReady && !!boardSlug ? (
              <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
                <div className="flex flex-col items-center">
                  <HiOutlineLockClosed className="h-10 w-10 text-light-800 dark:text-dark-800" />
                  <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
                    {t`Board not found`}
                  </p>
                  <p className="text-[14px] text-light-900 dark:text-dark-900">
                    {t`This board is private or does not exist`}
                  </p>
                </div>
                <Button href={`/${workspaceSlug}`}>{t`View workspace`}</Button>
              </div>
            ) : (
              <div className="flex">
                <div className="min-w-[2rem]" />
                {data?.lists.map((list) => (
                  <div
                    key={list.publicId}
                    className="dark-text-dark-1000 mr-5 h-fit min-w-[18rem] max-w-[18rem] rounded-md border border-light-400 bg-light-300 py-2 pl-2 pr-1 text-neutral-900 dark:border-dark-300 dark:bg-dark-100"
                  >
                    <div className="flex justify-between">
                      <span className="mb-4 block px-4 pt-1 text-sm font-medium text-neutral-900 dark:text-dark-1000">
                        {list.name}
                      </span>
                    </div>
                    <div className="scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 h-full max-h-[calc(100vh-265px)] min-h-[2rem] overflow-y-auto pr-1 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600">
                      {list.cards.map((card) => (
                        <Link
                          key={card.publicId}
                          href={`/${data.workspace.slug}/${data.slug}/${card.publicId}`}
                          className={`mb-2 flex !cursor-pointer flex-col`}
                          shallow={true}
                          onClick={() => {
                            openModal("CARD");
                          }}
                        >
                          <Card
                            title={card.title}
                            labels={card.labels}
                            checklists={card.checklists ?? []}
                            members={[]}
                            description={card.description}
                            comments={card.comments ?? []}
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="min-w-[0.75rem]" />
              </div>
            )}
          </div>
        </div>
        <div className="flex h-[54px] items-center justify-center">
          <div className="absolute left-[1rem]">
            <ThemeToggle />
            <CopyBoardLink />
          </div>

          {IS_CLOUD && (
            <Link
              className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000"
              href="/"
            >
              kan.bn
            </Link>
          )}

          {!IS_CLOUD && !HIDE_POWERED_BY && (
            <a
              href="https://kan.bn"
              target="_blank"
              rel="noreferrer noopener"
              className="absolute right-[1rem] inline-flex items-center gap-[0.175rem] rounded-full border border-light-300 bg-light-50 px-3 py-1 text-[11px] font-medium text-light-950 shadow-sm transition-colors hover:bg-light-100 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 dark:hover:bg-dark-100"
            >
              <span>{`Powered by`}</span>
              <span className="font-semibold">kan.bn</span>
            </a>
          )}
        </div>
      </div>
      <Popup />
      <Modal modalSize={"md"} positionFromTop={"sm"}>
        <CardModal
          cardPublicId={cardPublicId}
          workspaceSlug={data?.workspace.slug}
          boardSlug={data?.slug}
        />
      </Modal>
    </>
  );
}
