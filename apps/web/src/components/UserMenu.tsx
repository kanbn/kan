import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import { useIsMobile } from "~/hooks/useMediaQuery";
import { useModal } from "~/providers/modal";
import { useTheme } from "next-themes";
import { getAvatarUrl } from "~/utils/helpers";

interface UserMenuProps {
  imageUrl: string | undefined;
  email: string;
  isLoading: boolean;
  isCollapsed?: boolean;
  onCloseSideNav?: () => void;
}

export default function UserMenu({
  imageUrl,
  email,
  isLoading,
  isCollapsed = false,
  onCloseSideNav,
}: UserMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { openModal } = useModal();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    if (onCloseSideNav && isMobile) {
      onCloseSideNav();
    }
    await authClient.signOut();
    router.push("/login");
  };

  const handleLinkClick = () => {
    if (onCloseSideNav && isMobile) {
      onCloseSideNav();
    }
  };

  const handleModalOpen = (modalType: string) => {
    if (onCloseSideNav && isMobile) {
      onCloseSideNav();
    }
    openModal(modalType);
  };

  const avatarUrl = imageUrl ? getAvatarUrl(imageUrl) : null;

  return (
    <Menu as="div" className="relative inline-block w-full text-left">
      <div>
        {isLoading ? (
          <div className={twMerge(!isCollapsed && "flex")}>
            <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-light-200 dark:bg-dark-200" />
            <div
              className={twMerge(
                "mx-2 h-[30px] w-[175px] animate-pulse rounded-md bg-light-200 dark:bg-dark-200",
                isCollapsed && "md:hidden",
              )}
            />
          </div>
        ) : (
          <Menu.Button
            className="flex w-full items-center rounded-md p-1.5 text-neutral-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200 dark:hover:text-dark-1000"
            title={isCollapsed ? email : undefined}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                className="rounded-full bg-gray-50"
                width={24}
                height={24}
                alt=""
              />
            ) : (
              <span className="inline-block h-6 w-6 overflow-hidden rounded-full bg-light-400 dark:bg-dark-400">
                <svg
                  className="h-full w-full text-dark-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
            )}
            <span
              className={twMerge(
                "mx-2 truncate text-sm",
                isCollapsed && "md:hidden",
              )}
            >
              {email}
            </span>
          </Menu.Button>
        )}
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={twMerge(
            "absolute bottom-[40px] z-10 mt-2 origin-top-left rounded-md border border-light-600 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-600 dark:bg-dark-300",
            isCollapsed ? "left-0 w-48" : "left-0 w-full",
          )}
        >
          <div className="flex flex-col text-neutral-900 dark:text-dark-1000">
            <div className="p-1">
              <div className="flex w-full items-center px-3 py-2 text-left text-xs">
                <span>{t`Theme`}</span>
              </div>
              <Menu.Item>
                <button
                  onClick={() => setTheme("system")}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  <span
                    className={twMerge(
                      theme === "system" ? "visible" : "invisible",
                      "mr-4 h-[6px] w-[6px] rounded-full bg-light-900 dark:bg-dark-900",
                    )}
                  />
                  {t`System`}
                </button>
              </Menu.Item>
              <Menu.Item>
                <button
                  onClick={() => setTheme("dark")}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  <span
                    className={twMerge(
                      theme === "dark" ? "visible" : "invisible",
                      "mr-4 h-[6px] w-[6px] rounded-full bg-light-900 dark:bg-dark-900",
                    )}
                  />
                  {t`Dark`}
                </button>
              </Menu.Item>
              <Menu.Item>
                <button
                  onClick={() => setTheme("light")}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  <span
                    className={twMerge(
                      theme === "light" ? "visible" : "invisible",
                      "mr-4 h-[6px] w-[6px] rounded-full bg-light-900 dark:bg-dark-900",
                    )}
                  />
                  {t`Light`}
                </button>
              </Menu.Item>
            </div>
            <div className="light-border-600 border-t-[1px] p-1 dark:border-dark-600">
              <Menu.Item>
                <Link
                  href="mailto:support@kan.bn"
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleLinkClick}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  {t`Support`}
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link
                  href="https://docs.kan.bn"
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleLinkClick}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  {t`Documentation`}
                </Link>
              </Menu.Item>
              <Menu.Item>
                <button
                  onClick={() => handleModalOpen("NEW_FEEDBACK")}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  {t`Feedback`}
                </button>
              </Menu.Item>
            </div>
            <div className="light-border-600 border-t-[1px] p-1 dark:border-dark-600">
              <Menu.Item>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  {t`Logout`}
                </button>
              </Menu.Item>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
