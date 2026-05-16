import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import React, { useState } from "react";
import { twMerge } from "tailwind-merge";

import LottieIcon from "~/components/LottieIcon";
import { useIsMobile } from "~/hooks/useMediaQuery";
import {
  KeyboardShortcut,
  useKeyboardShortcut,
} from "~/providers/keyboard-shortcuts";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import LoadingSpinner from "./LoadingSpinner";

interface CollapsibleBoardListProps {
  href: string;
  current: boolean;
  name: string;
  json: object;
  isCollapsed?: boolean;
  onCloseSideNav?: () => void;
  keyboardShortcut: KeyboardShortcut;
}

const CollapsibleBoardList: React.FC<CollapsibleBoardListProps> = ({
  href,
  current,
  name,
  json,
  isCollapsed = false,
  keyboardShortcut,
  onCloseSideNav,
}) => {
  const { workspace } = useWorkspace();
  const [isHovered, setIsHovered] = useState(false);
  const [index, setIndex] = useState(0);
  const isMobile = useIsMobile();
  const { keys: shortcutKeys } = useKeyboardShortcut(keyboardShortcut);
  const pathname = usePathname();
  const boardId = pathname?.split("/")[2];

  const { data, isLoading } = api.board.all.useQuery(
    {
      workspacePublicId: workspace.publicId,
      type: "regular",
      archived: false,
    },
    { enabled: workspace.publicId ? true : false },
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIndex((index) => index + 1);
  };

  const handleClick = () => {
    if (onCloseSideNav && isMobile) {
      onCloseSideNav();
    }
  };

  return (
    <Disclosure>
      <Link
        href={href}
        onMouseEnter={handleMouseEnter}
        title={isCollapsed ? name : undefined}
      >
        <DisclosureButton
          className={twMerge(
            "group flex h-[34px] w-full items-center rounded-md p-1.5 text-sm font-normal leading-6 hover:bg-light-200 hover:text-light-1000 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
            isCollapsed ? "md:justify-center" : "justify-between",
            current
              ? "bg-light-200 text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
              : "text-neutral-600 dark:bg-dark-100 dark:text-dark-900",
          )}
        >
          <div
            className={twMerge(
              "flex items-center",
              isCollapsed
                ? "justify-start gap-x-3 md:justify-center md:gap-x-0"
                : "gap-x-3",
            )}
          >
            <LottieIcon index={index} json={json} isPlaying={isHovered} />
            <span className={twMerge(isCollapsed && "md:hidden")}>{name}</span>
          </div>
          {!isCollapsed && (
            <div className="hidden md:group-hover:inline-flex">
              {shortcutKeys}
            </div>
          )}
        </DisclosureButton>
      </Link>

      {!isCollapsed && (
        <DisclosurePanel className="py-2 text-gray-500">
          {isLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <ul
              onClick={handleClick}
              className={twMerge(
                "relative ml-4 max-h-[calc(100vh-480px)] overflow-y-auto",
                "scrollbar-thin scrollbar-track-light-100 scrollbar-thumb-light-400",
                "dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600",
                "hover:scrollbar-thumb-light-500 dark:hover:scrollbar-thumb-dark-500",
              )}
            >
              <div className="absolute left-0 top-0 h-full w-px bg-light-300 dark:bg-dark-200"></div>
              {data?.map((board) => (
                <CollapsibleBoardListItem
                  currentBoard={current && boardId === board.publicId}
                  key={board.publicId}
                  name={board.name}
                  href={`/boards/${board.publicId}`}
                />
              ))}
            </ul>
          )}
        </DisclosurePanel>
      )}
    </Disclosure>
  );
};
export default CollapsibleBoardList;

const CollapsibleBoardListItem: React.FC<{
  name: string;
  key: string;
  currentBoard: boolean;
  href: string;
}> = ({ name, key, currentBoard, href }) => (
  <Link href={href}>
    <li
      key={key}
      className={twMerge(
        "w-full truncate text-left",
        "cursor-pointer rounded-r-md p-1.5 text-sm text-light-950 transition-all duration-75 hover:text-light-1000 dark:text-dark-900 hover:dark:text-dark-1000",
        currentBoard
          ? "border-l-2 bg-light-200 pl-3 text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
          : "border-l-2 border-transparent",
      )}
    >
      {name}
    </li>
  </Link>
);
